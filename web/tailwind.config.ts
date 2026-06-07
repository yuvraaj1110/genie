import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0b",
        panel: "#0f0f11",
        line: "#232327",
        line2: "#2a2a30",
        fg: "#f4f4f5",
        muted: "#a1a1aa",
        faint: "#71717a",
        ph: "#5b5b63",
        gold: "#8a6d3b",
        goldline: "#3a2f1c",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        deva: ["var(--font-deva)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
