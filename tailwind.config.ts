import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#001A5C",
        "navy-700": "#0A2A75",
        accent: "#0A86CB",
        "accent-600": "#0972b0",
        canvas: "#f4f6fb",
        ink: "#1b2333",
        muted: "#5b6577",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "Poppins", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,26,92,0.04), 0 8px 24px rgba(0,26,92,0.06)",
        cardHover: "0 2px 4px rgba(0,26,92,0.06), 0 12px 32px rgba(0,26,92,0.10)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
