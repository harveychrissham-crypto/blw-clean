/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f6f8ff',
          100: '#eef2ff',
          500: '#4f46e5',
          600: '#4338ca',
          700: '#3730a3'
        },
        accent: '#8A2BE2',
        purple: {
          300: '#D8B2FF',
          400: '#A53DFF',
          500: '#8A2BE2',
          600: '#6D13D4'
        },
        pink: {
          300: '#FF9CEA',
          500: '#FF4F9A'
        },
        indigo: {
          500: '#3D5AFE'
        }
      },
      boxShadow: {
        soft: '0 20px 60px rgba(15, 23, 42, 0.14)'
      },
      keyframes: {
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        sheetIn: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'toast-in': 'toastIn 0.2s ease-out',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'sheet-in': 'sheetIn 0.22s ease-out'
      }
    }
  },
  plugins: []
};
