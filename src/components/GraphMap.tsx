import type { AcademicGraph, PaperNode } from '../types/domain'

// ─── Types ───
export interface GraphMapProps {
    graph: AcademicGraph
    dynamicPositions: Record<string, { x: number; y: number }>
    effectiveRootCityId: string
    onSelectCity: (cityId: string) => void

    // Edge highlighting
    activeEdgeIds: Set<string>

    // Visual search state
    inspectedIds: Set<string>
    matchedIds: Set<string>
    searchingId: string | null

    // BFS/DFS traversal state
    enableBfs: boolean
    enableDfs: boolean
    bfsHighlightedNodes: Set<string>
    dfsHighlightedNodes: Set<string>
    bfsCurrent: string | null
    dfsCurrent: string | null
    bfsVisited: Set<string>
    dfsVisited: Set<string>
    bfsVisitOrder: string[]
    dfsVisitOrder: string[]

    // Fullscreen
    isMaximized: boolean
    onRestore: () => void

    // Legend / controls
    showOnlyLatestPath: boolean
    onToggleShowOnlyLatestPath: (value: boolean) => void
}

// ─── Helpers ───
function createCurvePath(source: { x: number; y: number }, target: { x: number; y: number }) {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`
}

// ─── Component ───
export function GraphMap({
    graph,
    dynamicPositions,
    effectiveRootCityId,
    onSelectCity,
    activeEdgeIds,
    inspectedIds,
    matchedIds,
    searchingId,
    enableBfs,
    enableDfs,
    bfsHighlightedNodes,
    dfsHighlightedNodes,
    bfsCurrent,
    dfsCurrent,
    bfsVisited,
    dfsVisited,
    bfsVisitOrder,
    dfsVisitOrder,
    isMaximized,
    onRestore,
    showOnlyLatestPath,
    onToggleShowOnlyLatestPath,
}: GraphMapProps) {
    return (
        <article className="explorer-panel explorer-graph-panel">
            <div className="explorer-panel-header">
                <div>
                    <p className="explorer-kicker">Grafo</p>
                    <h2>Malha completa de cidades</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="explorer-legend">
                        <label className="explorer-toggle explorer-header-toggle">
                            <input
                                type="checkbox"
                                checked={showOnlyLatestPath}
                                onChange={(event) => onToggleShowOnlyLatestPath(event.target.checked)}
                            />
                            Apenas ultimos caminho
                        </label>
                        <span className="explorer-legend-item city">Cidade</span>
                        <span className="explorer-legend-item root">Raiz</span>
                        <span className="explorer-legend-item match">Busca</span>
                    </div>
                </div>
            </div>

            <div className={`explorer-graph-canvas ${isMaximized ? 'is-maximized' : ''}`}>
                {isMaximized && (
                    <button
                        type="button"
                        className="explorer-button ghost explorer-restore-btn-absolute"
                        onClick={onRestore}
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

                        const isActive = activeEdgeIds.has(link.id)
                        const isSearchRelated =
                            matchedIds.has(link.source) ||
                            matchedIds.has(link.target) ||
                            searchingId === link.source ||
                            searchingId === link.target
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
                    if (inspectedIds.has(node.id)) classNames.push('is-inspected')
                    if (matchedIds.has(node.id)) classNames.push('is-match')
                    if (searchingId === node.id) classNames.push('is-searching')
                    if (bfsHighlightedNodes.has(node.id)) classNames.push('is-bfs-visited')
                    if (dfsHighlightedNodes.has(node.id)) classNames.push('is-dfs-visited')
                    if (enableBfs && bfsCurrent === node.id) classNames.push('is-bfs-current')
                    if (enableDfs && dfsCurrent === node.id) classNames.push('is-dfs-current')

                    return (
                        <button
                            key={node.id}
                            type="button"
                            className={classNames.join(' ')}
                            style={{ left: `${position.x}%`, top: `${position.y}%` }}
                            onClick={() => onSelectCity(node.id)}
                        >
                            {enableBfs && bfsVisited.has(node.id) && <span className="explorer-node-badge bfs">{bfsVisitOrder.indexOf(node.id) + 1}</span>}
                            {enableDfs && dfsVisited.has(node.id) && <span className="explorer-node-badge dfs">{dfsVisitOrder.indexOf(node.id) + 1}</span>}
                            <span className="explorer-node-label">{cityNode.title}</span>
                        </button>
                    )
                })}
            </div>
        </article>
    )
}
