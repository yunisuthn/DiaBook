import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180, // 5173 est déjà pris par apps/web de DiaBook
    strictPort: true,
    // En développement, la page (port 5180) et l'API (port 3100) sont deux serveurs.
    // Le proxy fait passer /api/... vers Express : pour le navigateur, tout vient
    // de la même adresse, donc pas de problème de CORS.
    proxy: {
      '/api': 'http://localhost:3100',
    },
  },
});
