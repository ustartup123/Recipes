import type { Config } from "tailwindcss";

// Each color token resolves to a CSS variable carrying space-separated RGB
// channels. Light defaults live in :root (app/globals.css); dark overrides
// live in :root.dark. Tailwind's `<alpha-value>` slot keeps `bg-foo/50`
// etc. working without any per-component changes.
const rgb = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

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
        surface: {
          50:  rgb("surface-50"),
          100: rgb("surface-100"),
          200: rgb("surface-200"),
          300: rgb("surface-300"),
        },
        brand: {
          300: rgb("brand-300"),
          400: rgb("brand-400"),
          500: rgb("brand-500"),
          600: rgb("brand-600"),
          700: rgb("brand-700"),
        },
        sage: {
          100: rgb("sage-100"),
          200: rgb("sage-200"),
          300: rgb("sage-300"),
          500: rgb("sage-500"),
          600: rgb("sage-600"),
          700: rgb("sage-700"),
        },
        peach: {
          200: rgb("peach-200"),
          300: rgb("peach-300"),
          700: rgb("peach-700"),
        },
        lavender: {
          200: rgb("lavender-200"),
          300: rgb("lavender-300"),
          700: rgb("lavender-700"),
        },
        ink: {
          900: rgb("ink-900"),
          800: rgb("ink-800"),
          700: rgb("ink-700"),
          500: rgb("ink-500"),
          400: rgb("ink-400"),
          300: rgb("ink-300"),
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
        soft: "0 1px 0 rgb(var(--color-shadow-rgb) / 0.04)",
        pop: "0 14px 40px -18px rgb(var(--color-shadow-rgb) / 0.25)",
        hover: "0 20px 50px -20px rgb(var(--color-shadow-rgb) / 0.35)",
        cta: "0 4px 14px -4px rgb(var(--color-cta-shadow-rgb) / 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
