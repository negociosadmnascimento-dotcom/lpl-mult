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
        brand: {
          blue: "#2B2BFF",
          "blue-dark": "#1a1acc",
          "blue-light": "#5555ff",
          "blue-50": "#f0f0ff",
          "blue-100": "#e0e0ff",
          red: "#E53E3E",
          "red-dark": "#c53030",
          "red-light": "#fc8181",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #2B2BFF 0%, #1a1acc 100%)",
        "gradient-dark": "linear-gradient(135deg, #0f0f2e 0%, #1a1a4e 100%)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(43, 43, 255, 0.15)",
        "glass-dark": "0 8px 32px rgba(0, 0, 0, 0.4)",
        premium: "0 4px 24px rgba(43, 43, 255, 0.2)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-in": "slideIn 0.3s ease-out",
        "pulse-slow": "pulse 3s infinite",
        "bounce-slow": "bounce 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { transform: "translateX(-20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
