import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  "react/jsx-runtime",
  "react-dom/client",
];

export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    dts({
      tsconfigPath: "./tsconfig.lib.json",
      entryRoot: "src",
      outDir: "dist",
      include: ["src"],
      exclude: [
        "src/**/__tests__/**",
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
      ],
    }),
  ],
  build: {
    emptyOutDir: true,
    outDir: "dist",
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        preview: resolve(__dirname, "src/preview/index.ts"),
        adapters: resolve(__dirname, "src/adapters/index.ts"),
        embed: resolve(__dirname, "src/embed/index.ts"),
        ai: resolve(__dirname, "src/ai/index.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external,
    },
  },
});
