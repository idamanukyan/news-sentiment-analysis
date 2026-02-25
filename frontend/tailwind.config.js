/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans Armenian', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary brand colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Sidebar colors
        sidebar: {
          bg: '#1A2332',
          hover: '#243044',
          active: '#2D3B50',
          text: '#94A3B8',
          textActive: '#FFFFFF',
        },
        // Sentiment colors
        sentiment: {
          positive: '#16a34a', // green-600 for better contrast
          negative: '#dc2626', // red-600 for better contrast
          neutral: '#4b5563',  // gray-600 for WCAG AA compliance
        },
        // Alert severity colors
        severity: {
          critical: '#dc2626',
          high: '#ea580c',
          medium: '#eab308',
          low: '#22c55e',
        },
        // Political leaning colors
        leaning: {
          government: '#2563eb', // blue-600 for better contrast
          opposition: '#dc2626', // red-600 for better contrast
          independent: '#4b5563', // gray-600 for WCAG AA compliance
          diaspora: '#7c3aed',   // violet-600 for better contrast
        },
      },
    },
  },
  plugins: [],
}
