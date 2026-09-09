import type { Config } from 'tailwindcss';

// Design tokens — single source of truth for colour/type (see docs/CLAUDE-CODE-PROMPT.md).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',
      // Surfaces
      base: '#0E1420',
      panel: '#161E2E',
      'panel-2': '#1C2638',
      line: '#232E44',
      'line-2': '#2E3B55',
      // Text
      ink: '#E6EBF5',
      'ink-2': '#A6B0C3',
      'ink-3': '#6B7690',
      // Semantic
      aqua: '#39D0C4',
      'aqua-dim': '#1F8F87',
      up: '#4ADE80',
      down: '#F87171',
      amber: '#F5B14C',
      tide: '#8B9CF7',
      indigo: '#8B9CF7',
    },
    fontFamily: {
      display: ['Archivo', 'Inter', 'system-ui', 'sans-serif'],
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
    },
    extend: {
      borderRadius: { DEFAULT: '4px', md: '6px', lg: '8px' },
      fontSize: {
        '2xs': ['11px', '14px'],
        xs: ['12px', '16px'],
        sm: ['13px', '18px'],
        base: ['14px', '20px'],
        md: ['15px', '22px'],
        lg: ['17px', '24px'],
        xl: ['20px', '26px'],
        '2xl': ['24px', '30px'],
        '3xl': ['30px', '36px'],
        '4xl': ['38px', '44px'],
      },
      boxShadow: {
        pop: '0 8px 24px rgba(0,0,0,0.45), 0 0 0 1px #232E44',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        spin: 'spin 800ms linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
