import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["modules/**/*"],
      manifest: {
        name: "PWA Avatar Notification Platform",
        short_name: "AvatarMail",
        description: "Gmail INBOX unread avatar for iOS and Android PWA",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/modules/cat-pack/preview.webp",
            sizes: "192x192",
            type: "image/webp",
          },
          {
            src: "/modules/cat-pack/preview.webp",
            sizes: "512x512",
            type: "image/webp",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,webp,json,mjs}"],
        runtimeCaching: [
          {
            urlPattern: /^\/modules\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "avatar-modules",
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
