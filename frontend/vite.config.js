import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/token': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
      '/users': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
      '/auth': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
      '/admin': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
      '/datasets': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
      '/workflow': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
    }
  }
})
