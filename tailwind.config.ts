import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/ui/popup/**/*.{ts,tsx}',
    './src/ui/stars/**/*.{ts,tsx}',
    './src/ui/shared/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
