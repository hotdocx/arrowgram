import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ArrowGram',
      fileName: 'arrowgram',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'katex'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          katex: 'katex',
        },
      },
    },
  },
});
