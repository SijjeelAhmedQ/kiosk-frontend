/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral greys, not warm browns — this is what reads as "app", not "menu board".
        ink: '#0D0D0F',       // headings / near-black
        charcoal: '#1C1C1F',  // primary text
        ash: '#76767E',       // secondary text
        mist: '#E9E9EE',      // hairlines, chips, filled inputs
        cream: '#F4F4F7',     // app surface
        paper: '#FFFFFF',     // cards
        // Yellow carries the actions, red is reserved for the brand and for
        // deals — the split the reference app uses, not red-everywhere.
        amber: {
          DEFAULT: '#FFC72C', // primary action
          hover: '#F0B400',
          dark: '#8A6000',    // readable on amber-soft
          soft: '#FFF6DF',
        },
        flame: {
          DEFAULT: '#DA291C', // brand mark, deal tags, destructive
          light: '#F5303F',
          dark: '#B8141F',
          soft: '#FDECEE',
        },
        leaf: {
          DEFAULT: '#12A150', // success
          soft: '#E4F7EC',
        },
      },
      fontFamily: {
        // One clean geometric family, two roles — modern app, not restaurant signage.
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // kiosk type scale — large, finger + far-viewing friendly
        'kiosk-xs': ['0.9rem', { lineHeight: '1.35' }],
        'kiosk-sm': ['1.05rem', { lineHeight: '1.45' }],
        'kiosk-base': ['1.25rem', { lineHeight: '1.5' }],
        'kiosk-lg': ['1.6rem', { lineHeight: '1.3', letterSpacing: '-0.015em' }],
        'kiosk-xl': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.025em' }],
        'kiosk-2xl': ['3.25rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'kiosk-3xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.035em' }],
      },
      borderRadius: { xl2: '1.5rem', xl3: '2rem', xl4: '2.75rem' },
      boxShadow: {
        // Low-contrast, wide — depth without a visible edge.
        soft: '0 1px 2px rgba(13,13,15,0.04), 0 2px 8px rgba(13,13,15,0.04)',
        card: '0 2px 6px rgba(13,13,15,0.04), 0 10px 28px rgba(13,13,15,0.06)',
        lift: '0 8px 20px rgba(13,13,15,0.07), 0 28px 56px rgba(13,13,15,0.10)',
        pop: '0 32px 80px rgba(13,13,15,0.28)',
        bar: '0 -4px 28px rgba(13,13,15,0.07)',
        brand: '0 4px 14px rgba(255,199,44,0.50)',
        'brand-lg': '0 8px 26px rgba(255,199,44,0.60)',
        red: '0 4px 14px rgba(218,41,28,0.28)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22,1,0.36,1)',
        spring: 'cubic-bezier(0.34,1.4,0.64,1)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(6%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.82)', opacity: '0' },
          '65%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'ember-pulse': {
          '0%,100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.06)', opacity: '1' },
        },
        'ring-pulse': {
          '0%': { transform: 'scale(0.85)', opacity: '0.4' },
          '100%': { transform: 'scale(1.45)', opacity: '0' },
        },
        'dot-blink': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease both',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'sheet-up': 'sheet-up 0.42s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in': 'scale-in 0.28s cubic-bezier(0.22,1,0.36,1) both',
        'pop-in': 'pop-in 0.38s cubic-bezier(0.34,1.4,0.64,1) both',
        'ember-pulse': 'ember-pulse 2.4s ease-in-out infinite',
        'ring-pulse': 'ring-pulse 2.2s ease-out infinite',
        'dot-blink': 'dot-blink 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
