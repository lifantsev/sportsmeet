import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward /api requests to the Express server so the client can use relative URLs
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
