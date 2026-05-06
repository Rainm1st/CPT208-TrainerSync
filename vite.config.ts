import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  server: {
    port: 5208,
    strictPort: true,
  },
  // Serve project root so /assets/... URLs resolve to the assets/ folder
  publicDir: false,
  plugins: [
    react(),
    tailwindcss(),
    // Serve assets/ as static files at /assets/ in both dev and build
    viteStaticCopy({
      targets: [{ src: 'assets', dest: '' }],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'TrainerSync',
        short_name: 'TrainerSync',
        description: 'Sync your training with coaches and friends',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,gif,jpeg,jpg,woff2}'],
      },
    }),
  ],
})
