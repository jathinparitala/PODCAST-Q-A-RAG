/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Primary
          700: '#1d4ed8', // Primary Hover
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0f172a', // Navy Dark
        },
        navy: {
          800: '#1e293b',
          900: '#0f172a',
          950: '#090d16',
        },
        success: {
          light: '#ecfdf5',
          DEFAULT: '#10b981',
          dark: '#047857',
        },
        warning: {
          light: '#fffbe6',
          DEFAULT: '#f59e0b',
          dark: '#b45309',
        },
        danger: {
          light: '#fef2f2',
          DEFAULT: '#ef4444',
          dark: '#b91c1c',
        }
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'md': '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        'lg': '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)',
        'xl': '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
      },
      spacing: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '48': '48px',
        '64': '64px',
      },
      height: {
        'input-default': '48px',
        'input-auth': '56px',
        'btn-default': '44px',
        'btn-auth': '56px',
        'header': '64px',
      },
      width: {
        'sidebar': '300px',
      }
    },
  },
  plugins: [],
}
