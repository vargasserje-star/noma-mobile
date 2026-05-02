/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        moss: "#0D7655",
        ink: "#101111",
        stone: "#f3efe8",
        clay: "#b85d38",
        gold: "#c89b3c",
        mist: "#DFD2C9",
        orange: "#FF6A00",
        beige: "#f5f0ea",
      },
    },
  },
  plugins: [],
};
