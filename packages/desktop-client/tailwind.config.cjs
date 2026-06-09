// FINANCE FORK: Tailwind for the obsidian dashboard. Preflight is OFF —
// Actual is an inline-style codebase and a global reset would break it.
// Tremor components style themselves, so they don't need preflight.

const colors = require('tailwindcss/colors');

module.exports = {
  content: [
    './src/components/reports/dashboard/**/*.{ts,tsx}',
    './src/components/reports/reports/**/*.{ts,tsx}',
    './src/style/finance-dashboard.css',
    './node_modules/@tremor/react/dist/**/*.js',
  ],
  darkMode: 'class',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // Light tokens are unused (we force `dark` on the scope) but kept
        // so Tremor's internal lookups don't fail when it renders disabled
        // states from the light palette.
        tremor: {
          brand: {
            faint: colors.violet[50],
            muted: colors.violet[200],
            subtle: colors.violet[400],
            DEFAULT: colors.violet[500],
            emphasis: colors.violet[700],
            inverted: colors.white,
          },
          background: {
            muted: colors.slate[50],
            subtle: colors.slate[100],
            DEFAULT: colors.white,
            emphasis: colors.slate[700],
          },
          border: { DEFAULT: colors.slate[200] },
          ring: { DEFAULT: colors.slate[200] },
          content: {
            subtle: colors.slate[400],
            DEFAULT: colors.slate[500],
            emphasis: colors.slate[700],
            strong: colors.slate[900],
            inverted: colors.white,
          },
        },
        'dark-tremor': {
          brand: {
            faint: '#0B1437',
            muted: colors.violet[950],
            subtle: colors.violet[800],
            DEFAULT: colors.violet[500],
            emphasis: colors.violet[400],
            inverted: colors.slate[950],
          },
          background: {
            muted: '#020617',
            subtle: colors.slate[900],
            DEFAULT: colors.slate[900],
            emphasis: colors.slate[300],
          },
          border: { DEFAULT: colors.slate[800] },
          ring: { DEFAULT: colors.slate[800] },
          content: {
            subtle: colors.slate[600],
            DEFAULT: colors.slate[500],
            emphasis: colors.slate[200],
            strong: colors.slate[50],
            inverted: colors.slate[950],
          },
        },
      },
      boxShadow: {
        'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'tremor-card':
          '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'tremor-dropdown':
          '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'dark-tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'dark-tremor-card':
          '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'dark-tremor-dropdown':
          '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        'tremor-small': '0.375rem',
        'tremor-default': '0.5rem',
        'tremor-full': '9999px',
      },
      fontSize: {
        'tremor-label': ['0.75rem', { lineHeight: '1rem' }],
        'tremor-default': ['0.875rem', { lineHeight: '1.25rem' }],
        'tremor-title': ['1.125rem', { lineHeight: '1.75rem' }],
        'tremor-metric': ['1.875rem', { lineHeight: '2.25rem' }],
      },
    },
  },
  // Tremor generates chart colors as class names at runtime; without this
  // safelist they get tree-shaken in production builds.
  safelist: [
    {
      pattern:
        /^(bg-(?:slate|violet|indigo|rose|emerald)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern:
        /^(text-(?:slate|violet|indigo|rose|emerald)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern:
        /^(border-(?:slate|violet|indigo|rose|emerald)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern:
        /^(ring-(?:slate|violet|indigo|rose|emerald)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(stroke-(?:slate|violet|indigo|rose|emerald)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(fill-(?:slate|violet|indigo|rose|emerald)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
  ],
  plugins: [require('@headlessui/tailwindcss')],
};
