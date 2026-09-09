import { defineConfig } from 'vite';

// GitHub Pages project site is served from https://<user>.github.io/<repo>/,
// so the CI workflow sets BASE_PATH=/<repo>/. Local dev uses '/'.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
