/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1A1A1A',
        primary: '#EAB308',
        surface: '#2D2D2D',
      }
    },
  },
  plugins: [],
}
