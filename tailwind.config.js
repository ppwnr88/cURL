/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Postman gray palette
        pm: {
          bg:     '#1C1C1C',   // root background
          panel:  '#252525',   // panels, headers, tab bars
          raised: '#2D2D2D',   // inputs, dropdowns, elevated elements
          hover:  '#363636',   // hover states
          active: '#404040',   // pressed/selected
          border: '#464646',   // default border (more visible than before)
          line:   '#333333',   // subtle internal dividers
          text:   '#E8E8E8',   // primary text
          sub:    '#ABABAB',   // secondary text
          muted:  '#686868',   // placeholder / disabled
        },
        // Postman orange accent
        orange: {
          DEFAULT: '#FF6C37',
          hover:   '#E8602F',
          dim:     'rgba(255,108,55,0.12)',
        },
        // Postman Send button blue
        send: {
          DEFAULT: '#2762F5',
          hover:   '#1A52E0',
        },
        // Method badge colours (Postman-accurate)
        method: {
          get:     '#49CC90',
          post:    '#FCA130',
          put:     '#50A8FB',
          patch:   '#C084FC',
          delete:  '#F93E3E',
          head:    '#9B59B6',
          options: '#60A5FA',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
