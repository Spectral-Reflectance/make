import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function rejectEditableDesignUrls(): Plugin {
  return {
    name: 'reject-editable-design-urls',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestPath = (request as { url?: string }).url?.split('?')[0];
        if (requestPath?.endsWith('.tag.json')) {
          response.statusCode = 404;
          response.end('Not found');
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), rejectEditableDesignUrls()],
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: decodeURIComponent(new URL('./index.html', import.meta.url).pathname),
        licence: decodeURIComponent(new URL('./licence/index.html', import.meta.url).pathname),
      },
    },
  },
});
