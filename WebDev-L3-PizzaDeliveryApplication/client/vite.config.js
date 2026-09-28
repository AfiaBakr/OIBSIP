import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the API runs on :5000; proxy it (including the Socket.IO websocket)
// so the browser talks to a single origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
