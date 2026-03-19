import type { TraversalComparison, TraversalResult } from '../types/domain'

const percentDiff = (first: number, second: number) => {
  if (first === 0 && second === 0) {
    return 0
  }
  const baseline = Math.max(first, second, 1)
  return Math.abs(first - second) / baseline * 100
}

const winner = (bfsValue: number, dfsValue: number, comparator: 'higher' | 'lower') => {
  if (bfsValue === dfsValue) {
    return 'tie'
  }

  if (comparator === 'higher') {
    return bfsValue > dfsValue ? 'bfs' : 'dfs'
  }

  return bfsValue < dfsValue ? 'bfs' : 'dfs'
}

export const compareTraversals = (bfs: TraversalResult, dfs: TraversalResult): TraversalComparison => {
  const bfsSet = new Set(bfs.visitedNodeIds)
  const dfsSet = new Set(dfs.visitedNodeIds)
  const sharedNodeIds = bfs.visitedNodeIds.filter((nodeId) => dfsSet.has(nodeId))
  const onlyBfsNodeIds = bfs.visitedNodeIds.filter((nodeId) => !dfsSet.has(nodeId))
  const onlyDfsNodeIds = dfs.visitedNodeIds.filter((nodeId) => !bfsSet.has(nodeId))
  const maxLength = Math.max(bfs.metrics.visitOrder.length, dfs.metrics.visitOrder.length)

  let orderDifferenceCount = 0
  for (let index = 0; index < maxLength; index += 1) {
    if (bfs.metrics.visitOrder[index] !== dfs.metrics.visitOrder[index]) {
      orderDifferenceCount += 1
    }
  }

  return {
    sharedNodeIds,
    onlyBfsNodeIds,
    onlyDfsNodeIds,
    fasterAlgorithm: winner(bfs.metrics.searchTimeMs, dfs.metrics.searchTimeMs, 'lower'),
    broaderAlgorithm: winner(bfs.metrics.nodesVisited, dfs.metrics.nodesVisited, 'higher'),
    deeperAlgorithm: winner(bfs.metrics.depthReached, dfs.metrics.depthReached, 'higher'),
    lighterApiAlgorithm: winner(bfs.metrics.apiRequests, dfs.metrics.apiRequests, 'lower'),
    orderDifferenceCount,
    percentDiffs: {
      time: percentDiff(bfs.metrics.searchTimeMs, dfs.metrics.searchTimeMs),
      nodes: percentDiff(bfs.metrics.nodesVisited, dfs.metrics.nodesVisited),
      requests: percentDiff(bfs.metrics.apiRequests, dfs.metrics.apiRequests),
    },
  }
}
