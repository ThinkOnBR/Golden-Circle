
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || process.env.API_KEY || '')
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    build: {
      // Switched to 'dist' to match Cloud Run /app/dist expectations
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
    }
  };
});
