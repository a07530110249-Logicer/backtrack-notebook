import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { createApiApp } from './server/app.mjs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'backtrack-local-api',
      async configureServer(server) {
        const { app } = await createApiApp({ dataDir: path.resolve('.local-data') });
        server.middlewares.use('/api', app);
      },
    },
  ],
  base: './',
  server: { port: 5173 },
  build: { outDir: 'dist' },
});
