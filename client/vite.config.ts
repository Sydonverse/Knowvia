import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // Suppress noisy terminal stack trace if browser queries before server is listening
            if ((err as any).code === 'ECONNREFUSED' && res && 'writeHead' in res && !(res as any).headersSent) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend server is booting up. Please retry in a moment.' }));
            }
          });
        },
      },
      '/uploads': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
