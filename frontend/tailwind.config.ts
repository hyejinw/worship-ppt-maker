import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#111111",
        "bg-sub": "#1a1a1a",
        card: "#222222",
        border: "#333333",
        "text-primary": "#f0f0f0",
        "text-muted": "#888888",
        gold: "#C9A84C",
        "gold-light": "#E8C86A",
        error: "#FF5555",
        success: "#4CAF82",
        "snap-blue": "#4a9eff",
      },
      fontFamily: {
        sans: ["Pretendard", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
