import type { AcademicGraph } from '../types/domain'

const downloadFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const exportGraphAsJson = (graph: AcademicGraph) => {
  downloadFile(
    `scholargraph-${graph.rootNodeId}.json`,
    JSON.stringify({ nodes: graph.nodes, links: graph.links }, null, 2),
    'application/json',
  )
}

export const exportGraphAsCsv = (graph: AcademicGraph) => {
  const nodeRows = graph.nodes.map((node) => `${node.id},${node.type},"${node.label.replaceAll('"', '""')}"`)
  const linkRows = graph.links.map((link) => `${link.id},${link.source},${link.target},${link.type}`)
  const content = [
    'section,id,type_or_source,target_or_type,label',
    ...nodeRows.map((row) => `node,${row}`),
    ...linkRows.map((row) => `link,${row}`),
  ].join('\n')

  downloadFile(`scholargraph-${graph.rootNodeId}.csv`, content, 'text/csv;charset=utf-8;')
}
