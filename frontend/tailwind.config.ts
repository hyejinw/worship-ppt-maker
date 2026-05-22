import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#ECF4E8",
        "bg-sub": "#E0EDD9",
        card: "#f5faf3",
        border: "#c8dfc0",
        "text-primary": "#1a2e14",
        "text-muted": "#4a6e42",
        accent: "#3a7d44",
        "accent-light": "#4e9e5a",
        "accent-dim": "rgba(58,125,68,0.12)",
        error: "#dc2626",
        success: "#16a34a",
        "snap-blue": "#3b82f6",
      },
      fontFamily: {
        sans: ["Pretendard", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
