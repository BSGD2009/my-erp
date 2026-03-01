import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // Required for Docker — binds to all interfaces
    port: 5173,
    watch: {
      usePolling: true, // Required for Docker on Windows — filesystem events don't cross the VM boundary
    },
    proxy: {
      // Any request from the browser to /api/... gets forwarded to the backend container.
      // This means the browser never needs to know the backend URL directly.
      '/api': {
        target: 'http://backend:3001',
        changeOrigin: true,
      },
    },
  },
});
