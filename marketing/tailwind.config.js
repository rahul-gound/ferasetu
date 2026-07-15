/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ferasetu: {
          orange: '#FF6B35',
          dark: '#060818',
          surface: '#0B0F24',
        },
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'aurora-spin': 'auroraSpin 24s linear infinite',
        'grid-move': 'gridMove 6s linear infinite',
        'float-a': 'floatA 8s ease-in-out infinite',
        'float-b': 'floatB 10s ease-in-out infinite',
        'fade-up': 'fadeSlideUp 0.9s cubic-bezier(0.2,0.8,0.2,1) forwards',
        'icon-float': 'iconFloat 4.5s ease-in-out infinite',
        'shimmer': 'shimmerBtn 3.5s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2s infinite',
        'gradient-shift': 'gradientShift 4s ease infinite',
        'marquee': 'marquee 32s linear infinite',
        'scanline': 'scanline 3s linear infinite',
      },
      keyframes: {
        auroraSpin: { to: { transform: 'rotate(360deg)' } },
        gridMove: { to: { backgroundPosition: '0 56px' } },
        floatA: {
          '0%,100%': { transform: 'translate3d(0,0,40px) rotate(0)' },
          '33%': { transform: 'translate3d(8px,-14px,40px) rotate(2deg)' },
          '66%': { transform: 'translate3d(-6px,-8px,40px) rotate(-1deg)' },
        },
        floatB: {
          '0%,100%': { transform: 'translate3d(0,0,60px) rotate(0)' },
          '50%': { transform: 'translate3d(-12px,-18px,60px) rotate(-2deg)' },
        },
        fadeSlideUp: {
          from: { opacity: '0', transform: 'translateY(32px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        iconFloat: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' },
        },
        shimmerBtn: {
          '0%,60%': { left: '-70%' },
          '100%': { left: '140%' },
        },
        pulseRing: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.5)' },
          '50%': { boxShadow: '0 0 0 8px rgba(16,185,129,0)' },
        },
        gradientShift: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        scanline: {
          '0%': { top: '-8%' },
          '100%': { top: '108%' },
        },
      },
    },
  },
  plugins: [],
};
