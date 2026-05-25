/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── HUD palette ── */
        'hud': {
          primary:   '#00ffcc',
          secondary: '#ff0055',
          accent:    '#ffaa00',
          info:      '#3399ff',
          success:   '#44ff88',
          warning:   '#ffcc00',
          danger:    '#ff3344',
          bg:        'rgba(10, 10, 15, 0.85)',
          'bg-light': 'rgba(20, 20, 30, 0.7)',
          border:    'rgba(0, 255, 204, 0.3)',
        },

        /* ── Shop / economy palette ── */
        'shop': {
          gold:      '#ffd700',
          silver:    '#c0c0c0',
          bronze:    '#cd7f32',
          bg:        'rgba(15, 15, 25, 0.92)',
          card:      'rgba(30, 30, 50, 0.85)',
          highlight: 'rgba(0, 255, 204, 0.15)',
        },

        /* ── Quest palette ── */
        'quest': {
          active:    '#00ccff',
          completed: '#44ff88',
          failed:    '#ff4455',
          available: '#ffaa00',
          bg:        'rgba(10, 15, 25, 0.9)',
        },

        /* ── Surface / overlay ── */
        'surface': {
          DEFAULT:   'rgba(10, 10, 18, 0.95)',
          elevated:  'rgba(20, 20, 35, 0.9)',
          overlay:   'rgba(0, 0, 0, 0.6)',
          glass:     'rgba(255, 255, 255, 0.05)',
        },
      },

      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'body':    ['Roboto', 'sans-serif'],
        'mono':    ['JetBrains Mono', 'monospace'],
      },

      fontSize: {
        'hud-xs':   ['0.65rem',  { lineHeight: '0.85rem' }],
        'hud-sm':   ['0.75rem',  { lineHeight: '1rem' }],
        'hud-base': ['0.875rem', { lineHeight: '1.25rem' }],
        'hud-lg':   ['1.125rem', { lineHeight: '1.5rem' }],
        'hud-xl':   ['1.5rem',   { lineHeight: '1.75rem' }],
        'hud-2xl':  ['2rem',     { lineHeight: '2.25rem' }],
        'hud-3xl':  ['2.5rem',   { lineHeight: '2.75rem' }],
      },

      spacing: {
        'hud-1':  '0.25rem',
        'hud-2':  '0.5rem',
        'hud-3':  '0.75rem',
        'hud-4':  '1rem',
        'hud-5':  '1.25rem',
        'hud-6':  '1.5rem',
        'hud-8':  '2rem',
        'hud-10': '2.5rem',
        'hud-12': '3rem',
      },

      borderRadius: {
        'hud':    '0.375rem',
        'hud-lg': '0.75rem',
        'hud-xl': '1rem',
      },

      borderWidth: {
        'hud': '1px',
      },

      boxShadow: {
        'hud-glow':     '0 0 8px rgba(0, 255, 204, 0.4)',
        'hud-glow-lg':  '0 0 16px rgba(0, 255, 204, 0.5)',
        'danger-glow':  '0 0 8px rgba(255, 0, 85, 0.4)',
        'gold-glow':    '0 0 8px rgba(255, 215, 0, 0.4)',
        'info-glow':    '0 0 8px rgba(51, 153, 255, 0.4)',
        'card':         '0 4px 12px rgba(0, 0, 0, 0.3)',
        'card-hover':   '0 8px 24px rgba(0, 0, 0, 0.4)',
      },

      animation: {
        'pulse-fast':    'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow':    'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-up':   'slideInUp 0.3s ease-out forwards',
        'slide-in-down': 'slideInDown 0.3s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.3s ease-out forwards',
        'slide-in-right':'slideInRight 0.3s ease-out forwards',
        'fade-in':       'fadeIn 0.2s ease-out forwards',
        'fade-out':      'fadeOut 0.2s ease-in forwards',
        'scale-in':      'scaleIn 0.2s ease-out forwards',
        'glow-pulse':    'glowPulse 1.5s ease-in-out infinite',
        'spin-slow':     'spin 3s linear infinite',
        'bounce-subtle': 'bounceSubtle 1s ease-in-out infinite',
        'shake':         'shake 0.5s ease-in-out',
        'progress-fill': 'progressFill 0.5s ease-out forwards',
      },

      keyframes: {
        slideInUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideInDown: {
          '0%':   { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        slideInLeft: {
          '0%':   { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',     opacity: '1' },
        },
        slideInRight: {
          '0%':   { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%':   { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0, 255, 204, 0.3)' },
          '50%':      { boxShadow: '0 0 20px rgba(0, 255, 204, 0.6)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%':      { transform: 'translateX(-4px)' },
          '40%':      { transform: 'translateX(4px)' },
          '60%':      { transform: 'translateX(-3px)' },
          '80%':      { transform: 'translateX(3px)' },
        },
        progressFill: {
          '0%':   { width: '0%' },
          '100%': { width: 'var(--progress-width, 100%)' },
        },
      },

      backgroundImage: {
        'gradient-hud':    'linear-gradient(135deg, rgba(0,255,204,0.15) 0%, rgba(0,0,0,0) 100%)',
        'gradient-danger': 'linear-gradient(135deg, rgba(255,0,85,0.15) 0%, rgba(0,0,0,0) 100%)',
        'gradient-gold':   'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(0,0,0,0) 100%)',
        'gradient-card':   'linear-gradient(180deg, rgba(30,30,50,0.9) 0%, rgba(15,15,25,0.95) 100%)',
      },

      backdropBlur: {
        'hud': '8px',
      },

      zIndex: {
        'hud':       '50',
        'hud-modal': '60',
        'hud-toast': '70',
        'hud-max':   '9999',
      },
    },
  },
  plugins: [],
};
