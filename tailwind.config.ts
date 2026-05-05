import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/ui/popup/**/*.{ts,tsx}',
    './src/ui/stars/**/*.{ts,tsx}',
    './src/ui/shared/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#d97706',
          secondary: '#1e3a5f',
          accent: '#f59e0b',
          surface: '#fffbeb',
        },
      },
    },
  },
  plugins: [],
};

export default config;
