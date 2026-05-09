import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  server: {
    port: 5209,
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
      devOptions: {
        enabled: false,
      },
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.svg', 'icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'TrainerSync',
        short_name: 'TrainerSync',
        description: 'Sync your training with coaches and friends',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,gif,jpeg,jpg,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
})
