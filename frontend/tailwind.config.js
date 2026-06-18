module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "App.tsx"
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0B0F19',
          card: '#161F30',
          border: '#23334B',
          accent: '#38BDF8',
          bullish: '#10B981',
          bearish: '#EF4444',
          neutral: '#6B7280'
        }
      }
    },
  },
  plugins: [],
}
