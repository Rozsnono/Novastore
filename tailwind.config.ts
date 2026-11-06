import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          accent: '#6366f1',
          accentHover: '#4f46e5',
        },
        // --- Admin felület (Karmazsin, sötét-piros) témájának tokenjei ---
        // surface: oldal/kártya háttér; ink: meleg szürkeskála szövegekhez; acc: piros akcent.
        surface: { DEFAULT: '#0f0e0e', side: '#151313', card: '#1a1717', line: '#272222', field: '#242020' },
        ink: {
          100: '#f1ecec', 200: '#ddd6d6', 300: '#b9b0b0', 400: '#8f8686',
          500: '#6e6666', 600: '#4a4444', 700: '#333030', 800: '#272222', 900: '#1a1717',
        },
        acc: {
          300: '#ff9a9c', 400: '#f0585b', 500: '#e5383b', 600: '#c92a2d',
          700: '#a61f22', 800: '#5a1d1f', 900: '#331618',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
