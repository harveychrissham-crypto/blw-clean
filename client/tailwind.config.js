/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F8FAFC',
          100: '#EFF6FF',
          500: '#1D9BF0',
          600: '#1A8CD8',
          700: '#1A8CD8'
        },
        accent: '#1D9BF0',
        ink: {
          900: '#0B0F14',
          950: '#0B0F14'
        },
        indigo: {
          500: '#3D5AFE'
        },
        gold: {
          500: '#F2A31C'
        },
        ink: {
          900: '#0d0c18',
          950: '#08070f'
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
