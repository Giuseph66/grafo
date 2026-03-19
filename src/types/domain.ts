export type EntityType = 'paper' | 'author' | 'venue'
export type SearchEntityType = EntityType
export type RelationType = 'CITES' | 'REFERENCES' | 'HAS_AUTHOR' | 'WROTE' | 'PUBLISHED_IN'
export type TraversalAlgorithm = 'bfs' | 'dfs'
export type LayoutMode = 'force' | 'radial' | 'hierarchical'
export type DisplayMode = 'normal' | 'animated' | 'compare'

export interface PaperRecord {
  paperId: string
  title: string
  year: number
  venueId: string
  venue: string
  citationCount: number
  referenceCount: number
  abstract: string
  url: string
  authorIds: string[]
  references: string[]
  citations: string[]
}

export interface AuthorRecord {
  authorId: string
  name: string
  hIndex: number
  paperCount: number
  citationCount: number
  paperIds: string[]
}

export interface VenueRecord {
  venueId: string
  name: string
  type: string
  paperIds: string[]
}

export interface GraphNodeBase {
  id: string
  type: EntityType
  label: string
  importance: number
}

export interface PaperNode extends GraphNodeBase {
  type: 'paper'
  paperId: string
  title: string
  year: number
  venue: string
  citationCount: number
  referenceCount: number
  abstract: string
  url: string
}

export interface AuthorNode extends GraphNodeBase {
  type: 'author'
  authorId: string
  name: string
  hIndex: number
  paperCount: number
  citationCount: number
}

export interface VenueNode extends GraphNodeBase {
  type: 'venue'
  venueId: string
  name: string
  venueType: string
  paperCount: number
}

export type GraphNode = PaperNode | AuthorNode | VenueNode

export interface GraphLink {
  id: string
  source: string
  target: string
  type: RelationType
  label: string
}

export interface AcademicGraph {
  nodes: GraphNode[]
  links: GraphLink[]
  rootNodeId: string
  metadata: {
    requests: number
    payloadBytes: number
    truncated: boolean
    buildDepth: number
    maxNodes: number
    source: 'mock'
  }
}

export interface SearchQuery {
  term: string
  entityType: SearchEntityType
}

export interface SearchResult {
  id: string
  type: EntityType
  label: string
  subtitle: string
  description: string
  paperId?: string
  authorId?: string
  venueId?: string
  relatedPaperIds: string[]
}

export interface GraphBuildOptions {
  maxDepth: number
  maxNodes: number
  includeAuthors: boolean
  includeVenues: boolean
  includeReferences: boolean
  includeCitations: boolean
}

export interface TraversalStep {
  index: number
  nodeId: string
  depth: number
  viaEdgeId?: string
  phase: 'visit' | 'enqueue' | 'backtrack'
  frontier: string[]
  branch: string[]
}

export interface TraversalMetrics {
  algorithm: TraversalAlgorithm
  searchTimeMs: number
  renderTimeMs: number
  nodesVisited: number
  edgesTraversed: number
  depthReached: number
  apiRequests: number
  payloadBytes: number
  computationalCostScore: number
  apiLimitUsagePercent: number
  complexity: 'O(V + E)'
  visitOrder: string[]
  rootNodeId: string
  lastVisitedNodeId: string | null
  status: 'idle' | 'completed' | 'truncated' | 'error'
  errors: string[]
  frontierSnapshots: string[][]
  levelMap: Record<string, number>
  deepestBranch: string[]
}

export interface TraversalResult {
  algorithm: TraversalAlgorithm
  steps: TraversalStep[]
  visitedNodeIds: string[]
  visitedEdgeIds: string[]
  metrics: TraversalMetrics
}

export interface TraversalComparison {
  sharedNodeIds: string[]
  onlyBfsNodeIds: string[]
  onlyDfsNodeIds: string[]
  fasterAlgorithm: TraversalAlgorithm | 'tie'
  broaderAlgorithm: TraversalAlgorithm | 'tie'
  deeperAlgorithm: TraversalAlgorithm | 'tie'
  lighterApiAlgorithm: TraversalAlgorithm | 'tie'
  orderDifferenceCount: number
  percentDiffs: {
    time: number
    nodes: number
    requests: number
  }
}

export interface GraphFilters {
  showPapers: boolean
  showAuthors: boolean
  showVenues: boolean
  yearRange: [number, number]
  citationRange: [number, number]
}

export interface ExplorerSession {
  query: string
  entityType: SearchEntityType
  rootPaperId: string | null
  selectedAlgorithms: Record<TraversalAlgorithm, boolean>
  buildOptions: GraphBuildOptions
  layoutMode: LayoutMode
  displayMode: DisplayMode
  filters: GraphFilters
  savedAt: string
}

export interface NodeDetailsPayload {
  node: GraphNode
  connectedLinks: GraphLink[]
  connectedNodes: GraphNode[]
}

export interface ScholarDataProvider {
  search(query: SearchQuery): Promise<SearchResult[]>
  getPaperById(paperId: string): Promise<PaperRecord | null>
  buildSubgraph(paperId: string, options: GraphBuildOptions): Promise<AcademicGraph>
}
