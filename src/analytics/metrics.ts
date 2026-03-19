import type { AcademicGraph, TraversalAlgorithm, TraversalMetrics } from '../types/domain'

export const computeComputationalCost = (nodesVisited: number, edgesTraversed: number, depthReached: number, timeMs: number) =>
  Math.round(nodesVisited * 1.5 + edgesTraversed * 1.2 + depthReached * 12 + timeMs * 0.35)

export const buildBaseMetrics = (
  algorithm: TraversalAlgorithm,
  graph: AcademicGraph,
  visitOrder: string[],
  edgesTraversed: number,
  depthReached: number,
  searchTimeMs: number,
  errors: string[] = [],
  levelMap: Record<string, number> = {},
  deepestBranch: string[] = [],
): TraversalMetrics => ({
  algorithm,
  searchTimeMs,
  renderTimeMs: 0,
  nodesVisited: visitOrder.length,
  edgesTraversed,
  depthReached,
  apiRequests: graph.metadata.requests,
  payloadBytes: graph.metadata.payloadBytes,
  computationalCostScore: computeComputationalCost(visitOrder.length, edgesTraversed, depthReached, searchTimeMs),
  apiLimitUsagePercent: (graph.metadata.requests / 100) * 100,
  complexity: 'O(V + E)',
  visitOrder,
  rootNodeId: graph.rootNodeId,
  lastVisitedNodeId: visitOrder.at(-1) ?? null,
  status: errors.length > 0 ? 'error' : graph.metadata.truncated ? 'truncated' : 'completed',
  errors,
  frontierSnapshots: [],
  levelMap,
  deepestBranch,
})
