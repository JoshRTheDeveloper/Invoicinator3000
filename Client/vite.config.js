import { defineConfig } from 'vite'
import {VitePWA } from "vite-plugin-pwa"
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [react(),
  VitePWA({registerType: 'autoUpdate'})
  ],
  server: {
    port: process.env.PORT || 3000,
    open: true,
    proxy: {
      '/graphql': {
        target: 'http://localhost:3001',
        secure: false,
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom'
  }
})
