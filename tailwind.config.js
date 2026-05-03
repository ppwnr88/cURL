/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // iTerm-inspired graphite palette
        pm: {
          bg:     '#0B0D10',   // root terminal background
          panel:  '#111318',   // title bars, tab bars
          raised: '#171A21',   // inputs, dropdowns, elevated elements
          hover:  '#1D222B',   // hover states
          active: '#242B36',   // pressed/selected
          border: '#303744',   // default border
          line:   '#202630',   // subtle internal dividers
          text:   '#F3F6FA',   // primary text
          sub:    '#A8B3C2',   // secondary text
          muted:  '#667184',   // placeholder / disabled
        },
        // Accent token name is kept for existing classes; color is iTerm blue.
        orange: {
          DEFAULT: '#5AC8FA',
          hover:   '#32ADE6',
          dim:     'rgba(90,200,250,0.12)',
        },
        send: {
          DEFAULT: '#0A84FF',
          hover:   '#006EDB',
        },
        // Terminal-style method colours
        method: {
          get:     '#35D07F',
          post:    '#FFD166',
          put:     '#5AC8FA',
          patch:   '#BF8BFF',
          delete:  '#FF5F57',
          head:    '#FF9F0A',
          options: '#64D2FF',
        },
      },
      fontFamily: {
        sans: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Cascadia Mono', 'Consolas', 'Liberation Mono', 'sans-serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Cascadia Mono', 'Consolas', 'Liberation Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
