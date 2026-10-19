import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vite config. The PWA plugin generates a service worker and web manifest
// so the app can be installed and keeps working offline after the first visit.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Silently update the service worker when a new version is deployed.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Campus Compass – LAU',
        short_name: 'Campus Compass',
        description: 'Find LAU facilities and resources on a map.',
        theme_color: '#00573f',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Pre-cache everything the app needs (JS, CSS, HTML, icons). The 3D campus and
        // places.json are bundled into the JS, so the whole app works offline after one visit.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // The 3D library makes the JS bundle larger than Workbox's 2 MB default limit.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
