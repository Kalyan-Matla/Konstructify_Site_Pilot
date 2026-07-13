/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#10151F',
          800: '#1A2230',
          700: '#242E40',
          600: '#33405A',
        },
        paper: {
          DEFAULT: '#F4F2EC',
          soft: '#FBFAF6',
        },
        amber: {
          glow: '#FFB020',
        },
      },
      fontFamily: {
        display: ['Calistoga', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        raise: '0 1px 2px rgba(16,21,31,0.06), 0 8px 24px -12px rgba(16,21,31,0.25)',
        lift: '0 2px 4px rgba(16,21,31,0.08), 0 20px 44px -16px rgba(16,21,31,0.35)',
        glow: '0 4px 20px -4px rgba(255,176,32,0.55)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.94) translateY(10px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        sheen: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(250%)' },
        },
        'bar-grow': {
          from: { transform: 'scaleY(0)' },
          to: { transform: 'scaleY(1)' },
        },
        ticker: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pop-in': 'pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        sheen: 'sheen 2.4s ease-in-out infinite',
        'bar-grow': 'bar-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        ticker: 'ticker 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
