import type { Config } from 'tailwindcss'

/**
 * Design tokens taken from the reference site's own stylesheet
 * (summercamp.amaujunior.com), so the look matches rather than approximates.
 *
 * The system is neo-brutalist: a warm cream page, deep purple "ink" for all
 * text and borders, 2px solid borders, and hard offset shadows in that same
 * ink. MARTI blue replaces the reference's purple as the primary colour.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // MARTI blue from the logo (#1b79c0), extended into a ramp.
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
        // Warm cream canvas, exactly as the reference uses it.
        cream: {
          DEFAULT: '#fef8ea',
          50: '#fffdf8',
          100: '#fef8ea',
          200: '#f5ecd3',
          300: '#eeddb4',
          400: '#e4c88a',
        },
        // Deep purple. Every piece of text, every border, every hard shadow.
        ink: {
          DEFAULT: '#2d1b4d',
          50: '#f6f4f9',
          100: '#ece7f2',
          200: '#d5cbe3',
          300: '#b3a3cb',
          400: '#8b74ae',
          500: '#6d5493',
          600: '#57407a',
          700: '#453363',
          800: '#382a51',
          900: '#2d1b4d',
          950: '#1d1133',
        },
        grape: { DEFAULT: '#6b46c1', 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#6b46c1', 700: '#5b21b6' },
        teal: { DEFAULT: '#14b8a6', 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
        magenta: { DEFAULT: '#db2777', 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d' },
        amber: { DEFAULT: '#f59e0b', 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
      },
      fontFamily: {
        // The same three faces the reference site loads.
        sans: ['Outfit', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Outfit', 'system-ui', 'sans-serif'],
        hand: ['"Shadows Into Light"', 'cursive'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      boxShadow: {
        // Hard offset shadows in ink. This is the signature of the style.
        pop: '4px 4px 0 0 #2d1b4d',
        'pop-md': '6px 6px 0 0 #2d1b4d',
        'pop-lg': '10px 10px 0 0 #2d1b4d',
        // Pressed state: the element moves toward the shadow, so it shrinks.
        'pop-pressed': '2px 2px 0 0 #2d1b4d',
        'pop-flat': '0 0 0 0 #2d1b4d',
        soft: '0 2px 8px -2px rgb(45 27 77 / 0.10)',
        card: '0 8px 24px -6px rgb(45 27 77 / 0.14)',
      },
      backgroundImage: {
        'marti-gradient': 'linear-gradient(135deg, #1b79c0 0%, #1a629b 55%, #1d466a 100%)',
      },
      keyframes: {
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        wiggle: { '0%, 100%': { transform: 'rotate(-2deg)' }, '50%': { transform: 'rotate(2deg)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        wiggle: 'wiggle 3s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
