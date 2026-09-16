import type { Config } from 'tailwindcss';

// Design tokens — Poolmigo brand kit v1.0 (assets/brand-tokens.json).
// Token *names* are kept from the original build so components need no churn;
// only the values changed for the light, cream-based system.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',
      // Surfaces
      deep: '#FFF8EF', // cream — page background and inset fields
      panel: '#FFFFFF', // cards
      'panel-2': '#F6EFE4', // hover / raised surfaces
      line: '#DDD9D1',
      'line-2': '#C9C3B9',
      // Text
      ink: '#302823',
      'ink-2': '#625D57', // muted
      'ink-3': '#8F8981', // quiet labels (derived from muted)
      // Actions & status
      aqua: '#244742', // deep teal — primary actions, in-range
      'aqua-dim': '#3F6B65',
      up: '#28614F', // success
      down: '#A33832', // negative
      amber: '#8B5A13', // warning
      // Brand character colours (decorative)
      apricot: '#F3A66E',
      glass: '#7BB8B2',
      // Token colour for TIDE-denominated numbers — apricot darkened for text contrast on cream/white
      tide: '#9A5A22',
      indigo: '#9A5A22',
    },
    fontFamily: {
      display: ['Rubik', 'Arial', 'system-ui', 'sans-serif'],
      sans: ['Rubik', 'Arial', 'system-ui', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
    },
    extend: {
      borderRadius: { DEFAULT: '8px', md: '12px', lg: '16px' },
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
        pop: '0 8px 24px rgba(48,40,35,0.12), 0 0 0 1px #DDD9D1',
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
