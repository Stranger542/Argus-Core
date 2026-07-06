import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    host: true,
    allowedHosts: true, 
    proxy: {
      // 1. WebSocket Proxy (Already there)
      '/ws': {
        target: 'http://127.0.0.1:8080',
        ws: true,
        changeOrigin: true
      },
      // 2. Add API Proxies so the phone can reach the backend
      '/token': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/clips': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/incidents': { target: 'http://127.0.0.1:8080', changeOrigin: true }
    }
  }
})