import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://127.0.0.1:5443',
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        rewrite: (path) => {
          console.log('🔄 Proxying:', path, '-> https://127.0.0.1:5443' + path);
          return path;
        }
      },
      '/external': {
        target: 'https://127.0.0.1:5443',
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        rewrite: (path) => {
          console.log('🔄 Proxying:', path, '-> https://127.0.0.1:5443' + path);
          return path;
        }
      },
      '/getASession': {
        target: 'https://127.0.0.1:5443',
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        rewrite: (path) => {
          console.log('🔄 Proxying:', path, '-> https://127.0.0.1:5443' + path);
          return path;
        }
      }
    }
  }
})
