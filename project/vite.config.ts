import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['lucide-react'],
  },
  server: {
    sourcemapIgnoreList: (sourcePath) => {
      return sourcePath.includes('node_modules');
    },
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
