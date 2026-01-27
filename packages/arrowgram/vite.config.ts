import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
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