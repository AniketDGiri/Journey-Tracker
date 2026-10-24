/** @type {import('tailwindcss').Config} */
// Colors are CSS variables (RGB channels, defined in src/study/study.css) so the
// study pages follow the same light/dark toggle as the rest of the app.
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: c('void'),
        surface: { DEFAULT: c('surface'), 2: c('surface-2'), 3: c('surface-3') },
        line: { DEFAULT: c('line'), strong: c('line-strong') },
        ink: { DEFAULT: c('ink'), soft: c('ink-soft'), muted: c('ink-muted'), faint: c('ink-faint') },
        violet: { DEFAULT: c('violet'), soft: c('violet-soft'), deep: c('violet-deep'), glow: 'rgba(139,92,246,0.18)' },
        arc: { DEFAULT: c('arc'), soft: c('arc-soft'), glow: 'rgba(59,130,246,0.16)' },
        ember: { DEFAULT: c('ember'), soft: c('ember-soft') },
        rose: { DEFAULT: c('rose') },
        jade: { DEFAULT: c('jade') },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139,92,246,0.35), 0 0 24px -6px rgba(139,92,246,0.45)',
        'glow-arc': '0 0 0 1px rgba(59,130,246,0.35), 0 0 24px -6px rgba(59,130,246,0.45)',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'none' } },
        pulseRing: { '0%,100%': { opacity: 0.5 }, '50%': { opacity: 1 } },
      },
      animation: { rise: 'rise .28s ease-out both', pulseRing: 'pulseRing 2.4s ease-in-out infinite' },
    },
  },
  plugins: [],
}
