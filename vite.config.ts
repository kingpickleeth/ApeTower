import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],  server: {
    proxy: {
      '/generate-metadata': 'https://metadata-server-production.up.railway.app'
    }
  }
})
