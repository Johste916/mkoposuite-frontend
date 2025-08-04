/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  // ✅ Enable class-based dark mode
  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        primary: '#2563eb', // Tailwind blue-600
        secondary: '#1e293b', // Tailwind slate-800
        accent: '#f59e0b',    // Amber for highlights
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
    },
  },

  plugins: [
    require('@tailwindcss/forms'),        // ✍️ Better form styles
    require('@tailwindcss/typography'),   // 📝 Prose formatting
    require('@tailwindcss/aspect-ratio'), // 📐 Responsive images/videos
  ],
};
