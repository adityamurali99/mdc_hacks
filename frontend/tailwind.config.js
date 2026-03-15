/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      colors: {
        bg: "#07070f",
        surface: "#0e0e1a",
        card: "#12121e",
        border: "#1c1c2e",
        accent: "#e8ff47",
        danger: "#ff4757",
        warning: "#ffaa00",
        safe: "#00e676",
        muted: "#3a3a5c",
        text: "#eeeef5",
        subtle: "#7878a0",
      },
      boxShadow: {
        accent: "0 0 30px rgba(232,255,71,0.15)",
        danger: "0 0 30px rgba(255,71,87,0.15)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
}