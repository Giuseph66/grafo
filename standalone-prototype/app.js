const papers = [
  {
    id: 'paper_scibert',
    type: 'paper',
    title: 'SciBERT: A Pretrained Language Model for Scientific Text',
    year: 2019,
    venue: 'EMNLP',
    citationCount: 299,
    referenceCount: 45,
    abstract: 'Transformer científico para NLP acadêmico.',
    authors: ['author_beltagy', 'author_lo'],
    references: ['paper_bert'],
    citations: ['paper_specter', 'paper_scincl', 'paper_gnnsurvey'],
  },
  {
    id: 'paper_specter',
    type: 'paper',
    title: 'SPECTER: Citation-informed Transformers',
    year: 2020,
    venue: 'EMNLP',
    citationCount: 481,
    referenceCount: 37,
    abstract: 'Embeddings de documentos guiados por citações.',
    authors: ['author_beltagy', 'author_lo'],
    references: ['paper_scibert', 'paper_bert'],
    citations: ['paper_scincl', 'paper_galactica'],
  },
  {
    id: 'paper_scincl',
    type: 'paper',
    title: 'SciNCL: Semantic Citation Neighbor Learning',
    year: 2021,
    venue: 'ACL',
    citationCount: 152,
    referenceCount: 29,
    abstract: 'Representações com vizinhança semântica de citações.',
    authors: ['author_beltagy', 'author_lo'],
    references: ['paper_scibert', 'paper_specter'],
    citations: [],
  },
  {
    id: 'paper_bert',
    type: 'paper',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers',
    year: 2018,
    venue: 'NAACL',
    citationCount: 91234,
    referenceCount: 31,
    abstract: 'Base de transformers bidirecionais.',
    authors: ['author_devlin'],
    references: [],
    citations: ['paper_scibert', 'paper_specter'],
  },
  {
    id: 'paper_gcn',
    type: 'paper',
    title: 'Graph Convolutional Networks',
    year: 2017,
    venue: 'NeurIPS',
    citationCount: 56321,
    referenceCount: 18,
    abstract: 'Classificação semi-supervisionada em grafos.',
    authors: ['author_kipf'],
    references: [],
    citations: ['paper_graphsage', 'paper_gnnsurvey'],
  },
  {
    id: 'paper_graphsage',
    type: 'paper',
    title: 'GraphSAGE: Inductive Representation Learning',
    year: 2017,
    venue: 'NeurIPS',
    citationCount: 22014,
    referenceCount: 27,
    abstract: 'Embeddings indutivos com agregação de vizinhança.',
    authors: ['author_hamilton'],
    references: ['paper_gcn'],
    citations: ['paper_gnnsurvey'],
  },
  {
    id: 'paper_gnnsurvey',
    type: 'paper',
    title: 'A Survey of Graph Neural Networks for Scientific Discovery',
    year: 2021,
    venue: 'ACL',
    citationCount: 89,
    referenceCount: 62,
    abstract: 'Survey de GNNs para descoberta científica.',
    authors: ['author_hamilton', 'author_kipf'],
    references: ['paper_graphsage', 'paper_gcn', 'paper_scibert'],
    citations: [],
  },
  {
    id: 'paper_galactica',
    type: 'paper',
    title: 'Galactica: A Large Language Model for Science',
    year: 2022,
    venue: 'ACL',
    citationCount: 129,
    referenceCount: 44,
    abstract: 'LLM voltado para síntese científica.',
    authors: ['author_lo'],
    references: ['paper_specter'],
    citations: [],
  },
]

const authors = [
  { id: 'author_beltagy', type: 'author', name: 'Iz Beltagy', hIndex: 42, paperIds: ['paper_scibert', 'paper_specter', 'paper_scincl'] },
  { id: 'author_lo', type: 'author', name: 'Kyle Lo', hIndex: 38, paperIds: ['paper_scibert', 'paper_specter', 'paper_scincl', 'paper_galactica'] },
  { id: 'author_devlin', type: 'author', name: 'Jacob Devlin', hIndex: 101, paperIds: ['paper_bert'] },
  { id: 'author_hamilton', type: 'author', name: 'William L. Hamilton', hIndex: 73, paperIds: ['paper_graphsage', 'paper_gnnsurvey'] },
  { id: 'author_kipf', type: 'author', name: 'Thomas N. Kipf', hIndex: 78, paperIds: ['paper_gcn', 'paper_gnnsurvey'] },
]

const venues = [
  { id: 'venue_emnlp', type: 'venue', name: 'EMNLP', paperIds: ['paper_scibert', 'paper_specter'] },
  { id: 'venue_acl', type: 'venue', name: 'ACL', paperIds: ['paper_scincl', 'paper_gnnsurvey', 'paper_galactica'] },
  { id: 'venue_neurips', type: 'venue', name: 'NeurIPS', paperIds: ['paper_gcn', 'paper_graphsage'] },
  { id: 'venue_naacl', type: 'venue', name: 'NAACL', paperIds: ['paper_bert'] },
]

const paperMap = new Map(papers.map((item) => [item.id, item]))
const authorMap = new Map(authors.map((item) => [item.id, item]))
const venueMap = new Map(venues.map((item) => [item.id, item]))

const state = {
  query: '',
  searchType: 'paper',
  selectedResult: null,
  rootPaperId: 'paper_scibert',
  graph: null,
  bfs: null,
  dfs: null,
  comparison: null,
  focusMode: 'sync',
  playback: {
    timerId: null,
    isPlaying: false,
    progress: { bfs: 0, dfs: 0 },
  },
}

const els = {
  searchInput: document.getElementById('searchInput'),
  searchType: document.getElementById('searchType'),
  searchButton: document.getElementById('searchButton'),
  clearButton: document.getElementById('clearButton'),
  searchResults: document.getElementById('searchResults'),
  paperChooser: document.getElementById('paperChooser'),
  depthInput: document.getElementById('depthInput'),
  depthValue: document.getElementById('depthValue'),
  nodesInput: document.getElementById('nodesInput'),
  nodesValue: document.getElementById('nodesValue'),
  bfsToggle: document.getElementById('bfsToggle'),
  dfsToggle: document.getElementById('dfsToggle'),
  authorsToggle: document.getElementById('authorsToggle'),
  venuesToggle: document.getElementById('venuesToggle'),
  referencesToggle: document.getElementById('referencesToggle'),
  citationsToggle: document.getElementById('citationsToggle'),
  runButton: document.getElementById('runButton'),
  animateButton: document.getElementById('animateButton'),
  compareButton: document.getElementById('compareButton'),
  prevStepButton: document.getElementById('prevStepButton'),
  nextStepButton: document.getElementById('nextStepButton'),
  resetPlaybackButton: document.getElementById('resetPlaybackButton'),
  focusMode: document.getElementById('focusMode'),
  bfsProgressBar: document.getElementById('bfsProgressBar'),
  dfsProgressBar: document.getElementById('dfsProgressBar'),
  stepDetails: document.getElementById('stepDetails'),
  graphArea: document.getElementById('graphArea'),
  traversalArea: document.getElementById('traversalArea'),
  bfsMetrics: document.getElementById('bfsMetrics'),
  dfsMetrics: document.getElementById('dfsMetrics'),
  comparisonMetrics: document.getElementById('comparisonMetrics'),
}

function formatMs(value) {
  return `${value.toFixed(value < 10 ? 2 : 0)} ms`
}

function formatPayload(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function labelFor(nodeId) {
  if (!nodeId) return '-'
  const paper = paperMap.get(nodeId)
  if (paper) return paper.title.split(':')[0]
  const author = authorMap.get(nodeId)
  if (author) return author.name
  const venue = venueMap.get(nodeId)
  return venue ? venue.name : nodeId
}

function searchRecords(term, type) {
  const query = term.trim().toLowerCase()
  if (!query) return []

  if (type === 'paper') {
    return papers
      .filter((item) => item.title.toLowerCase().includes(query) || item.id.toLowerCase().includes(query))
      .map((item) => ({
        id: item.id,
        type: 'paper',
        label: item.title,
        subtitle: `${item.venue} • ${item.year}`,
        description: `${item.citationCount} citações`,
        relatedPaperIds: [item.id],
      }))
  }

  if (type === 'author') {
    return authors
      .filter((item) => item.name.toLowerCase().includes(query))
      .map((item) => ({
        id: item.id,
        type: 'author',
        label: item.name,
        subtitle: `h-index ${item.hIndex}`,
        description: `${item.paperIds.length} papers relacionados`,
        relatedPaperIds: item.paperIds,
      }))
  }

  return venues
    .filter((item) => item.name.toLowerCase().includes(query))
    .map((item) => ({
      id: item.id,
      type: 'venue',
      label: item.name,
      subtitle: 'Venue acadêmica',
      description: `${item.paperIds.length} papers relacionados`,
      relatedPaperIds: item.paperIds,
    }))
}

function buildGraph(rootPaperId, options) {
  const nodes = new Map()
  const links = new Map()
  const queue = [{ id: rootPaperId, depth: 0 }]
  const expanded = new Set()
  let payloadBytes = 0
  let requests = 0
  let truncated = false

  const addNode = (node) => {
    if (nodes.has(node.id)) return true
    if (nodes.size >= options.maxNodes) {
      truncated = true
      return false
    }
    nodes.set(node.id, node)
    return true
  }

  const addLink = (source, target, type, label) => {
    const id = `${source}_${type}_${target}`
    if (nodes.has(source) && nodes.has(target)) {
      links.set(id, { id, source, target, type, label })
    }
  }

  while (queue.length && !truncated) {
    const current = queue.shift()
    if (expanded.has(current.id)) continue
    const paper = paperMap.get(current.id)
    if (!paper) continue

    expanded.add(current.id)
    requests += 1
    payloadBytes += JSON.stringify(paper).length

    addNode({
      id: paper.id,
      type: 'paper',
      label: paper.title,
      title: paper.title,
      year: paper.year,
      venue: paper.venue,
      citationCount: paper.citationCount,
      referenceCount: paper.referenceCount,
    })

    if (options.includeAuthors) {
      paper.authors.forEach((authorId) => {
        const author = authorMap.get(authorId)
        if (!author) return
        if (addNode({ id: author.id, type: 'author', label: author.name, hIndex: author.hIndex })) {
          addLink(author.id, paper.id, 'WROTE', 'Escreveu')
          addLink(paper.id, author.id, 'HAS_AUTHOR', 'Possui autor')
        }
      })
    }

    if (options.includeVenues) {
      const venue = venues.find((item) => item.name === paper.venue)
      if (venue && addNode({ id: venue.id, type: 'venue', label: venue.name, venueType: 'conference' })) {
        addLink(paper.id, venue.id, 'PUBLISHED_IN', 'Publicado em')
      }
    }

    if (current.depth >= options.maxDepth) continue

    if (options.includeReferences) {
      paper.references.forEach((referenceId) => {
        const reference = paperMap.get(referenceId)
        if (!reference) return
        if (
          addNode({
            id: reference.id,
            type: 'paper',
            label: reference.title,
            title: reference.title,
            year: reference.year,
            venue: reference.venue,
            citationCount: reference.citationCount,
            referenceCount: reference.referenceCount,
          })
        ) {
          addLink(paper.id, reference.id, 'REFERENCES', 'Referencia')
          queue.push({ id: reference.id, depth: current.depth + 1 })
        }
      })
    }

    if (options.includeCitations) {
      paper.citations.forEach((citationId) => {
        const citation = paperMap.get(citationId)
        if (!citation) return
        if (
          addNode({
            id: citation.id,
            type: 'paper',
            label: citation.title,
            title: citation.title,
            year: citation.year,
            venue: citation.venue,
            citationCount: citation.citationCount,
            referenceCount: citation.referenceCount,
          })
        ) {
          addLink(citation.id, paper.id, 'CITES', 'Cita')
          queue.push({ id: citation.id, depth: current.depth + 1 })
        }
      })
    }
  }

  return {
    rootNodeId: rootPaperId,
    nodes: [...nodes.values()],
    links: [...links.values()],
    metadata: { requests, payloadBytes, truncated },
  }
}

function buildAdjacency(graph) {
  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]))
  graph.links.forEach((link) => {
    adjacency.get(link.source)?.push({ nodeId: link.target, edgeId: link.id })
    adjacency.get(link.target)?.push({ nodeId: link.source, edgeId: link.id })
  })
  return adjacency
}

function runTraversal(graph, algorithm) {
  const start = performance.now()
  const adjacency = buildAdjacency(graph)
  const visited = new Set()
  const traversedEdges = []
  const steps = []
  let maxDepth = 0

  if (algorithm === 'bfs') {
    const queue = [{ nodeId: graph.rootNodeId, depth: 0, viaEdgeId: null }]
    while (queue.length) {
      const current = queue.shift()
      if (!current || visited.has(current.nodeId)) continue
      visited.add(current.nodeId)
      maxDepth = Math.max(maxDepth, current.depth)
      steps.push({
        nodeId: current.nodeId,
        depth: current.depth,
        viaEdgeId: current.viaEdgeId,
        frontier: queue.map((item) => item.nodeId),
      })
      ;(adjacency.get(current.nodeId) || []).forEach((neighbor) => {
        if (!visited.has(neighbor.nodeId) && !queue.some((item) => item.nodeId === neighbor.nodeId)) {
          traversedEdges.push(neighbor.edgeId)
          queue.push({ nodeId: neighbor.nodeId, depth: current.depth + 1, viaEdgeId: neighbor.edgeId })
        }
      })
    }
  } else {
    const stack = [{ nodeId: graph.rootNodeId, depth: 0, viaEdgeId: null }]
    while (stack.length) {
      const current = stack.pop()
      if (!current || visited.has(current.nodeId)) continue
      visited.add(current.nodeId)
      maxDepth = Math.max(maxDepth, current.depth)
      steps.push({
        nodeId: current.nodeId,
        depth: current.depth,
        viaEdgeId: current.viaEdgeId,
        frontier: stack.map((item) => item.nodeId),
      })
      const neighbors = (adjacency.get(current.nodeId) || []).filter((neighbor) => !visited.has(neighbor.nodeId))
      for (let index = neighbors.length - 1; index >= 0; index -= 1) {
        traversedEdges.push(neighbors[index].edgeId)
        stack.push({ nodeId: neighbors[index].nodeId, depth: current.depth + 1, viaEdgeId: neighbors[index].edgeId })
      }
    }
  }

  const order = steps.map((step) => step.nodeId)
  return {
    algorithm,
    order,
    steps,
    edgeIds: traversedEdges,
    metrics: {
      algorithm,
      searchTimeMs: performance.now() - start,
      renderTimeMs: 16 + Math.random() * 8,
      nodesVisited: order.length,
      edgesTraversed: new Set(traversedEdges).size,
      depthReached: maxDepth,
      apiRequests: graph.metadata.requests,
      payloadBytes: graph.metadata.payloadBytes,
      computationalCostScore: Math.round(order.length * 1.5 + new Set(traversedEdges).size * 1.2 + maxDepth * 9),
      apiLimitUsagePercent: graph.metadata.requests,
      complexity: 'O(V + E)',
      visitOrder: order,
      rootNodeId: graph.rootNodeId,
      lastVisitedNodeId: order[order.length - 1] || '-',
      status: graph.metadata.truncated ? 'truncated' : 'completed',
      errors: graph.metadata.truncated ? ['Limite de nós atingido'] : [],
    },
  }
}

function compareResults(bfs, dfs) {
  if (!bfs || !dfs) return null
  const bfsSet = new Set(bfs.order)
  const dfsSet = new Set(dfs.order)
  let orderDifferenceCount = 0
  const maxLength = Math.max(bfs.order.length, dfs.order.length)
  for (let index = 0; index < maxLength; index += 1) {
    if (bfs.order[index] !== dfs.order[index]) orderDifferenceCount += 1
  }
  return {
    sharedNodeIds: bfs.order.filter((item) => dfsSet.has(item)),
    onlyBfsNodeIds: bfs.order.filter((item) => !dfsSet.has(item)),
    onlyDfsNodeIds: dfs.order.filter((item) => !bfsSet.has(item)),
    orderDifferenceCount,
    fasterAlgorithm: bfs.metrics.searchTimeMs <= dfs.metrics.searchTimeMs ? 'BFS' : 'DFS',
    deeperAlgorithm: bfs.metrics.depthReached >= dfs.metrics.depthReached ? 'BFS' : 'DFS',
    broaderAlgorithm: bfs.metrics.nodesVisited >= dfs.metrics.nodesVisited ? 'BFS' : 'DFS',
  }
}

function getOptions() {
  return {
    maxDepth: Number(els.depthInput.value),
    maxNodes: Number(els.nodesInput.value),
    includeAuthors: els.authorsToggle.checked,
    includeVenues: els.venuesToggle.checked,
    includeReferences: els.referencesToggle.checked,
    includeCitations: els.citationsToggle.checked,
  }
}

function resetPlayback() {
  stopPlayback()
  state.playback.progress = { bfs: 0, dfs: 0 }
  updatePlaybackButton()
}

function stopPlayback() {
  if (state.playback.timerId) {
    window.clearInterval(state.playback.timerId)
    state.playback.timerId = null
  }
  state.playback.isPlaying = false
  updatePlaybackButton()
}

function updatePlaybackButton() {
  els.animateButton.textContent = state.playback.isPlaying ? 'Pausar animação' : 'Iniciar animação'
}

function activeAlgorithms() {
  const list = []
  if (state.bfs) list.push('bfs')
  if (state.dfs) list.push('dfs')
  return list
}

function canAdvance(algorithm) {
  if (algorithm === 'bfs') return state.bfs && state.playback.progress.bfs < state.bfs.order.length
  if (algorithm === 'dfs') return state.dfs && state.playback.progress.dfs < state.dfs.order.length
  return false
}

function focusAlgorithms() {
  if (state.focusMode === 'bfs') return state.bfs ? ['bfs'] : []
  if (state.focusMode === 'dfs') return state.dfs ? ['dfs'] : []
  return activeAlgorithms()
}

function stepForward() {
  let changed = false
  focusAlgorithms().forEach((algorithm) => {
    if (canAdvance(algorithm)) {
      state.playback.progress[algorithm] += 1
      changed = true
    }
  })
  if (!changed) stopPlayback()
  renderAll()
}

function stepBackward() {
  let changed = false
  focusAlgorithms().forEach((algorithm) => {
    if (state.playback.progress[algorithm] > 0) {
      state.playback.progress[algorithm] -= 1
      changed = true
    }
  })
  if (changed) renderAll()
}

function togglePlayback() {
  if (state.playback.isPlaying) {
    stopPlayback()
    return
  }

  stopPlayback()
  state.playback.isPlaying = true
  updatePlaybackButton()
  state.playback.timerId = window.setInterval(() => {
    stepForward()
  }, 850)
}

function renderSearchResults(results) {
  if (!results.length) {
    els.searchResults.innerHTML = '<p class="microcopy">Digite um termo para localizar papers, autores ou venues.</p>'
    return
  }

  els.searchResults.innerHTML = results
    .map(
      (item) => `
        <button class="result-card ${state.selectedResult && state.selectedResult.id === item.id ? 'active' : ''}" data-result-id="${item.id}">
          <h4>${item.label}</h4>
          <p class="meta">${item.subtitle}</p>
          <p class="microcopy">${item.description}</p>
        </button>
      `,
    )
    .join('')

  els.searchResults.querySelectorAll('[data-result-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedResult = results.find((item) => item.id === button.dataset.resultId)
      if (state.selectedResult.type === 'paper') {
        state.rootPaperId = state.selectedResult.id
      }
      renderPaperChooser()
      renderSearchResults(results)
    })
  })
}

function renderPaperChooser() {
  if (!state.selectedResult || state.selectedResult.type === 'paper') {
    els.paperChooser.classList.add('hidden')
    els.paperChooser.innerHTML = ''
    return
  }

  const relatedPapers = state.selectedResult.relatedPaperIds.map((id) => paperMap.get(id)).filter(Boolean)
  els.paperChooser.classList.remove('hidden')
  els.paperChooser.innerHTML = `
    <div style="width:100%">
      <p class="panel-kicker">Escolha o paper raiz</p>
      <div class="paper-chooser">
        ${relatedPapers
          .map(
            (paper) => `
              <button class="paper-option ${state.rootPaperId === paper.id ? 'active' : ''}" data-paper-id="${paper.id}">
                <h4>${paper.title}</h4>
                <p class="meta">${paper.venue} • ${paper.year}</p>
              </button>
            `,
          )
          .join('')}
      </div>
    </div>
  `

  els.paperChooser.querySelectorAll('[data-paper-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.rootPaperId = button.dataset.paperId
      renderPaperChooser()
    })
  })
}

function computePositions(nodes, rootNodeId) {
  const centerX = 50
  const centerY = 48
  const positions = {}
  const root = nodes.find((node) => node.id === rootNodeId)
  const papersOnly = nodes.filter((node) => node.type === 'paper' && node.id !== rootNodeId)
  const authorsOnly = nodes.filter((node) => node.type === 'author')
  const venuesOnly = nodes.filter((node) => node.type === 'venue')

  if (root) positions[root.id] = { x: centerX, y: centerY }

  papersOnly.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(papersOnly.length, 1)
    positions[node.id] = { x: centerX + Math.cos(angle) * 28, y: centerY + Math.sin(angle) * 23 }
  })

  authorsOnly.forEach((node, index) => {
    const angle = Math.PI + (Math.PI * index) / Math.max(authorsOnly.length, 1)
    positions[node.id] = { x: centerX + Math.cos(angle) * 40, y: centerY + Math.sin(angle) * 29 }
  })

  venuesOnly.forEach((node, index) => {
    const angle = -Math.PI / 2 + (Math.PI * index) / Math.max(venuesOnly.length, 1)
    positions[node.id] = { x: centerX + Math.cos(angle) * 16, y: centerY + Math.sin(angle) * 36 }
  })

  return positions
}

function getProgressMaps() {
  const bfsCount = state.playback.progress.bfs
  const dfsCount = state.playback.progress.dfs
  return {
    bfsIndex: new Map((state.bfs?.order.slice(0, bfsCount) || []).map((id, index) => [id, index + 1])),
    dfsIndex: new Map((state.dfs?.order.slice(0, dfsCount) || []).map((id, index) => [id, index + 1])),
    bfsCurrent: state.bfs?.order[bfsCount - 1] || null,
    dfsCurrent: state.dfs?.order[dfsCount - 1] || null,
  }
}

function renderGraph() {
  if (!state.graph) {
    els.graphArea.innerHTML = '<div class="graph-empty">Selecione um resultado e execute a busca para materializar o subgrafo.</div>'
    return
  }

  const positions = computePositions(state.graph.nodes, state.graph.rootNodeId)
  const { bfsIndex, dfsIndex, bfsCurrent, dfsCurrent } = getProgressMaps()

  const visibleEdges = new Set()
  if (state.bfs) {
    state.bfs.steps.slice(0, state.playback.progress.bfs).forEach((step) => {
      if (step.viaEdgeId) visibleEdges.add(step.viaEdgeId)
    })
  }
  if (state.dfs) {
    state.dfs.steps.slice(0, state.playback.progress.dfs).forEach((step) => {
      if (step.viaEdgeId) visibleEdges.add(step.viaEdgeId)
    })
  }

  const svg = `
    <svg class="graph-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      ${state.graph.links
        .map((link) => {
          const from = positions[link.source]
          const to = positions[link.target]
          if (!from || !to) return ''
          const edgeClass =
            link.type === 'PUBLISHED_IN'
              ? 'venue'
              : link.type === 'WROTE' || link.type === 'HAS_AUTHOR'
                ? 'authorship'
                : 'references'
          const isVisible = visibleEdges.has(link.id)
          return `<line class="edge ${edgeClass}" style="opacity:${isVisible ? 0.82 : 0.12}; stroke-width:${isVisible ? 2.8 : 1.3}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`
        })
        .join('')}
    </svg>
  `

  const nodesMarkup = state.graph.nodes
    .map((node) => {
      const position = positions[node.id]
      if (!position) return ''
      const bfsVisited = bfsIndex.has(node.id)
      const dfsVisited = dfsIndex.has(node.id)
      const isCurrentBfs = bfsCurrent === node.id
      const isCurrentDfs = dfsCurrent === node.id
      const isFuture = !bfsVisited && !dfsVisited && node.id !== state.graph.rootNodeId

      return `
        <div class="node ${node.type} ${state.graph.rootNodeId === node.id ? 'root' : ''} ${bfsVisited ? 'visited-bfs' : ''} ${dfsVisited ? 'visited-dfs' : ''} ${isCurrentBfs ? 'current-bfs' : ''} ${isCurrentDfs ? 'current-dfs' : ''} ${isFuture ? 'future' : ''}"
             style="left:${position.x}%; top:${position.y}%;">
          ${bfsVisited ? `<div class="visit-badge bfs">${bfsIndex.get(node.id)}</div>` : ''}
          ${dfsVisited ? `<div class="visit-badge dfs" style="right:auto; left:-8px;">${dfsIndex.get(node.id)}</div>` : ''}
          <div class="node-title">${node.label}</div>
          <div class="node-meta">
            ${node.type === 'paper' ? `${node.venue} • ${node.year}` : node.type === 'author' ? `h-index ${node.hIndex}` : node.venueType || 'venue'}
          </div>
        </div>
      `
    })
    .join('')

  els.graphArea.innerHTML = `${svg}${nodesMarkup}`
}

function renderSequenceBlock(result, progress, cssClass, title) {
  if (!result) return ''
  return `
    <div class="sequence-block">
      <div class="sequence-title"><span class="dot ${cssClass}"></span>${title}</div>
      <div class="sequence-flow">
        ${result.order
          .map((nodeId, index) => {
            const statusClass = index + 1 === progress ? 'active' : index >= progress ? 'future' : ''
            return `<div class="sequence-chip ${cssClass} ${statusClass}"><span class="index">${index + 1}</span>${labelFor(nodeId)}</div>`
          })
          .join('')}
      </div>
    </div>
  `
}

function renderTraversalSequences() {
  if (!state.bfs && !state.dfs) {
    els.traversalArea.innerHTML = '<div class="graph-empty">As trilhas BFS e DFS aparecem aqui após a execução.</div>'
    return
  }

  const sections = [
    renderSequenceBlock(state.bfs, state.playback.progress.bfs, 'bfs', 'BFS expande por camadas'),
    renderSequenceBlock(state.dfs, state.playback.progress.dfs, 'dfs', 'DFS aprofunda um ramo por vez'),
  ]
    .filter(Boolean)
    .join('')

  els.traversalArea.innerHTML = `<div class="sequence">${sections}</div>`
}

function renderStepDetails() {
  const bfsStep = state.bfs?.steps[state.playback.progress.bfs - 1] || null
  const dfsStep = state.dfs?.steps[state.playback.progress.dfs - 1] || null

  const createCard = (label, step, cssClass, total) => `
    <div class="step-card ${cssClass}">
      <strong>${label}</strong>
      <span>${step ? `Passo ${state.playback.progress[label.toLowerCase()]} de ${total}` : 'Sem progresso ainda'}</span>
      <span>${step ? `Nó atual: ${labelFor(step.nodeId)}` : 'Clique em iniciar animação ou avance manualmente.'}</span>
      <span>${step ? `Profundidade ${step.depth} • Fronteira: ${step.frontier.length}` : 'Aguardando travessia.'}</span>
    </div>
  `

  els.stepDetails.innerHTML = [
    state.bfs ? createCard('BFS', bfsStep, 'bfs-card', state.bfs.order.length) : '',
    state.dfs ? createCard('DFS', dfsStep, 'dfs-card', state.dfs.order.length) : '',
  ]
    .filter(Boolean)
    .join('')

  const bfsPercent = state.bfs ? (state.playback.progress.bfs / state.bfs.order.length) * 100 : 0
  const dfsPercent = state.dfs ? (state.playback.progress.dfs / state.dfs.order.length) * 100 : 0
  els.bfsProgressBar.style.width = `${bfsPercent}%`
  els.dfsProgressBar.style.width = `${dfsPercent}%`
}

function renderMetrics(target, result, color) {
  if (!result) {
    target.innerHTML = '<p class="microcopy">Aguardando execução.</p>'
    return
  }

  const metrics = result.metrics
  target.innerHTML = [
    ['Tempo de busca', formatMs(metrics.searchTimeMs)],
    ['Tempo de renderização', formatMs(metrics.renderTimeMs)],
    ['Nós visitados', metrics.nodesVisited],
    ['Arestas percorridas', metrics.edgesTraversed],
    ['Profundidade real', metrics.depthReached],
    ['Requests API', metrics.apiRequests],
    ['Payload estimado', formatPayload(metrics.payloadBytes)],
    ['Complexidade', metrics.complexity],
    ['Custo computacional', metrics.computationalCostScore],
    ['Último nó', labelFor(metrics.lastVisitedNodeId)],
  ]
    .map(
      ([label, value]) => `
        <div class="metric-item" style="box-shadow: inset 2px 0 0 ${color}">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `,
    )
    .join('')

  if (metrics.errors.length) {
    target.innerHTML += `<div class="status">${metrics.errors.join(', ')}</div>`
  }
}

function renderComparison() {
  if (!state.comparison) {
    els.comparisonMetrics.innerHTML = '<p class="microcopy">Marque BFS e DFS juntos para comparar.</p>'
    return
  }

  els.comparisonMetrics.innerHTML = `
    <div class="comparison-pill">
      <strong>Mais rápido</strong>
      <span>${state.comparison.fasterAlgorithm}</span>
    </div>
    <div class="comparison-pill">
      <strong>Maior cobertura</strong>
      <span>${state.comparison.broaderAlgorithm}</span>
    </div>
    <div class="comparison-pill">
      <strong>Maior profundidade</strong>
      <span>${state.comparison.deeperAlgorithm}</span>
    </div>
    <div class="comparison-pill">
      <strong>Nós em comum</strong>
      <span>${state.comparison.sharedNodeIds.length}</span>
    </div>
    <div class="comparison-pill">
      <strong>Diferenças de ordem</strong>
      <span>${state.comparison.orderDifferenceCount}</span>
    </div>
  `
}

function renderAll() {
  renderGraph()
  renderStepDetails()
  renderTraversalSequences()
  renderMetrics(els.bfsMetrics, state.bfs, 'rgba(73, 217, 255, 0.6)')
  renderMetrics(els.dfsMetrics, state.dfs, 'rgba(255, 177, 77, 0.6)')
  renderComparison()
}

function execute() {
  if (!state.rootPaperId) return
  stopPlayback()
  state.graph = buildGraph(state.rootPaperId, getOptions())
  state.bfs = els.bfsToggle.checked ? runTraversal(state.graph, 'bfs') : null
  state.dfs = els.dfsToggle.checked ? runTraversal(state.graph, 'dfs') : null
  state.comparison = state.bfs && state.dfs ? compareResults(state.bfs, state.dfs) : null
  resetPlayback()
  renderAll()
}

els.searchButton.addEventListener('click', () => {
  state.query = els.searchInput.value
  state.searchType = els.searchType.value
  renderSearchResults(searchRecords(state.query, state.searchType))
})

els.clearButton.addEventListener('click', () => {
  els.searchInput.value = ''
  state.query = ''
  state.selectedResult = null
  state.rootPaperId = 'paper_scibert'
  els.searchResults.innerHTML = '<p class="microcopy">Busca limpa. O protótipo voltou para SciBERT como paper raiz.</p>'
  renderPaperChooser()
  execute()
})

els.searchInput.addEventListener('input', () => {
  state.query = els.searchInput.value
  renderSearchResults(searchRecords(state.query, els.searchType.value))
})

els.searchType.addEventListener('change', () => {
  state.searchType = els.searchType.value
  renderSearchResults(searchRecords(els.searchInput.value, state.searchType))
})

els.depthInput.addEventListener('input', () => {
  els.depthValue.textContent = els.depthInput.value
})

els.nodesInput.addEventListener('input', () => {
  els.nodesValue.textContent = els.nodesInput.value
})

els.runButton.addEventListener('click', execute)
els.animateButton.addEventListener('click', togglePlayback)
els.prevStepButton.addEventListener('click', () => {
  stopPlayback()
  stepBackward()
})
els.nextStepButton.addEventListener('click', () => {
  stopPlayback()
  stepForward()
})
els.resetPlaybackButton.addEventListener('click', () => {
  resetPlayback()
  renderAll()
})
els.focusMode.addEventListener('change', () => {
  state.focusMode = els.focusMode.value
  stopPlayback()
})
els.compareButton.addEventListener('click', () => {
  if (state.focusMode === 'sync') {
    state.focusMode = 'bfs'
    els.focusMode.value = 'bfs'
    els.compareButton.textContent = 'Foco: BFS'
  } else if (state.focusMode === 'bfs') {
    state.focusMode = 'dfs'
    els.focusMode.value = 'dfs'
    els.compareButton.textContent = 'Foco: DFS'
  } else {
    state.focusMode = 'sync'
    els.focusMode.value = 'sync'
    els.compareButton.textContent = 'Foco: Sincronizado'
  }
  stopPlayback()
})

els.depthValue.textContent = els.depthInput.value
els.nodesValue.textContent = els.nodesInput.value
renderSearchResults([])
execute()
