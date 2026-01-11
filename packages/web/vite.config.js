import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/arrowgram/',
    resolve: {
        preserveSymlinks: true,
    },
    server: {
        fs: {
            strict: false,
        },
    },
});
