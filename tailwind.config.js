/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // fontFamily: {
      //   "poppins": "poppins"
      // }
      fontFamily: {
        custom: ['CustomFont', 'sans-serif'], // Match this with the font-family name in @font-face
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
    // ...
  ]
}