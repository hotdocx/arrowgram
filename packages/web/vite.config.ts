import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const base =
    process.env.VITE_BASE ??
    (mode === 'production' ? '/arrowgram/' : '/');

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      exclude: ['arrowgram'],
    },
  };
});
