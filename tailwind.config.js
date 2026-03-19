/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        graph: {
          950: '#080914',
          900: '#0d1020',
          800: '#11172a',
          700: '#16213a',
          600: '#1d3560',
          neon: '#4df3ff',
          bfs: '#37d3ff',
          dfs: '#f8a43b',
          paper: '#5aa6ff',
          author: '#45d483',
          venue: '#9c7bff',
          border: 'rgba(121, 133, 197, 0.22)',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(77, 243, 255, 0.14), 0 18px 50px rgba(10, 16, 40, 0.52)',
        bfs: '0 0 35px rgba(55, 211, 255, 0.28)',
        dfs: '0 0 35px rgba(248, 164, 59, 0.28)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(84, 108, 179, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(84, 108, 179, 0.08) 1px, transparent 1px)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      animation: {
        float: 'float 12s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.8s ease-in-out infinite',
        drift: 'drift 24s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(77, 243, 255, 0.1)' },
          '50%': { boxShadow: '0 0 24px rgba(77, 243, 255, 0.3)' },
        },
        drift: {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(-80px, -80px, 0)' },
        },
      },
    },
  },
  plugins: [],
}
