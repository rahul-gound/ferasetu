/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0052FF",
        secondary: "#4D7CFF",
        sovereign: {
          DEFAULT: "#0052FF",
          50: "#EEF4FF",
          100: "#E0EBFF",
          500: "#0052FF",
          600: "#0047E0",
          700: "#003BBF",
          glow: "rgba(0, 82, 255, 0.15)",
        },
        surface: {
          DEFAULT: '#F4F4F2',
          dark: '#0A0F1D',         // Deep Navy
          darkElevated: '#111827', // Elevated Slate
          light: '#F8FAFC',        // Alabaster Canvas
          card: '#FFFFFF',         // Pure Card Surface
        },
        saffron: {
          DEFAULT: '#FF6B00',      // Saffron Orange
          50: '#FFF7ED',
          100: '#FFEDD5',
          500: '#FF6B00',
          600: '#EA580C',
        },
        gold: {
          DEFAULT: '#F59E0B',      // Warm Gold
          50: '#FEFCE8',
          100: '#FEF9C3',
          500: '#F59E0B',
          600: '#D97706',
        },
        settlement: {
          DEFAULT: '#10B981',      // Direct Settlement Emerald
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
        },
        brand: {
          DEFAULT: '#0052FF',
          orange: '#FF6B00',
          600: '#0047E0',
          700: '#003BBF',
          50: '#EEF4FF',
        },
        ink: '#0A0F1D',
        star: '#F59E0B',
        stock: '#10B981',
        tile: '#F8FAFC',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.025em',
        tighter: '-0.02em',
        tight: '-0.015em',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        ambient: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 4px 12px 0 rgba(0, 0, 0, 0.04)',
        'ambient-md': '0 2px 4px 0 rgba(0, 0, 0, 0.03), 0 8px 24px -4px rgba(0, 0, 0, 0.06)',
        'ambient-lg': '0 4px 8px 0 rgba(0, 0, 0, 0.03), 0 16px 36px -6px rgba(0, 0, 0, 0.08)',
        'glow-sovereign': '0 0 0 1px rgba(0, 82, 255, 0.15), 0 8px 25px -5px rgba(0, 82, 255, 0.2)',
        'glow-gold': '0 0 0 1px rgba(245, 158, 11, 0.2), 0 8px 25px -5px rgba(245, 158, 11, 0.25)',
        'glow-ai': '0 0 20px -2px rgba(0, 82, 255, 0.3), 0 0 35px -5px rgba(245, 158, 11, 0.25)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}
