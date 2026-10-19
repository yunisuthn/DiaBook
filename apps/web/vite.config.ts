import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Même origine que le front : le cookie de session httpOnly passe sans configuration CORS.
    proxy: { '/api': 'http://localhost:3001' },
  },
});
