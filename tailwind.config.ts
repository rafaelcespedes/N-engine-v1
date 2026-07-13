import type { Config } from "tailwindcss";

/**
 * Neutral, high-contrast studio chrome. The canvas is the star — the UI stays out
 * of the way. Mono type for numeric controls, matching the tool's precision feel.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        panel: "#141414",
        hair: "rgba(255,255,255,0.10)",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["var(--font-body)", "IBM Plex Sans", "system-ui", "sans-serif"],
        display: ["var(--font-headline)", "Bricolage Grotesque", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
