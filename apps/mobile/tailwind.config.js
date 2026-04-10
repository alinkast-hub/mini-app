/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          dark: '#818cf8',
        },
        secondary: '#f59e0b',
        danger: '#ef4444',
        success: '#22c55e',
      },
    },
  },
  plugins: [],
};
