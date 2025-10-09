/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  // class-based dark mode (we already toggle .dark on <html>)
  darkMode: "class",

  theme: {
    extend: {
      colors: {
        primary: "#2563eb",   // blue-600
        secondary: "#1e293b", // slate-800
        accent: "#f59e0b",    // amber
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },

  plugins: [
    // ⛔️ Previously this styled ALL inputs/checkboxes globally (causing faint lines + odd checkboxes)
    // ✅ With strategy:'class', it only applies when you add the Tailwind form classes explicitly.
    require("@tailwindcss/forms")({ strategy: "class" }),
    require("@tailwindcss/typography"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
