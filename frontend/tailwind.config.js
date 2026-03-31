/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f0',
          100: '#d9f0d9',
          200: '#a8d8a8',
          300: '#72bc72',
          400: '#4a9d4a',
          500: '#2d7d2d',
          600: '#1e5e1e',
          700: '#1a4a1a',
          800: '#153d15',
          900: '#0f2d0f',
          950: '#081a08',
        },
        accent: {
          50: '#fef8ed',
          100: '#fdefd0',
          200: '#fbdba0',
          300: '#f8c065',
          400: '#f5a63a',
          500: '#d4831a',
          600: '#b86a10',
          700: '#98520e',
          800: '#7a3f10',
          900: '#5e3010',
          950: '#331805',
        }
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
