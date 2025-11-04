/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      'light',
      'dark',
      {
        emeraldDark: {
          ...require('daisyui/src/theming/themes')['[data-theme=dark]'],
          primary: '#34d399',
          secondary: '#22d3ee',
          accent: '#a78bfa',
          neutral: '#1f2937',
          'base-100': '#0b1020',
        },
      },
    ],
    darkTheme: 'emeraldDark',
  },
}


