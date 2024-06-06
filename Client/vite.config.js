import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; // Import the Vite PWA plugin

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ // Add the Vite PWA plugin
      manifest: {
        // Update your manifest options here
        name: 'Invoicinator',
        short_name: 'Invoicinator',
        display: 'standalone',
        background_color: '#ffffff',
        lang: 'en',
        start_url: '/',
        id: 'https://invoicinator3000-d580657ecca9.herokuapp.com/',
        description: 'A simple app for invoices',
        theme_color: '#000000',
        icons: [
          {
            src: 'https://invoicinator3000-d580657ecca9.herokuapp.com/assets/invoicinator192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://invoicinator3000-d580657ecca9.herokuapp.com/assets/invoicinator512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        screenshots: [
          {
            src: 'https://invoicinator3000-d580657ecca9.herokuapp.com/assets/longScreenshot.png',
            sizes: '1080x1920',
            type: 'image/png'
          },
          {
            src: 'https://invoicinator3000-d580657ecca9.herokuapp.com/assets/screenshot1.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide'
          }
        ]
      }
    })
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // Use the copy plugin to copy the manifest.json file to the dist directory
    assetsInlineLimit: 0,
    assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.gif', '**/*.json', '**/*.xml', '**/*.webmanifest'],
    outDir: 'dist', // This is the default value, but explicitly setting it for clarity
  },
  test: {
    globals: true,
    environment: 'happy-dom'
  }
});
