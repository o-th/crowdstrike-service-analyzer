/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0066cc',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#000000',
        },
      },
    },
  },
  plugins: [],
}
