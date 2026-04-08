/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",

    // Your structure
    "./src/components/**/*.{ts,tsx}",
    "./src/components/layout/**/*.{ts,tsx}",
    "./src/components/screens/**/*.{ts,tsx}",
    "./src/components/map/**/*.{ts,tsx}",

    "./src/shared/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {},
  },

  plugins: [],
};
