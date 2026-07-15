/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm "stone" neutral ramp — brown undertone harmonizes with the
        // ivory paper and bronze-gold accent (premium black + gold system).
        ink: {
          DEFAULT: '#1C1917',
          800: '#292524',
          700: '#44403C',
          600: '#57534E',
        },
        paper: {
          DEFAULT: '#F6F4EF',
          soft: '#FCFBF8',
        },
        // Two-tone gold: `glow` is the bright accent for dark surfaces &
        // buttons; deeper bronze lives in Tailwind's amber-700/800 for text.
        amber: {
          glow: '#E0A22B',
        },
      },
      fontFamily: {
        display: ['Calistoga', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        raise: '0 1px 2px rgba(28,25,23,0.05), 0 6px 20px -10px rgba(28,25,23,0.18)',
        lift: '0 2px 4px rgba(28,25,23,0.07), 0 18px 40px -16px rgba(28,25,23,0.26)',
        glow: '0 4px 18px -5px rgba(224,162,43,0.5)',
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
        'pop-in': 'pop-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        sheen: 'sheen 2.4s ease-in-out infinite',
        'bar-grow': 'bar-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        ticker: 'ticker 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
