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
        brand: {
          DEFAULT: '#E4572E',
          600: '#CF4A22',
          700: '#B03E1C',
          50: '#FBEDE7',
        },
        ink: '#141414',
        star: '#E8A33D',
        stock: '#2F9E68',
        surface: '#F4F4F2',
        tile: '#EFEFED',
      },
      boxShadow: {
        card: '0 22px 45px -20px rgba(0,0,0,0.28)',
        lift: '0 30px 60px -22px rgba(0,0,0,0.35)',
        glow: '0 0 0 3px rgba(228,87,46,0.14), 0 14px 34px -14px rgba(228,87,46,0.45)',
        cta: '0 14px 30px -10px rgba(228,87,46,0.55)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
