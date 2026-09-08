import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FAF9F6", // warm off-white page
        surface: "#FFFFFF", // cards / raised areas
        ink: "#1D1D1F",
        secondary: "#6E6E73",
        divider: "#E4E2DC",
        hover: "#111111",
        accent: "#C8461E", // terracotta
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      maxWidth: {
        shell: "1400px",
        reading: "820px",
        sidebar: "280px",
      },
      spacing: {
        18: "4.5rem", // 72px
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0, 0, 0.2, 1)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "fade-in": "fade-in 300ms cubic-bezier(0, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
