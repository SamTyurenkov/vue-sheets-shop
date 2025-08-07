/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    // screens: {
    //   'sm': '640px',
    //   'md': '700px',
    //   'lg': '1024px',
    //   'xl': '1280px',
    //   '2xl': '1536px',
    // },
    extend: {
      // fontFamily: {
      //   "poppins": "poppins"
      // }
      fontFamily: {
        custom: ['Lato', 'sans-serif'], // Match this with the font-family name in @font-face
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
    // ...
  ]
}