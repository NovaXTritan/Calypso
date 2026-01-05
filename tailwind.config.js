/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['ui-sans-serif','system-ui','Inter','sans-serif'] },
      colors: {
        night:{950:'#06070b',900:'#0b0e16',800:'#101727',700:'#1a2340'},
        brand:{300:'#b2c3ff',400:'#8fa6ff',500:'#667dff',600:'#4659ff'},
        glow:{500:'#ffb36b',600:'#ff9750'}
      },
      boxShadow:{
        glass:'0 0 1px rgba(255,255,255,0.12), 0 8px 30px rgba(0,0,0,0.48)',
        neon:'0 0 24px rgba(102,125,255,0.35)'
      }
    },
  },
  plugins: [],
}
