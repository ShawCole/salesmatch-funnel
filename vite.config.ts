import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  json: {
    stringify: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      // Auth routes are mounted at /auth (not /api) on the backend; proxy them too
      // so the frontend login request reaches Express in dev.
      '/auth': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
    },
  },
})
