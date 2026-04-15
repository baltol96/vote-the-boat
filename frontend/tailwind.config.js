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
        'on-surface-muted':    'var(--color-on-surface-muted)',
        'outline-variant':     'var(--color-outline-variant)',
        'secondary-container': 'var(--color-secondary-container)',
        success:               'var(--color-success)',
        warning:               'var(--color-warning)',
        error:                 'var(--color-error)',
        info:                  'var(--color-info)',
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
