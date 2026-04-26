import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#20253A",
        mist: "#F4F8FF",
        line: "#D8E4FF",
        brand: {
          50: "#EEF5FF",
          100: "#DDEBFF",
          300: "#8CB6FF",
          500: "#3B82F6",
          600: "#2B67D3",
          700: "#234DA3",
        },
        aqua: "#56C7D9",
        coral: "#FF8F6B",
        gold: "#F2B94B",
      },
      boxShadow: {
        panel: "0 18px 40px rgba(61, 104, 191, 0.14)",
        soft: "0 10px 30px rgba(53, 86, 150, 0.08)",
      },
      fontFamily: {
        sans: ["PingFang SC", "Microsoft YaHei", "Noto Sans SC", "sans-serif"],
      },
      backgroundImage: {
        "soft-grid":
          "linear-gradient(rgba(141, 179, 255, 0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(141, 179, 255, 0.13) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
