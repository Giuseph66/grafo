import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  'pt-BR': {
    translation: {
      appName: 'ScholarGraph Explorer',
      searchPlaceholder: 'Pesquise por artigo, autor ou venue',
      search: 'Pesquisar',
      clear: 'Limpar',
      run: 'Executar Busca',
      animate: 'Animar Travessia',
      compare: 'Comparar BFS x DFS',
      bfs: 'Busca em Largura (BFS)',
      dfs: 'Busca em Profundidade (DFS)',
      noGraph: 'Selecione um paper e execute a busca para visualizar o subgrafo.',
      recentSearches: 'Buscas recentes',
      details: 'Detalhes',
      metrics: 'Métricas',
      exportJson: 'Exportar JSON',
      exportCsv: 'Exportar CSV',
      saveSession: 'Salvar sessão',
      capture: 'Capturar imagem',
      compareMode: 'Comparativo',
      loading: 'Carregando',
    },
  },
  en: {
    translation: {
      appName: 'ScholarGraph Explorer',
      searchPlaceholder: 'Search by paper, author, or venue',
      search: 'Search',
      clear: 'Clear',
      run: 'Run Search',
      animate: 'Animate Traversal',
      compare: 'Compare BFS x DFS',
      bfs: 'Breadth-First Search (BFS)',
      dfs: 'Depth-First Search (DFS)',
      noGraph: 'Select a paper and run the search to visualize the subgraph.',
      recentSearches: 'Recent searches',
      details: 'Details',
      metrics: 'Metrics',
      exportJson: 'Export JSON',
      exportCsv: 'Export CSV',
      saveSession: 'Save session',
      capture: 'Capture image',
      compareMode: 'Comparison',
      loading: 'Loading',
    },
  },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: 'pt-BR',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export { i18n }
