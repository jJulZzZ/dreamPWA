import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { localAiPlugin } from './dev/ai-plugin.ts';

export default defineConfig({
  plugins: [
    localAiPlugin(),
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Rêveil — Journal de rêves',
        short_name: 'Rêveil',
        description: 'Votre journal de rêves privé, même hors ligne.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        lang: 'fr',
        start_url: '/',
        icons: []
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [{
          urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
        }]
      }
    })
  ]
});
