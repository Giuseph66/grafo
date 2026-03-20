import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { compareTraversals } from '../analytics/comparison'
import { runTraversal } from '../graph/algorithms'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { mockPapers } from '../mocks/scholarData'
import { formatMs, formatPayload } from '../utils/formatting'
import type { AcademicGraph, GraphLink, GraphNode, PaperNode, TraversalResult } from '../types/domain'

type FocusMode = 'sync' | 'bfs' | 'dfs'

interface SearchState {
  currentId: string | null
  inspectedIds: string[]
  matchIds: string[]
  step: number
  total: number
  running: boolean
}

const MIN_CITY_COUNT = 10

function computeRadialPositions(
  rootId: string,
  nodes: PaperNode[],
  links: GraphLink[],
): Record<string, { x: number; y: number }> {
  // 1. Calculate BFS shortest paths from root
  const distances = new Map<string, number>()
  const queue: { id: string; dist: number }[] = [{ id: rootId, dist: 0 }]
  distances.set(rootId, 0)

  let head = 0
  while (head < queue.length) {
    const { id, dist } = queue[head++]
    const neighbors = links
      .filter((l) => l.source === id || l.target === id)
      .map((l) => (l.source === id ? l.target : l.source))

    for (const neighbor of neighbors) {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, dist + 1)
        queue.push({ id: neighbor, dist: dist + 1 })
      }
    }
  }

  // Assign disconnected nodes to a far distance
  const maxKnownDist = Math.max(0, ...Array.from(distances.values()))
  for (const node of nodes) {
    if (!distances.has(node.id)) {
      distances.set(node.id, maxKnownDist + 1)
    }
  }

  // 2. Group nodes by distance (concentric circles)
  const byDistance = new Map<number, string[]>()
  for (const [id, dist] of distances.entries()) {
    if (!byDistance.has(dist)) byDistance.set(dist, [])
    byDistance.get(dist)!.push(id)
  }

  const positions: Record<string, { x: number; y: number }> = {}

  // Center is always at 50, 50
  positions[rootId] = { x: 50, y: 50 }

  const maxRng = 45 // max radius %
  const distLevels = Math.max(1, byDistance.size - 1)
  const ringStep = maxRng / distLevels

  for (const [dist, layerNodes] of byDistance.entries()) {
    if (dist === 0) continue // root already handled

    // Sort nodes to keep layout somewhat deterministic (e.g. by total connections)
    layerNodes.sort((a, b) => {
      const aConns = links.filter(l => l.source === a || l.target === a).length
      const bConns = links.filter(l => l.source === b || l.target === b).length
      return bConns - aConns
    })

    const ringRadius = dist * ringStep
    const angleStep = (2 * Math.PI) / layerNodes.length

    // Offset angle to make it look organic
    const offset = dist * 0.5

    layerNodes.forEach((nodeId, i) => {
      const angle = i * angleStep + offset

      // Calculate x, y ensuring we don't bleed out of 0-100% too badly
      let x = 50 + ringRadius * Math.cos(angle)
      let y = 50 + ringRadius * Math.sin(angle)

      x = Math.max(5, Math.min(95, x))
      y = Math.max(5, Math.min(95, y))

      positions[nodeId] = { x, y }
    })
  }

  return positions
}



const ALL_CITY_NODES: PaperNode[] = mockPapers.map((city) => ({
  id: city.paperId,
  type: 'paper',
  paperId: city.paperId,
  label: city.title,
  title: city.title,
  year: city.year,
  venue: city.venue,
  citationCount: city.citationCount,
  referenceCount: city.referenceCount,
  abstract: city.abstract,
  url: city.url,
  importance: Math.max(26, Math.min(48, Math.round(Math.sqrt(city.citationCount)))),
}))

const ALL_CITY_LINKS: GraphLink[] = Array.from(
  mockPapers.reduce((accumulator, city) => {
    for (const neighborId of [...city.references, ...city.citations]) {
      const key = [city.paperId, neighborId].sort().join('__')
      if (!accumulator.has(key)) {
        accumulator.set(key, {
          id: key,
          source: city.paperId,
          target: neighborId,
          type: 'REFERENCES',
          label: 'Rota',
        })
      }
    }
    return accumulator
  }, new Map<string, GraphLink>()),
).map(([, link]) => link)

const INITIAL_SEARCH_STATE: SearchState = {
  currentId: null,
  inspectedIds: [],
  matchIds: [],
  step: 0,
  total: 0,
  running: false,
}

const buildGraph = (
  rootNodeId: string,
  nodes: PaperNode[],
  links: GraphLink[],
): AcademicGraph => {
  const visibleIds = new Set(nodes.map((node) => node.id))
  const payloadBytes = JSON.stringify(mockPapers.filter((city) => visibleIds.has(city.paperId))).length

  return {
    nodes,
    links,
    rootNodeId,
    metadata: {
      requests: 1,
      payloadBytes,
      truncated: false,
      buildDepth: 3,
      maxNodes: nodes.length,
      source: 'mock',
    },
  }
}

function createMetricRows(result: TraversalResult) {
  return [
    ['Tempo', formatMs(result.metrics.searchTimeMs)],
    ['Render', formatMs(result.metrics.renderTimeMs)],
    ['Cidades visitadas', String(result.metrics.nodesVisited)],
    ['Rotas percorridas', String(result.metrics.edgesTraversed)],
    ['Profundidade', String(result.metrics.depthReached)],
    ['Payload', formatPayload(result.metrics.payloadBytes)],
    ['Complexidade', result.metrics.complexity],
    ['Ultima cidade', result.metrics.lastVisitedNodeId ? cityLabel(result.metrics.lastVisitedNodeId) : '-'],
  ]
}

function cityLabel(nodeId: string) {
  return ALL_CITY_NODES.find((node) => node.id === nodeId)?.title ?? nodeId
}

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getAutocompleteSuffix(currentValue: string, suggestion: string) {
  return suggestion.toLowerCase().startsWith(currentValue.toLowerCase())
    ? suggestion.slice(currentValue.length)
    : ''
}

function createCurvePath(source: { x: number; y: number }, target: { x: number; y: number }) {
  return `M ${source.x} ${source.y} L ${target.x} ${target.y}`
}

function getSequenceClasses(index: number, progress: number) {
  if (index + 1 === progress) return 'is-active'
  if (index + 1 > progress) return 'is-future'
  return 'is-complete'
}

export function ExplorerPage() {
  const [query, setQuery] = useState('')
  const [rootCityId, setRootCityId] = useState('paper_cuiaba')
  const [cityLimit, setCityLimit] = useState(ALL_CITY_NODES.length)
  const [enableVisualSearch, setEnableVisualSearch] = useState(false)
  const [enableBfs, setEnableBfs] = useState(true)
  const [enableDfs, setEnableDfs] = useState(true)
  const [focusMode, setFocusMode] = useState<FocusMode>('sync')
  const [bfsResult, setBfsResult] = useState<TraversalResult | null>(null)
  const [dfsResult, setDfsResult] = useState<TraversalResult | null>(null)
  const [progress, setProgress] = useState({ bfs: 0, dfs: 0 })
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGraphMaximized, setIsGraphMaximized] = useState(false)
  const [searchState, setSearchState] = useState<SearchState>(INITIAL_SEARCH_STATE)
  const debouncedQuery = useDebouncedValue(query, 160)
  const playbackTimerRef = useRef<number | null>(null)
  const cityCountOptions = useMemo(
    () => Array.from({ length: ALL_CITY_NODES.length - MIN_CITY_COUNT + 1 }, (_, index) => MIN_CITY_COUNT + index),
    [],
  )
  const visibleCityNodes = useMemo(() => ALL_CITY_NODES.slice(0, cityLimit), [cityLimit])
  const visibleCityIds = useMemo(() => new Set(visibleCityNodes.map((node) => node.id)), [visibleCityNodes])
  const visibleCityLinks = useMemo(
    () => ALL_CITY_LINKS.filter((link) => visibleCityIds.has(link.source) && visibleCityIds.has(link.target)),
    [visibleCityIds],
  )
  const searchableTerms = useMemo(() => {
    const seen = new Set<string>()
    const terms: string[] = []

    for (const node of visibleCityNodes) {
      for (const candidate of [node.title, node.venue]) {
        const key = normalizeSearchValue(candidate)
        if (!key || seen.has(key)) {
          continue
        }

        seen.add(key)
        terms.push(candidate)
      }
    }

    return terms
  }, [visibleCityNodes])
  const effectiveRootCityId = visibleCityIds.has(rootCityId) ? rootCityId : (visibleCityNodes[0]?.id ?? rootCityId)

  const graph = useMemo(
    () => buildGraph(effectiveRootCityId, visibleCityNodes, visibleCityLinks),
    [effectiveRootCityId, visibleCityNodes, visibleCityLinks],
  )
  const dynamicPositions = useMemo(
    () => computeRadialPositions(effectiveRootCityId, visibleCityNodes, visibleCityLinks),
    [effectiveRootCityId, visibleCityNodes, visibleCityLinks],
  )
  const selectedCity = useMemo(
    () => visibleCityNodes.find((node) => node.id === effectiveRootCityId) ?? visibleCityNodes[0] ?? ALL_CITY_NODES[0],
    [effectiveRootCityId, visibleCityNodes],
  )
  const normalizedTraversalQuery = useMemo(() => normalizeSearchValue(query), [query])
  const autocompleteSuggestion = useMemo(() => {
    if (!normalizedTraversalQuery) {
      return ''
    }

    return searchableTerms.find((term) => {
      const normalizedTerm = normalizeSearchValue(term)
      return normalizedTerm.startsWith(normalizedTraversalQuery) && normalizedTerm !== normalizedTraversalQuery
    }) ?? ''
  }, [normalizedTraversalQuery, searchableTerms])
  const autocompleteSuffix = useMemo(
    () => getAutocompleteSuffix(query, autocompleteSuggestion),
    [query, autocompleteSuggestion],
  )
  const traversalStopCondition = useMemo(
    () => (
      normalizedTraversalQuery
        ? (node: GraphNode) =>
            normalizeSearchValue(node.label).includes(normalizedTraversalQuery)
            || ('venue' in node && normalizeSearchValue(node.venue).includes(normalizedTraversalQuery))
        : undefined
    ),
    [normalizedTraversalQuery],
  )
  const comparison = useMemo(
    () => (bfsResult && dfsResult ? compareTraversals(bfsResult, dfsResult) : null),
    [bfsResult, dfsResult],
  )

  useEffect(() => {
    if (rootCityId !== effectiveRootCityId) {
      setRootCityId(effectiveRootCityId)
    }
  }, [rootCityId, effectiveRootCityId])

  useEffect(() => {
    setBfsResult(enableBfs ? runTraversal(graph, 'bfs', { stopWhen: traversalStopCondition }) : null)
    setDfsResult(enableDfs ? runTraversal(graph, 'dfs', { stopWhen: traversalStopCondition }) : null)
    setProgress({ bfs: 0, dfs: 0 })
    setIsPlaying(false)
  }, [graph, enableBfs, enableDfs, traversalStopCondition])

  useEffect(() => {
    if (playbackTimerRef.current) {
      window.clearInterval(playbackTimerRef.current)
      playbackTimerRef.current = null
    }

    if (!isPlaying) {
      return undefined
    }

    playbackTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        const next = { ...current }
        const canAdvanceBfs = bfsResult ? next.bfs < bfsResult.visitedNodeIds.length : false
        const canAdvanceDfs = dfsResult ? next.dfs < dfsResult.visitedNodeIds.length : false

        if (focusMode === 'sync' || focusMode === 'bfs') {
          if (canAdvanceBfs) next.bfs += 1
        }

        if (focusMode === 'sync' || focusMode === 'dfs') {
          if (canAdvanceDfs) next.dfs += 1
        }

        if (
          (!canAdvanceBfs || focusMode === 'dfs' || !bfsResult) &&
          (!canAdvanceDfs || focusMode === 'bfs' || !dfsResult)
        ) {
          setIsPlaying(false)
        }

        return next
      })
    }, 820)

    return () => {
      if (playbackTimerRef.current) {
        window.clearInterval(playbackTimerRef.current)
        playbackTimerRef.current = null
      }
    }
  }, [isPlaying, focusMode, bfsResult, dfsResult])

  useEffect(() => {
    if (!enableVisualSearch || !debouncedQuery.trim()) {
      setSearchState({ ...INITIAL_SEARCH_STATE, total: visibleCityNodes.length })
      return
    }

    const orderedNodes = [...visibleCityNodes].sort((left, right) => left.title.localeCompare(right.title))
    let index = -1
    const normalizedQuery = normalizeSearchValue(debouncedQuery)

    setSearchState({
      currentId: null,
      inspectedIds: [],
      matchIds: [],
      step: 0,
      total: orderedNodes.length,
      running: true,
    })

    const timer = window.setInterval(() => {
      index += 1

      if (index >= orderedNodes.length) {
        setSearchState((current) => ({ ...current, currentId: null, running: false }))
        window.clearInterval(timer)
        return
      }

      const city = orderedNodes[index]
      const normalizedTitle = normalizeSearchValue(city.title)
      const normalizedVenue = normalizeSearchValue(city.venue)
      const isMatch =
        normalizedTitle.includes(normalizedQuery) || normalizedVenue.includes(normalizedQuery)

      setSearchState((current) => ({
        currentId: city.id,
        inspectedIds: [...current.inspectedIds, city.id],
        matchIds: isMatch ? [...current.matchIds, city.id] : current.matchIds,
        step: index + 1,
        total: orderedNodes.length,
        running: index + 1 < orderedNodes.length,
      }))
    }, 180)

    return () => window.clearInterval(timer)
  }, [debouncedQuery, enableVisualSearch, visibleCityNodes])

  useEffect(() => {
    document.body.classList.toggle('explorer-graph-fullscreen', isGraphMaximized)

    return () => {
      document.body.classList.remove('explorer-graph-fullscreen')
    }
  }, [isGraphMaximized])

  useEffect(() => {
    if (!isGraphMaximized) {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsGraphMaximized(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isGraphMaximized])

  const bfsVisited = new Set(bfsResult?.visitedNodeIds.slice(0, progress.bfs) ?? [])
  const dfsVisited = new Set(dfsResult?.visitedNodeIds.slice(0, progress.dfs) ?? [])
  const inspected = new Set(searchState.inspectedIds)
  const matched = new Set(searchState.matchIds)
  const bfsCurrent = bfsResult?.visitedNodeIds[progress.bfs - 1] ?? null
  const dfsCurrent = dfsResult?.visitedNodeIds[progress.dfs - 1] ?? null
  const hasActiveQuery = enableVisualSearch && debouncedQuery.trim().length > 0
  const searchHeadline = !enableVisualSearch
    ? 'Busca visual desativada'
    : hasActiveQuery
      ? searchState.currentId
        ? cityLabel(searchState.currentId)
        : searchState.matchIds.length > 0
          ? `${searchState.matchIds.length} resultado${searchState.matchIds.length > 1 ? 's' : ''}`
          : 'Nenhum resultado'
      : 'Aguardando termo'
  const searchProgressLabel = !enableVisualSearch
    ? 'Ative o toggle para inspecionar o grafo em tempo real.'
    : hasActiveQuery
      ? `Passo ${searchState.step} de ${searchState.total}${searchState.running ? ' · procurando…' : ' · concluido'}`
      : 'Digite para iniciar a inspeção visual do grafo.'
  const searchStepDetail = searchState.currentId
    ? `Verificando ${cityLabel(searchState.currentId)}`
    : !enableVisualSearch
      ? 'Inspeção e destaque do grafo pausados'
      : hasActiveQuery
        ? searchState.matchIds.length > 0
          ? `${searchState.matchIds.length} cidade${searchState.matchIds.length > 1 ? 's' : ''} destacada${searchState.matchIds.length > 1 ? 's' : ''} no grafo`
          : 'Nenhuma cidade corresponde ao termo pesquisado'
        : 'Nenhuma cidade em inspeção agora'

  const stepBackward = () => {
    setIsPlaying(false)
    setProgress((current) => ({
      bfs: Math.max(0, current.bfs - (focusMode !== 'dfs' ? 1 : 0)),
      dfs: Math.max(0, current.dfs - (focusMode !== 'bfs' ? 1 : 0)),
    }))
  }

  const stepForward = () => {
    setIsPlaying(false)
    setProgress((current) => ({
      bfs: bfsResult && focusMode !== 'dfs' ? Math.min(bfsResult.visitedNodeIds.length, current.bfs + 1) : current.bfs,
      dfs: dfsResult && focusMode !== 'bfs' ? Math.min(dfsResult.visitedNodeIds.length, current.dfs + 1) : current.dfs,
    }))
  }

  const resetPlayback = () => {
    setIsPlaying(false)
    setProgress({ bfs: 0, dfs: 0 })
  }

  const handleQueryKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab' && !event.shiftKey && autocompleteSuggestion) {
      event.preventDefault()
      setQuery(autocompleteSuggestion)
    }
  }

  const applyAutocompleteSuggestion = () => {
    if (autocompleteSuggestion) {
      setQuery(autocompleteSuggestion)
    }
  }

  const renderSequence = (result: TraversalResult | null, progressValue: number, variant: 'bfs' | 'dfs') => {
    if (!result) {
      return <div className="explorer-empty-sequence">Desabilitado.</div>
    }

    return (
      <div className="explorer-sequence-block">
        <div className="explorer-sequence-title">
          <span className={`explorer-sequence-dot ${variant}`} />
          {variant === 'bfs' ? 'BFS expande por camadas' : 'DFS aprofunda por ramo'}
        </div>
        <div className="explorer-sequence-flow">
          {result.visitedNodeIds.map((nodeId, index) => (
            <div
              key={`${variant}-${nodeId}-${index}`}
              className={`explorer-sequence-chip ${variant} ${getSequenceClasses(index, progressValue)}`}
            >
              <span className="explorer-sequence-index">{index + 1}</span>
              {cityLabel(nodeId)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="explorer-app">
      <div className="explorer-ambient explorer-ambient-a" />
      <div className="explorer-ambient explorer-ambient-b" />

      <header className="explorer-hero">
        <div>
          <h1>Graph Explorer</h1>
        </div>
      </header>
      <main className="explorer-layout">
        <section className="explorer-workspace">
          <section className="explorer-panel explorer-search-panel">
            <div className="explorer-search-toolbar">
              <div>
                <p className="explorer-kicker">Busca</p>
                <strong>Inspeção visual do grafo</strong>
              </div>
              <div className="explorer-search-toolbar-actions">
                <label className="explorer-select-wrap">
                  Cidades
                  <select
                    value={cityLimit}
                    onChange={(event) => setCityLimit(Number(event.target.value))}
                    className="explorer-select"
                  >
                    {cityCountOptions.map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="explorer-toggle">
                  <input
                    type="checkbox"
                    checked={enableVisualSearch}
                    onChange={(event) => setEnableVisualSearch(event.target.checked)}
                  />
                  Busca visual
                </label>
              </div>
            </div>
            <div className="explorer-search-row">
              <div className="explorer-input-shell">
                {autocompleteSuggestion && (
                  <div className="explorer-input-ghost" aria-hidden="true">
                    <span className="explorer-input-ghost-typed">{query}</span>
                    <span className="explorer-input-ghost-suffix">{autocompleteSuffix}</span>
                  </div>
                )}
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleQueryKeyDown}
                  placeholder={enableVisualSearch ? 'Digite uma cidade ou estado: Cuiaba, Curitiba, Sao Paulo, Goias...' : 'Digite normalmente. Ative a busca visual para inspecionar o grafo'}
                  className="explorer-input explorer-input-shell-field"
                />
              </div>
              <button
                type="button"
                className="explorer-button ghost explorer-mobile-complete-btn"
                onClick={applyAutocompleteSuggestion}
                disabled={!autocompleteSuggestion}
              >
                Completar
              </button>
              <button
                type="button"
                className="explorer-button ghost"
                onClick={() => setQuery('')}
              >
                Limpar
              </button>
            </div>
            <div className="explorer-search-status-row">
              <div className="explorer-inspector-card">
                <p className="explorer-kicker">Busca visual</p>
                <strong>{searchHeadline}</strong>
                <span>{searchProgressLabel}</span>
              </div>
              <div className="explorer-matches-card">
                <p className="explorer-kicker">Matches</p>
                <div className="explorer-chip-row">
                  {searchState.matchIds.length === 0 ? (
                    <span className="explorer-chip muted">
                      {!enableVisualSearch ? 'Busca visual desligada' : hasActiveQuery ? 'Nenhum match encontrado' : 'Sem matches ainda'}
                    </span>
                  ) : (
                    searchState.matchIds.map((nodeId) => (
                      <button
                        key={nodeId}
                        type="button"
                        className="explorer-chip match"
                        onClick={() => setRootCityId(nodeId)}
                      >
                        {cityLabel(nodeId)}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="explorer-panel explorer-control-panel">
            <label className="explorer-toggle">
              <input type="checkbox" checked={enableBfs} onChange={(event) => setEnableBfs(event.target.checked)} />
              BFS (Busca em Largura)
            </label>
            <label className="explorer-toggle">
              <input type="checkbox" checked={enableDfs} onChange={(event) => setEnableDfs(event.target.checked)} />
              DFS (Busca em Profundidade)
            </label>
            <button type="button" className="explorer-button primary" onClick={() => {
              setBfsResult(enableBfs ? runTraversal(graph, 'bfs', { stopWhen: traversalStopCondition }) : null)
              setDfsResult(enableDfs ? runTraversal(graph, 'dfs', { stopWhen: traversalStopCondition }) : null)
              setProgress({ bfs: 0, dfs: 0 })
              setIsPlaying(false)
            }}>
              Executar percurso
            </button>
            <button type="button" className="explorer-button accent" onClick={() => setIsPlaying((value) => !value)}>
              {isPlaying ? 'Pausar animacao' : 'Iniciar animacao'}
            </button>
            <button type="button" className="explorer-button ghost" onClick={stepBackward}>Passo anterior</button>
            <button type="button" className="explorer-button ghost" onClick={stepForward}>Proximo passo</button>
            <button type="button" className="explorer-button ghost" onClick={resetPlayback}>Reiniciar</button>
            <label className="explorer-select-wrap">
              Foco
              <select value={focusMode} onChange={(event) => setFocusMode(event.target.value as FocusMode)} className="explorer-select">
                <option value="sync">Sincronizado</option>
                <option value="bfs">BFS</option>
                <option value="dfs">DFS</option>
              </select>
            </label>
          </section>

          <section className="explorer-graph-grid">
            <article className="explorer-panel explorer-graph-panel">
              <div className="explorer-panel-header">
                <div>
                  <p className="explorer-kicker">Grafo</p>
                  <h2>Malha completa de cidades</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div className="explorer-legend">
                    <span className="explorer-legend-item city">Cidade</span>
                    <span className="explorer-legend-item root">Raiz</span>
                    <span className="explorer-legend-item match">Busca</span>
                  </div>
                </div>
              </div>

              <div className={`explorer-graph-canvas ${isGraphMaximized ? 'is-maximized' : ''}`}>
                {isGraphMaximized && (
                  <button
                    type="button"
                    className="explorer-button ghost explorer-restore-btn-absolute"
                    onClick={() => setIsGraphMaximized(false)}
                    title="Restaurar visualização normal"
                  >
                    ⤓ Restaurar
                  </button>
                )}
                <svg className="explorer-graph-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {graph.links.map((link) => {
                    const source = dynamicPositions[link.source]
                    const target = dynamicPositions[link.target]
                    if (!source || !target) {
                      return null
                    }

                    const isActive =
                      bfsVisited.has(link.source) ||
                      bfsVisited.has(link.target) ||
                      dfsVisited.has(link.source) ||
                      dfsVisited.has(link.target)
                    const isSearchRelated =
                      matched.has(link.source) ||
                      matched.has(link.target) ||
                      searchState.currentId === link.source ||
                      searchState.currentId === link.target
                    return (
                      <path
                        key={link.id}
                        d={createCurvePath(source, target)}
                        className={`explorer-edge ${isActive ? 'active' : ''} ${isSearchRelated ? 'search-related' : ''}`}
                      />
                    )
                  })}
                </svg>

                {graph.nodes.map((node) => {
                  const position = dynamicPositions[node.id]
                  if (!position) {
                    return null
                  }
                  const cityNode = node as PaperNode

                  const classNames = ['explorer-node']
                  if (node.id === effectiveRootCityId) classNames.push('is-root')
                  if (inspected.has(node.id)) classNames.push('is-inspected')
                  if (matched.has(node.id)) classNames.push('is-match')
                  if (searchState.currentId === node.id) classNames.push('is-searching')
                  if (bfsVisited.has(node.id)) classNames.push('is-bfs-visited')
                  if (dfsVisited.has(node.id)) classNames.push('is-dfs-visited')
                  if (bfsCurrent === node.id) classNames.push('is-bfs-current')
                  if (dfsCurrent === node.id) classNames.push('is-dfs-current')

                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={classNames.join(' ')}
                      style={{ left: `${position.x}%`, top: `${position.y}%` }}
                      onClick={() => setRootCityId(node.id)}
                    >
                      {bfsVisited.has(node.id) && <span className="explorer-node-badge bfs">{bfsResult?.visitedNodeIds.indexOf(node.id)! + 1}</span>}
                      {dfsVisited.has(node.id) && <span className="explorer-node-badge dfs">{dfsResult?.visitedNodeIds.indexOf(node.id)! + 1}</span>}
                      <span className="explorer-node-label">{cityNode.title}</span>
                    </button>
                  )
                })}
              </div>
            </article>

            <article className="explorer-panel explorer-graph-panel">
              <div className="explorer-panel-header">
                <div>
                  <p className="explorer-kicker">Timeline</p>
                  <h2>Busca e travessia</h2>
                </div>
                <div className="explorer-legend">
                  <span className="explorer-legend-item bfs">BFS</span>
                  <span className="explorer-legend-item dfs">DFS</span>
                </div>
              </div>

              <div className="explorer-progress-stack">
                <div className="explorer-progress-track search">
                  <span style={{ width: `${searchState.total > 0 ? (searchState.step / searchState.total) * 100 : 0}%` }} />
                </div>
                <div className="explorer-progress-track bfs">
                  <span style={{ width: `${bfsResult ? (progress.bfs / bfsResult.visitedNodeIds.length) * 100 : 0}%` }} />
                </div>
                <div className="explorer-progress-track dfs">
                  <span style={{ width: `${dfsResult ? (progress.dfs / dfsResult.visitedNodeIds.length) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="explorer-step-grid">
                <div className="explorer-step-card search">
                  <strong>Busca</strong>
                  <span>{hasActiveQuery ? `Consultando "${debouncedQuery}"` : 'Sem termo ativo'}</span>
                  <span>{searchStepDetail}</span>
                </div>
                <div className="explorer-step-card bfs">
                  <strong>BFS (Busca em Largura)</strong>
                  <span>{bfsCurrent ? `Atual: ${cityLabel(bfsCurrent)}` : 'Aguardando avanço'}</span>
                  <span>{bfsResult ? `Passo ${progress.bfs} de ${bfsResult.visitedNodeIds.length}` : 'Desabilitado'}</span>
                </div>
                <div className="explorer-step-card dfs">
                  <strong>DFS (Busca em Profundidade)</strong>
                  <span>{dfsCurrent ? `Atual: ${cityLabel(dfsCurrent)}` : 'Aguardando avanço'}</span>
                  <span>{dfsResult ? `Passo ${progress.dfs} de ${dfsResult.visitedNodeIds.length}` : 'Desabilitado'}</span>
                </div>
              </div>

              <div className="explorer-sequence-panel">
                <div className="explorer-sequence-block">
                  <div className="explorer-sequence-title">
                    <span className="explorer-sequence-dot search" />
                    Busca visual
                  </div>
                  <div className="explorer-sequence-flow">
                    {searchState.inspectedIds.length === 0 ? (
                      <div className="explorer-empty-sequence">Digite para começar a inspeção visual.</div>
                    ) : (
                      searchState.inspectedIds.map((nodeId, index) => (
                        <div
                          key={`search-${nodeId}-${index}`}
                          className={`explorer-sequence-chip search ${nodeId === searchState.currentId ? 'is-active' : 'is-complete'} ${matched.has(nodeId) ? 'is-match' : ''}`}
                        >
                          <span className="explorer-sequence-index">{index + 1}</span>
                          {cityLabel(nodeId)}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {renderSequence(bfsResult, progress.bfs, 'bfs')}
                {renderSequence(dfsResult, progress.dfs, 'dfs')}
              </div>
            </article>
          </section>
        </section>

        <aside className="explorer-sidebar">
          <section className="explorer-panel explorer-sidebar-card">
            <p className="explorer-kicker">Cidade raiz</p>
            <h3>{selectedCity.title}</h3>
            <div className="explorer-metric-grid">
              <div className="explorer-metric-row"><span>Estado</span><strong>{selectedCity.venue}</strong></div>
              <div className="explorer-metric-row"><span>Fundacao</span><strong>{selectedCity.year}</strong></div>
              <div className="explorer-metric-row"><span>Centralidade</span><strong>{selectedCity.citationCount}</strong></div>
              <div className="explorer-metric-row"><span>Conexoes</span><strong>{selectedCity.referenceCount}</strong></div>
            </div>
            <p className="explorer-city-description">{selectedCity.abstract}</p>
          </section>

          <section className="explorer-panel explorer-sidebar-card">
            <p className="explorer-kicker">BFS</p>
            <h3>Busca em Largura</h3>
            <div className="explorer-metric-grid">
              {bfsResult ? createMetricRows(bfsResult).map(([label, value]) => (
                <div className="explorer-metric-row" key={`bfs-${label}`}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              )) : <div className="explorer-empty-sequence">Desabilitado.</div>}
            </div>
          </section>

          <section className="explorer-panel explorer-sidebar-card">
            <p className="explorer-kicker">DFS</p>
            <h3>Busca em Profundidade</h3>
            <div className="explorer-metric-grid">
              {dfsResult ? createMetricRows(dfsResult).map(([label, value]) => (
                <div className="explorer-metric-row" key={`dfs-${label}`}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              )) : <div className="explorer-empty-sequence">Desabilitado.</div>}
            </div>
          </section>

          <section className="explorer-panel explorer-sidebar-card">
            <p className="explorer-kicker">Comparativo</p>
            <h3>BFS x DFS</h3>
            <div className="explorer-comparison-stack">
              {comparison ? (
                <>
                  <div className="explorer-comparison-card"><strong>Mais rapido</strong><span>{comparison.fasterAlgorithm.toUpperCase()}</span></div>
                  <div className="explorer-comparison-card"><strong>Maior cobertura</strong><span>{comparison.broaderAlgorithm.toUpperCase()}</span></div>
                  <div className="explorer-comparison-card"><strong>Maior profundidade</strong><span>{comparison.deeperAlgorithm.toUpperCase()}</span></div>
                  <div className="explorer-comparison-card"><strong>Nos em comum</strong><span>{comparison.sharedNodeIds.length}</span></div>
                  <div className="explorer-comparison-card"><strong>Diferenca de ordem</strong><span>{comparison.orderDifferenceCount}</span></div>
                </>
              ) : (
                <div className="explorer-empty-sequence">Ative BFS e DFS juntos para comparar.</div>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}
