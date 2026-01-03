import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: '#7A5AF5',
        secondary: '#4A90E2',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          '0%': { transform: 'scale(1) translate(0, 0)' },
          '50%': { transform: 'scale(1.2) translate(2%, 3%)' },
          '100%': { transform: 'scale(1.1) translate(-2%, -2%)' },
        },
        scanLine: {
          '0%': { top: '0', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        pulseWaves: {
          '0%': { transform: 'scale(0.5)', opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out forwards',
        reveal: 'reveal 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards',
        drift: 'drift 20s linear infinite alternate',
        scanLine: 'scanLine 2s linear infinite',
        pulseWaves: 'pulseWaves 2s infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;