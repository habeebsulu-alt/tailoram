import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDF8F5',
          100: '#FBEFE8',
          200: '#F7DEC4',
          300: '#F0C29A',
          400: '#E4985D',
          500: '#D97706', // Warm Amber / Ochre
          600: '#C25E00', // Terracotta
          700: '#9C4700',
          800: '#7B3706',
          900: '#522506',
        },
        lagos: {
          green: '#008751', // Nigerian Flag Green accent
          gold: '#FFB800',
          dark: '#1C1917',  // Warm Charcoal/Black
          cream: '#FAF7F2', // Warm Ivory background
        }
      },
    },
  },
  plugins: [],
};
export default config;
