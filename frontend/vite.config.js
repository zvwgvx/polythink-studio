import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/token': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/datasets': 'http://localhost:8000',
      '/workflow': 'http://localhost:8000',
    }
  }
})
