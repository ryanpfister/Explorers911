/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "ring-shake": "ring-shake 0.4s ease-in-out infinite",
        "pulse-slow": "pulse 2s ease-in-out infinite",
      },
      keyframes: {
        "ring-shake": {
          "0%, 100%": { transform: "rotate(-8deg)" },
          "50%": { transform: "rotate(8deg)" },
        },
      },
    },
  },
  plugins: [],
};
