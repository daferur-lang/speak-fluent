import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // Shadowing reference audio must work offline, so the mp3s are precached with the app.
        globPatterns: ['**/*.{js,css,html,svg,png,mp3}'],
      },
      manifest: {
        name: 'Speak Fluent',
        short_name: 'SpeakFluent',
        description: 'Aprende a hablar inglés con shadowing, grabándote y repasando en voz alta: 20 minutos al día.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        lang: 'es',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
