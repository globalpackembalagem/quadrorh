/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FFF5EC',
          100: '#FFE8D0',
          200: '#FFD0A3',
          300: '#FFB06B',
          400: '#FF8C32',
          500: '#FF6B00',
          600: '#E05A00',
          700: '#B84A00',
          800: '#8F3A00',
          900: '#6B2C00',
        },
        neutral: {
          0:   '#FFFFFF',
          50:  '#FAFAF9',
          100: '#F5F4F2',
          200: '#ECEAE7',
          300: '#D6D3CE',
          400: '#B0ACA5',
          500: '#8A8580',
          600: '#605C58',
          700: '#3D3A37',
          800: '#252320',
          900: '#141210',
          950: '#0A0908',
        },
        success: { DEFAULT: '#22C55E', light: '#DCFCE7', dark: '#15803D' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7', dark: '#B45309' },
        error:   { DEFAULT: '#EF4444', light: '#FEE2E2', dark: '#B91C1C' },
        info:    { DEFAULT: '#3B82F6', light: '#DBEAFE', dark: '#1D4ED8' },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sm':  '6px',
        DEFAULT: '10px',
        'md':  '12px',
        'lg':  '16px',
        'xl':  '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'pulse-brand': 'pulseBrand 2s ease-in-out infinite',
        'counter': 'counter 1s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseBrand: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 107, 0, 0.3)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255, 107, 0, 0)' },
        },
      },
    },
  },
  plugins: [],
};
