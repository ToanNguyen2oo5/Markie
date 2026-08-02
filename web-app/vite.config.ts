import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 3000,
    proxy: {
      // Proxy qua Spring Cloud Gateway (port 8888)
      '/profile': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
      '/post': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      }
    }
  }
})
