import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // MARTI blue, sampled from the logo (#1b79c0) and extended into a ramp.
        marti: {
          50: '#eff8ff',
          100: '#dbeefe',
          200: '#bfe2fe',
          300: '#93d0fd',
          400: '#60b5fa',
          500: '#3b97f6',
          600: '#1b79c0',
          700: '#1a629b',
          800: '#1c5380',
          900: '#1d466a',
          950: '#142c46',
        },
        // Warm cream canvas. This is what makes the site feel like a children's
        // school rather than a corporate dashboard.
        cream: {
          50: '#fffdf8',
          100: '#fef8ea',
          200: '#f5ecd3',
          300: '#eeddb4',
          400: '#e4c88a',
          500: '#d9b062',
        },
        sunshine: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        mint: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        },
        coral: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        grape: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#6b46c1',
          700: '#5b21b6',
        },
        ink: {
          50: '#f7f6f3',
          100: '#eeece6',
          200: '#dbd7cc',
          300: '#bdb6a5',
          400: '#9a9079',
          500: '#7d735c',
          600: '#645c49',
          700: '#4f483c',
          800: '#413c33',
          900: '#38342d',
          950: '#211f1a',
        },
      },
      fontFamily: {
        // Rounded, friendly faces. Baloo 2 carries the playful headline voice.
        sans: ['Nunito', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Baloo 2"', 'Nunito', 'system-ui', 'sans-serif'],
        hand: ['"Caveat"', 'cursive'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgb(65 60 51 / 0.08)',
        card: '0 8px 24px -6px rgb(65 60 51 / 0.12)',
        lift: '0 22px 44px -14px rgb(27 121 192 / 0.30)',
        // Chunky offset shadow, the signature of a playful kids UI.
        pop: '0 6px 0 0 rgb(26 98 155 / 1)',
        'pop-sm': '0 4px 0 0 rgb(26 98 155 / 1)',
        'pop-amber': '0 6px 0 0 rgb(180 83 9 / 1)',
        glow: '0 0 0 4px rgb(27 121 192 / 0.15)',
      },
      backgroundImage: {
        'marti-gradient': 'linear-gradient(135deg, #1b79c0 0%, #1a629b 55%, #1d466a 100%)',
        'sun-gradient': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        'cream-fade': 'linear-gradient(180deg, #fef8ea 0%, #fffdf8 100%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.04)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        wiggle: 'wiggle 3s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
        'bounce-in': 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config
