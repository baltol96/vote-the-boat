/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--color-surface)',
          low:     'var(--color-surface-low)',
          high:    'var(--color-surface-high)',
          bright:  'var(--color-surface-bright)',
          lowest:  'var(--color-surface-lowest)',
        },
        primary: {
          DEFAULT:   'var(--color-primary)',
          container: 'var(--color-primary-container)',
          fixed:     'var(--color-primary-fixed)',
        },
        'on-surface':          'var(--color-on-surface)',
        'outline-variant':     'var(--color-outline-variant)',
        'secondary-container': 'var(--color-secondary-container)',
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        inter:   ['Inter', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
