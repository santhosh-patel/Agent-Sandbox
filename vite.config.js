import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        usage: 'usage.html',
        rag: 'rag.html',
      },
    },
  },
});
