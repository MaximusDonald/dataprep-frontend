export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A5F',
          mid: '#2E6DA4',
        },
        accent: '#E8A838',
        critical: '#DC2626',
        warning: '#D97706',
        success: '#16A34A',
        background: '#f8fafc',
        foreground: '#0f172a',
        muted: '#f1f5f9',
        'muted-foreground': '#64748b',
        border: '#e2e8f0'
      },
    },
  },
  plugins: [],
}
