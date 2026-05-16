/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { panel: '0 4px 24px rgba(0,0,0,0.35)' },
    },
  },
  plugins: [],
};
