/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A1614',       // near-black warm — chrome / headers
        charcoal: '#2B2622',  // primary text
        ash: '#9A8F84',       // muted text
        mist: '#ECE3D6',      // borders / hover fills
        cream: '#FBF6EE',     // app surface
        paper: '#FFFFFF',     // cards
        flame: {
          DEFAULT: '#E23E26', // primary action — appetite red
          dark: '#C42F1B',
          soft: '#FCE9E4',
        },
        amber: {
          DEFAULT: '#F2A01E', // secondary accent — ember
          soft: '#FDF1DA',
        },
        leaf: '#3FA66A',      // success / veg
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // kiosk type scale — large, finger + far-viewing friendly
        'kiosk-xs': ['0.9rem', { lineHeight: '1.3' }],
        'kiosk-sm': ['1.05rem', { lineHeight: '1.4' }],
        'kiosk-base': ['1.25rem', { lineHeight: '1.5' }],
        'kiosk-lg': ['1.6rem', { lineHeight: '1.35' }],
        'kiosk-xl': ['2.25rem', { lineHeight: '1.2' }],
        'kiosk-2xl': ['3.25rem', { lineHeight: '1.1' }],
        'kiosk-3xl': ['4.5rem', { lineHeight: '1.05' }],
      },
      borderRadius: { xl2: '1.75rem', xl3: '2.25rem' },
      boxShadow: {
        card: '0 2px 14px rgba(26,22,20,0.06)',
        pop: '0 24px 60px rgba(26,22,20,0.22)',
        bar: '0 -8px 30px rgba(26,22,20,0.10)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': {
          '0%': { transform: 'translateY(28px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.94)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'ember-pulse': {
          '0%,100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.06)', opacity: '1' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease both',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in': 'scale-in 0.28s cubic-bezier(0.22,1,0.36,1) both',
        'ember-pulse': 'ember-pulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
