import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Blush-based surfaces
        surface: {
          50:  "#ffffff",
          100: "#faf6f3", // blush (body bg)
          200: "#f0e9e2", // deep blush
          300: "#e8dfd6", // rule / hairline
        },
        // Warm orange primary
        brand: {
          300: "#f0a46a",
          400: "#ec8c48",
          500: "#e07a33",
          600: "#c86825",
          700: "#a05618",
        },
        // Sage secondary
        sage: {
          100: "#eef2eb",
          200: "#dfe7db",
          300: "#c6d3c0",
          500: "#8fa78c",
          600: "#718d6e",
          700: "#55705a",
        },
        // Accent tag colors
        peach: {
          200: "#ffe3cc",
          300: "#ffd6b5",
          700: "#8a4a18",
        },
        lavender: {
          200: "#e5dff5",
          300: "#d9d0f0",
          700: "#4b3d82",
        },
        // Navy ink
        ink: {
          900: "#1a2332",
          800: "#2a3545",
          700: "#5a6472",
          500: "#9aa4b2",
          400: "#b6bec8",
          300: "#d3d8df",
        },
      },
      fontFamily: {
        heading: ["var(--font-rubik)", "var(--font-dm-sans)", "system-ui", "sans-serif"],
        body: ["var(--font-rubik)", "system-ui", "sans-serif"],
        display: ["var(--font-dm-sans)", "var(--font-rubik)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        soft: "0 1px 0 rgba(26, 35, 50, 0.04)",
        pop: "0 14px 40px -18px rgba(26, 35, 50, 0.25)",
        hover: "0 20px 50px -20px rgba(26, 35, 50, 0.35)",
        cta: "0 4px 14px -4px rgba(224, 122, 51, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
