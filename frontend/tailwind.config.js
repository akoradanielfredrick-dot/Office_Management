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
          50: '#f4f7e6',
          100: '#e7edd0',
          200: '#d1dca7',
          300: '#bac97a',
          400: '#9daf40',
          500: '#6F8205',
          600: '#617103',
          700: '#526004',
          800: '#445004',
          900: '#384203',
          950: '#202702',
        },
        accent: {
          50: '#fff7e5',
          100: '#ffedbf',
          200: '#ffe099',
          300: '#ffd066',
          400: '#ffbc2e',
          500: '#FFA203',
          600: '#e58d00',
          700: '#bf7400',
          800: '#995b00',
          900: '#7a4800',
          950: '#452700',
        },
        brand: {
          primary: '#6F8205',
          accent: '#FFA203',
          surface: '#FFFFFF',
          ink: '#1f2910',
          muted: '#5f6b4a',
          border: '#d9dfc8',
          soft: '#f7f8f2',
          sidebar: '#445004',
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
