import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"
import babel from "vite-plugin-babel"
import { VitePWA } from "vite-plugin-pwa"
import path from "node:path"

import info from "./package.json"

const htmlPlugin = () => {
  return {
    name: "html-transform",
    transformIndexHtml(html: string) {
      return html.replace(/APP_VERSION/, info.version)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      babelConfig: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    htmlPlugin(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,

      pwaAssets: {
        disabled: false,
        config: true,
      },

      manifest: {
        name: "Pyramid Scheme",
        short_name: "Pyramid Scheme",
        id: "com.matthijsgroen.pyramidscheme",
        description:
          "An ancient Egyptian-themed math puzzle adventure game where you explore mysterious pyramids, solve hieroglyphic puzzles, and collect treasures from forgotten tombs.",
        theme_color: "#bedff",
        background_color: "#bedff",
        orientation: "portrait",
        display: "fullscreen",
        categories: ["puzzle", "game", "offline", "single-player", "user-friendly", "educational", "math", "egyptian"],
        dir: "ltr",
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,mp3,aac,ttf,otf,json}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 6_000_000,
      },
      includeAssets: ["/og-image.png"],

      devOptions: {
        enabled: false,
        navigateFallback: "index.html",
        suppressWarnings: true,
        type: "module",
      },
    }),
  ],
  base: "/pyramid-scheme/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  build: {
    target: "esnext",
  },
})
