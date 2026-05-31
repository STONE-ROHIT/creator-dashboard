/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#09090f',
          surface: '#11111a',
          card: '#171722',
          hover: '#1d1d2d',
        },
        brand: {
          DEFAULT: '#f59e0b',
          hover: '#fbbf24',
          dim: 'rgba(245,158,11,0.1)',
        },
        ink: {
          primary: '#eae7f5',
          muted: '#7e7b99',
          dim: '#45435a',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.07)',
        strong: 'rgba(255,255,255,0.14)',
      },
    },
  },
  plugins: [],
};
