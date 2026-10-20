import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vite config. There are two kinds of build:
//
//   npm run build     The website (what Vercel runs). Output: dist/
//                     Includes the PWA: a service worker and web manifest, so the app can be
//                     installed and keeps working offline after the first visit.
//
//   npm run package   The offline zip for library laptops (see scripts/package.js), which builds
//                     with `--mode offline`. Output: dist-offline/
//                     NO service worker or PWA caching: that app is opened from a tiny local web
//                     server, and a cached old version must never get stuck in the browser.
//                     It also removes any service worker an earlier visit may have left behind.

/** Local build only: unregisters old service workers and empties old caches when the page opens. */
function noServiceWorker() {
  const script = `<script>
      // Offline package: never use a service worker, and remove any old one (and its caches).
      if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });
      if (window.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); });
    </script>`;
  return {
    name: 'no-service-worker',
    transformIndexHtml: (html) => html.replace('</head>', `    ${script}\n  </head>`),
  };
}

export default defineConfig(({ mode }) => {
  const offline = mode === 'offline';
  return {
    build: { outDir: offline ? 'dist-offline' : 'dist' },
    plugins: [
      react(),
      offline
        ? noServiceWorker()
        : VitePWA({
            // Silently update the service worker when a new version is deployed.
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
            manifest: {
              name: 'Campus Compass – LAU',
              short_name: 'Campus Compass',
              description: 'Find LAU facilities and resources on a map.',
              theme_color: '#00573f',
              background_color: '#e9efeb',
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
  };
});
