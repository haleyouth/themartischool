import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // MARTI blue, sampled from the logo (#1B79C0) and extended into a ramp.
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
        // Turkish flag red, used sparingly for accents and cultural motifs.
        crimson: {
          50: '#fef2f3',
          100: '#fde3e5',
          200: '#fbccd1',
          300: '#f7a8b0',
          400: '#f17787',
          500: '#e74c60',
          600: '#e30a17',
          700: '#b81420',
          800: '#99141f',
          900: '#83161f',
          950: '#49060c',
        },
        gold: {
          50: '#fefbec',
          100: '#fbf3ca',
          200: '#f7e590',
          300: '#f3d156',
          400: '#efbd2f',
          500: '#e89e17',
          600: '#cd7a11',
          700: '#aa5812',
          800: '#8a4515',
          900: '#723a15',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae3',
          300: '#b0bacb',
          400: '#8595ae',
          500: '#667794',
          600: '#51607a',
          700: '#424e63',
          800: '#3a4353',
          900: '#343b47',
          950: '#22272f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        card: '0 4px 16px -2px rgb(16 24 40 / 0.08), 0 2px 6px -2px rgb(16 24 40 / 0.05)',
        lift: '0 20px 40px -12px rgb(27 121 192 / 0.22)',
        glow: '0 0 0 4px rgb(27 121 192 / 0.12)',
      },
      backgroundImage: {
        'marti-gradient': 'linear-gradient(135deg, #1b79c0 0%, #1a629b 50%, #1d466a 100%)',
        'marti-soft': 'linear-gradient(135deg, #eff8ff 0%, #dbeefe 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite',
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
