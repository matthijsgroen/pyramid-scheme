import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"
import babel from "vite-plugin-babel"
import { VitePWA } from "vite-plugin-pwa"
import { ViteImageOptimizer } from "vite-plugin-image-optimizer"
import path from "node:path"

import info from "./package.json" with { type: "json" }

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
    // Storybook reuses this config, and the app's service worker has no business in the component
    // explorer — it also chokes on Storybook's own 3.2 MB manager bundle. Storybook sets STORYBOOK=true.
    !process.env.STORYBOOK &&
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
          categories: [
            "puzzle",
            "game",
            "offline",
            "single-player",
            "user-friendly",
            "educational",
            "math",
            "egyptian",
          ],
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
          // woff2 is in here for the hieroglyph subset: the game has to be playable offline, and a font
          // left out of the precache means every sign is a box on a plane — the exact failure the font
          // was added to fix (scripts/generateFont.ts).
          globPatterns: ["**/*.{js,css,html,svg,png,ico,mp3,aac,ttf,otf,woff2,json}"],
          // iOS draws its own launch screens and does not go through the service worker for them,
          // so 27 splash PNGs in the precache were 0.6 MB nobody read.
          globIgnores: ["**/apple-splash-*.png"],
          // The whole game has to be playable offline, mosaic window included, so the stained-glass
          // artwork is precached — and the ceiling covers it UNOPTIMIZED. sharp is an optional peer
          // dep: when it fails to install (Linux CI) the image optimizer skips silently and the raw
          // 3.9 MB PNG ships, which the 2 MB default would reject and fail the build.
          maximumFileSizeToCacheInBytes: 4_500_000,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
        },
        includeAssets: ["/og-image.png"],

        devOptions: {
          enabled: false,
          navigateFallback: "index.html",
          suppressWarnings: true,
          type: "module",
        },
      }),
    ViteImageOptimizer({
      png: { quality: 80 },
      webp: { lossless: false, quality: 80 },
      // pwa-assets-generator already emits these at their target size; re-encoding them came out
      // bigger every time, so each one was skipped anyway.
      exclude: /apple-(splash|touch-icon)|maskable-icon|pwa-\d+x\d+/,
    }),
  ],
  base: "/pyramid-scheme/",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
  },
})
