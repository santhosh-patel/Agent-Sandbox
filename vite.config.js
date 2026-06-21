import { defineConfig } from 'vite';
import { writeFileSync } from 'fs';

export default defineConfig({
  appType: 'spa',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        rag: 'rag.html',
      },
    },
  },
  plugins: [
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url?.split('?')[0] || '';
          if (url === '/rag' || url.startsWith('/rag/')) {
            req.url = '/index.html';
          }
          next();
        });
      },
      closeBundle() {
        writeFileSync(
          'dist/_redirects',
          '/rag    /index.html   200\n/rag/*  /index.html   200\n/*      /index.html   200\n',
        );
      },
    },
  ],
});
