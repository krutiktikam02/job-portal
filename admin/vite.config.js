import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config for admin app; server port set to 5174 as requested
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174
  }
})
