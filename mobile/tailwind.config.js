/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./providers/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary:  "#1A3C2B",
        surface:  "#FAF6EE",
        accent:   "#D4A017",
        alert:    "#C1440E",
        sage:     "#8FA98C",
        charcoal: "#1C1C1E",
        border:   "#D9E8E0",
        card:     "#FFFFFF",
        muted:    "#6B7C74",
      },
      fontFamily: {
        sans: ["Satoshi-Regular", "System"],
      },
    },
  },
  plugins: [],
};
