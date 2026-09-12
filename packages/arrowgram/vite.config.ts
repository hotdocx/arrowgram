import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({
    insertTypesEntry: true,
    entryRoot: 'src',
    tsconfigPath: resolve(__dirname, 'tsconfig.json'),
    include: ['src/**/*.ts', 'src/**/*.tsx'],
    exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    beforeWriteFile: (filePath, content) => ({
      filePath,
      content: content.replace(
        /(['"])(\.\.?\/[^'"]+)\1/g,
        (match, quote: string, specifier: string) => {
          if (/\.(?:[cm]?js|json|css|ts|tsx)$/.test(specifier)) return match;
          return `${quote}${specifier}.js${quote}`;
        },
      ),
    }),
  })],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        schema: resolve(__dirname, 'src/schema-entry.ts'),
        core: resolve(__dirname, 'src/core-entry.ts'),
        react: resolve(__dirname, 'src/react-entry.ts'),
      },
      name: 'ArrowGram',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'cjs' ? 'cjs' : 'js'}`,
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'react-dom', 'katex', 'zod'],
    },
  },
});
