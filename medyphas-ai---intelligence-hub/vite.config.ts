import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No API keys are injected into the browser bundle. All AI calls go through the backend.
// Only variables prefixed with VITE_ (e.g. VITE_API_URL) are exposed to the client.
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
