import { buildBaseMetrics } from '../analytics/metrics'
import type { AcademicGraph, GraphNode, TraversalAlgorithm, TraversalResult, TraversalStep } from '../types/domain'

interface Neighbor {
  nodeId: string
  edgeId: string
}

const neighborPriority = (node: GraphNode) => {
  if (node.type === 'paper') return 0
  if (node.type === 'author') return 1
  return 2
}

const getNodeMap = (graph: AcademicGraph) => new Map(graph.nodes.map((node) => [node.id, node]))

const buildAdjacency = (graph: AcademicGraph) => {
  const nodeMap = getNodeMap(graph)
  const adjacency = new Map<string, Neighbor[]>()

  for (const node of graph.nodes) {
    adjacency.set(node.id, [])
  }

  for (const link of graph.links) {
    adjacency.get(link.source)?.push({ nodeId: link.target, edgeId: link.id })
    adjacency.get(link.target)?.push({ nodeId: link.source, edgeId: link.id })
  }

  for (const [nodeId, neighbors] of adjacency.entries()) {
    neighbors.sort((left, right) => {
      const leftNode = nodeMap.get(left.nodeId)
      const rightNode = nodeMap.get(right.nodeId)
      if (!leftNode || !rightNode) {
        return 0
      }

      const priorityDiff = neighborPriority(leftNode) - neighborPriority(rightNode)
      if (priorityDiff !== 0) {
        return priorityDiff
      }

      return leftNode.label.localeCompare(rightNode.label)
    })
    adjacency.set(nodeId, neighbors)
  }

  return adjacency
}

export const runTraversal = (graph: AcademicGraph, algorithm: TraversalAlgorithm): TraversalResult => {
  const adjacency = buildAdjacency(graph)
  return algorithm === 'bfs' ? runBfs(graph, adjacency) : runDfs(graph, adjacency)
}

const runBfs = (graph: AcademicGraph, adjacency: Map<string, Neighbor[]>): TraversalResult => {
  const start = performance.now()
  const visited = new Set<string>()
  const visitedEdges = new Set<string>()
  const steps: TraversalStep[] = []
  const visitOrder: string[] = []
  const levelMap: Record<string, number> = { [graph.rootNodeId]: 0 }
  const queue: Array<{ nodeId: string; depth: number; viaEdgeId?: string }> = [{ nodeId: graph.rootNodeId, depth: 0 }]
  const frontierSnapshots: string[][] = []
  let maxDepth = 0

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || visited.has(current.nodeId)) {
      continue
    }

    visited.add(current.nodeId)
    visitOrder.push(current.nodeId)
    frontierSnapshots.push(queue.map((item) => item.nodeId))
    maxDepth = Math.max(maxDepth, current.depth)
    steps.push({
      index: steps.length + 1,
      nodeId: current.nodeId,
      depth: current.depth,
      viaEdgeId: current.viaEdgeId,
      phase: 'visit',
      frontier: queue.map((item) => item.nodeId),
      branch: [current.nodeId],
    })

    for (const neighbor of adjacency.get(current.nodeId) ?? []) {
      if (visited.has(neighbor.nodeId) || queue.some((item) => item.nodeId === neighbor.nodeId)) {
        continue
      }

      visitedEdges.add(neighbor.edgeId)
      levelMap[neighbor.nodeId] = current.depth + 1
      queue.push({ nodeId: neighbor.nodeId, depth: current.depth + 1, viaEdgeId: neighbor.edgeId })
      steps.push({
        index: steps.length + 1,
        nodeId: neighbor.nodeId,
        depth: current.depth + 1,
        viaEdgeId: neighbor.edgeId,
        phase: 'enqueue',
        frontier: queue.map((item) => item.nodeId),
        branch: [current.nodeId, neighbor.nodeId],
      })
    }
  }

  const metrics = buildBaseMetrics(
    'bfs',
    graph,
    visitOrder,
    visitedEdges.size,
    maxDepth,
    performance.now() - start,
    [],
    levelMap,
    [],
  )
  metrics.frontierSnapshots = frontierSnapshots

  return {
    algorithm: 'bfs',
    steps,
    visitedNodeIds: visitOrder,
    visitedEdgeIds: [...visitedEdges],
    metrics,
  }
}

const runDfs = (graph: AcademicGraph, adjacency: Map<string, Neighbor[]>): TraversalResult => {
  const start = performance.now()
  const visited = new Set<string>()
  const visitedEdges = new Set<string>()
  const steps: TraversalStep[] = []
  const visitOrder: string[] = []
  const frontierSnapshots: string[][] = []
  const levelMap: Record<string, number> = { [graph.rootNodeId]: 0 }
  const stack: Array<{ nodeId: string; depth: number; viaEdgeId?: string; branch: string[]; stage: 'visit' | 'backtrack' }> = [
    {
      nodeId: graph.rootNodeId,
      depth: 0,
      branch: [graph.rootNodeId],
      stage: 'visit',
    },
  ]
  let maxDepth = 0
  let deepestBranch: string[] = [graph.rootNodeId]

  while (stack.length > 0) {
    frontierSnapshots.push(stack.map((item) => item.nodeId))
    const current = stack.pop()
    if (!current) {
      continue
    }

    if (current.stage === 'backtrack') {
      steps.push({
        index: steps.length + 1,
        nodeId: current.nodeId,
        depth: current.depth,
        viaEdgeId: current.viaEdgeId,
        phase: 'backtrack',
        frontier: stack.map((item) => item.nodeId),
        branch: current.branch,
      })
      continue
    }

    if (visited.has(current.nodeId)) {
      continue
    }

    visited.add(current.nodeId)
    visitOrder.push(current.nodeId)
    maxDepth = Math.max(maxDepth, current.depth)
    if (current.branch.length > deepestBranch.length) {
      deepestBranch = current.branch
    }

    steps.push({
      index: steps.length + 1,
      nodeId: current.nodeId,
      depth: current.depth,
      viaEdgeId: current.viaEdgeId,
      phase: 'visit',
      frontier: stack.map((item) => item.nodeId),
      branch: current.branch,
    })

    const neighbors = (adjacency.get(current.nodeId) ?? []).filter((neighbor) => !visited.has(neighbor.nodeId))
    stack.push({ ...current, stage: 'backtrack' })

    for (let index = neighbors.length - 1; index >= 0; index -= 1) {
      const neighbor = neighbors[index]
      visitedEdges.add(neighbor.edgeId)
      levelMap[neighbor.nodeId] = current.depth + 1
      stack.push({
        nodeId: neighbor.nodeId,
        depth: current.depth + 1,
        viaEdgeId: neighbor.edgeId,
        branch: [...current.branch, neighbor.nodeId],
        stage: 'visit',
      })
    }
  }

  const metrics = buildBaseMetrics(
    'dfs',
    graph,
    visitOrder,
    visitedEdges.size,
    maxDepth,
    performance.now() - start,
    [],
    levelMap,
    deepestBranch,
  )
  metrics.frontierSnapshots = frontierSnapshots

  return {
    algorithm: 'dfs',
    steps,
    visitedNodeIds: visitOrder,
    visitedEdgeIds: [...visitedEdges],
    metrics,
  }
}
