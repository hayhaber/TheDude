import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { alphaTab } from '@coderline/alphatab-vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // alphaTab (Songs -> Guitar Pro import) offloads rendering/audio work to
  // Web Workers/AudioWorklets and ships its own font+soundfont assets — this
  // plugin wires up the bundling for those and copies the assets to
  // <root>/font/ and <root>/soundfont/ at build time, per alphaTab's own
  // Vite integration guide. Purely additive: doesn't touch how anything
  // else in the app is built.
  plugins: [
    react(),
    alphaTab(),
    // Generates manifest.webmanifest + a service worker at build time so
    // the app is installable ("Add to Home Screen") on iPad/iPhone —
    // registerType: 'autoUpdate' means a new deploy replaces the cached
    // build on next load instead of a visitor getting stuck on a stale
    // version. index.html's own <link rel="apple-touch-icon"> (iOS reads
    // that directly, not this manifest's icon list) is set separately.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        // alphaTab's worker/worklet bundles (Songs -> Guitar Pro import,
        // ~2.3MB each) are only ever fetched when that specific feature is
        // used — precaching them into the install-time service worker
        // would make every first visit download 4.6MB nobody asked for
        // yet. They still work fine on-demand over the network the first
        // time that feature is opened; only the app shell needs to be
        // available offline immediately. The main app bundle (~3.2MB,
        // over workbox's 2MB default) DOES get precached, hence the raised
        // limit — that one's needed on every visit.
        globIgnores: ['**/alphaTab.worker-*.js', '**/alphaTab.worklet-*.js'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Chord Progression',
        short_name: 'Chords',
        description: 'Guitar & piano chord progression, ear training, and practice tools.',
        theme_color: '#863bff',
        background_color: '#ede6ff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
