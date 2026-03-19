import {
  mockAuthorMap,
  mockAuthors,
  mockPaperMap,
  mockPapers,
  mockVenueMap,
  mockVenues,
} from '../../mocks/scholarData'
import type {
  AcademicGraph,
  AuthorNode,
  GraphBuildOptions,
  GraphLink,
  GraphNode,
  PaperNode,
  ScholarDataProvider,
  SearchQuery,
  SearchResult,
  VenueNode,
} from '../../types/domain'

const linkId = (source: string, target: string, type: string) => `${source}_${type}_${target}`

const estimateImportance = (citationCount: number, referenceCount: number) =>
  24 + Math.min(36, Math.round(Math.sqrt(citationCount + referenceCount)))

const normalizeText = (value: string) => value.trim().toLowerCase()

const includesText = (value: string, query: string) => normalizeText(value).includes(normalizeText(query))

const toPaperNode = (paperId: string): PaperNode => {
  const paper = mockPaperMap[paperId]
  return {
    id: paper.paperId,
    type: 'paper',
    paperId: paper.paperId,
    label: paper.title,
    title: paper.title,
    year: paper.year,
    venue: paper.venue,
    citationCount: paper.citationCount,
    referenceCount: paper.referenceCount,
    abstract: paper.abstract,
    url: paper.url,
    importance: estimateImportance(paper.citationCount, paper.referenceCount),
  }
}

const toAuthorNode = (authorId: string): AuthorNode => {
  const author = mockAuthorMap[authorId]
  return {
    id: author.authorId,
    type: 'author',
    authorId: author.authorId,
    label: author.name,
    name: author.name,
    hIndex: author.hIndex,
    paperCount: author.paperCount,
    citationCount: author.citationCount,
    importance: 20 + Math.min(26, author.hIndex),
  }
}

const toVenueNode = (venueId: string): VenueNode => {
  const venue = mockVenueMap[venueId]
  return {
    id: venue.venueId,
    type: 'venue',
    venueId: venue.venueId,
    label: venue.name,
    name: venue.name,
    venueType: venue.type,
    paperCount: venue.paperIds.length,
    importance: 26 + venue.paperIds.length * 3,
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class MockScholarProvider implements ScholarDataProvider {
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const term = normalizeText(query.term)
    if (!term) {
      return []
    }

    await delay(180)

    if (query.entityType === 'paper') {
      return mockPapers
        .filter((paper) => includesText(paper.title, term) || includesText(paper.paperId, term))
        .slice(0, 8)
        .map((paper) => ({
          id: paper.paperId,
          type: 'paper',
          label: paper.title,
          subtitle: `${paper.venue} • ${paper.year}`,
          description: `${paper.citationCount} citações • ${paper.referenceCount} referências`,
          paperId: paper.paperId,
          relatedPaperIds: [paper.paperId],
        }))
    }

    if (query.entityType === 'author') {
      return mockAuthors
        .filter((author) => includesText(author.name, term))
        .slice(0, 8)
        .map((author) => ({
          id: author.authorId,
          type: 'author',
          label: author.name,
          subtitle: `h-index ${author.hIndex} • ${author.paperCount} papers`,
          description: `${author.citationCount} citações totais`,
          authorId: author.authorId,
          relatedPaperIds: author.paperIds,
        }))
    }

    return mockVenues
      .filter((venue) => includesText(venue.name, term))
      .slice(0, 8)
      .map((venue) => ({
        id: venue.venueId,
        type: 'venue',
        label: venue.name,
        subtitle: `${venue.type} • ${venue.paperIds.length} papers`,
        description: `Fonte mockada pronta para Semantic Scholar`,
        venueId: venue.venueId,
        relatedPaperIds: venue.paperIds,
      }))
  }

  async getPaperById(paperId: string) {
    await delay(80)
    return mockPaperMap[paperId] ?? null
  }

  async buildSubgraph(paperId: string, options: GraphBuildOptions): Promise<AcademicGraph> {
    await delay(220)

    const rootPaper = mockPaperMap[paperId]
    if (!rootPaper) {
      throw new Error('Paper raiz não encontrado no dataset mockado.')
    }

    const nodes = new Map<string, GraphNode>()
    const links = new Map<string, GraphLink>()
    const paperQueue: Array<{ paperId: string; depth: number }> = [{ paperId, depth: 0 }]
    const expandedPapers = new Set<string>()
    let requests = 0
    let payloadBytes = 0
    let truncated = false
    let achievedDepth = 0

    const tryAddNode = (node: GraphNode) => {
      if (nodes.has(node.id)) {
        return true
      }

      if (nodes.size >= options.maxNodes) {
        truncated = true
        return false
      }

      nodes.set(node.id, node)
      return true
    }

    const tryAddLink = (link: GraphLink) => {
      if (nodes.has(link.source) && nodes.has(link.target)) {
        links.set(link.id, link)
      }
    }

    while (paperQueue.length > 0 && !truncated) {
      const current = paperQueue.shift()
      if (!current) {
        break
      }

      if (expandedPapers.has(current.paperId)) {
        continue
      }

      const paper = mockPaperMap[current.paperId]
      if (!paper) {
        continue
      }

      requests += 1
      payloadBytes += JSON.stringify(paper).length
      achievedDepth = Math.max(achievedDepth, current.depth)
      expandedPapers.add(current.paperId)

      if (!tryAddNode(toPaperNode(paper.paperId))) {
        break
      }

      if (options.includeAuthors) {
        for (const authorId of paper.authorIds) {
          const authorNode = toAuthorNode(authorId)
          if (!tryAddNode(authorNode)) {
            break
          }
          tryAddLink({
            id: linkId(authorId, paper.paperId, 'WROTE'),
            source: authorId,
            target: paper.paperId,
            type: 'WROTE',
            label: 'Escreveu',
          })
          tryAddLink({
            id: linkId(paper.paperId, authorId, 'HAS_AUTHOR'),
            source: paper.paperId,
            target: authorId,
            type: 'HAS_AUTHOR',
            label: 'Possui autor',
          })
        }
      }

      if (options.includeVenues) {
        const venueNode = toVenueNode(paper.venueId)
        if (tryAddNode(venueNode)) {
          tryAddLink({
            id: linkId(paper.paperId, paper.venueId, 'PUBLISHED_IN'),
            source: paper.paperId,
            target: paper.venueId,
            type: 'PUBLISHED_IN',
            label: 'Publicado em',
          })
        }
      }

      if (current.depth >= options.maxDepth) {
        continue
      }

      if (options.includeReferences) {
        for (const referenceId of paper.references) {
          const referencePaper = mockPaperMap[referenceId]
          if (!referencePaper) {
            continue
          }

          if (tryAddNode(toPaperNode(referencePaper.paperId))) {
            tryAddLink({
              id: linkId(paper.paperId, referencePaper.paperId, 'REFERENCES'),
              source: paper.paperId,
              target: referencePaper.paperId,
              type: 'REFERENCES',
              label: 'Referencia',
            })
            if (!expandedPapers.has(referencePaper.paperId)) {
              paperQueue.push({ paperId: referencePaper.paperId, depth: current.depth + 1 })
            }
          }
        }
      }

      if (options.includeCitations) {
        for (const citationId of paper.citations) {
          const citationPaper = mockPaperMap[citationId]
          if (!citationPaper) {
            continue
          }

          if (tryAddNode(toPaperNode(citationPaper.paperId))) {
            tryAddLink({
              id: linkId(citationPaper.paperId, paper.paperId, 'CITES'),
              source: citationPaper.paperId,
              target: paper.paperId,
              type: 'CITES',
              label: 'Cita',
            })
            if (!expandedPapers.has(citationPaper.paperId)) {
              paperQueue.push({ paperId: citationPaper.paperId, depth: current.depth + 1 })
            }
          }
        }
      }
    }

    return {
      nodes: [...nodes.values()],
      links: [...links.values()],
      rootNodeId: paperId,
      metadata: {
        requests,
        payloadBytes,
        truncated,
        buildDepth: achievedDepth,
        maxNodes: options.maxNodes,
        source: 'mock',
      },
    }
  }
}

export const mockScholarProvider = new MockScholarProvider()
