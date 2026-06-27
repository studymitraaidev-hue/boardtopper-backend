import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // manifest.json is in /public and linked manually in index.html
      // Setting manifest:false prevents the plugin from overwriting it
      manifest: false,
      includeAssets: ['icon-192.svg', 'icon-512.svg'],
      workbox: {
        // navigateFallback is required for SPA — without this, refreshing a
        // non-root route (e.g. /dashboard) while offline returns a 404 from cache.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-auth',
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /\/api\/(subjects|chapters)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-syllabus',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /\/api\/(ai|quiz)/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
