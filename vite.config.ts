import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"
import babel from "vite-plugin-babel"
import { VitePWA } from "vite-plugin-pwa"
import { ViteImageOptimizer } from "vite-plugin-image-optimizer"
import path from "node:path"

import info from "./package.json" with { type: "json" }
import { PRODUCTION_BASE, pwaBuild } from "./scripts/pwaIdentity.ts"

type WorkerCaches = {
  open: (
    name: string
  ) => Promise<{ match: (request: Request, options: { ignoreSearch: boolean }) => Promise<Response | undefined> }>
}

const base = process.env.VITE_BASE ?? PRODUCTION_BASE
const pwa = pwaBuild(base)

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
    // **A locale edit is invisible until the page is reloaded**, which costs more than it sounds: i18next
    // fetches the files once at startup, and `public/` is outside the module graph, so HMR has nothing to
    // swap. The screen keeps showing yesterday's sentence — or a raw key for a phrase that was added
    // minutes ago — and it reads exactly like a bug in the code.
    {
      name: "reload-on-locale-change",
      handleHotUpdate({ file, server }) {
        if (!file.includes("/public/locales/")) return
        server.ws.send({ type: "full-reload" })
        return []
      },
    },
    // Storybook reuses this config, and the app's service worker has no business in the component
    // explorer — it also chokes on Storybook's own 3.2 MB manager bundle. Storybook sets STORYBOOK=true.
    !process.env.STORYBOOK &&
      VitePWA({
        registerType: "prompt",
        injectRegister: false,
        selfDestroying: pwa.selfDestroying,

        pwaAssets: {
          disabled: false,
          config: true,
        },

        manifest: pwa.identity && {
          ...pwa.identity,
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
          // was added to fix (scripts/generateFont.ts). webp carries the tomb-puzzle wall panels and the
          // rush-hour market sprites, so a tableau plays against a blank wall without it.
          // Of the locales only English is precached: it is the fallback every language leans on. The other
          // 41 were half the precache, and a player reads one of them.
          globPatterns: ["**/*.{js,css,html,svg,png,webp,ico,mp3,aac,ttf,otf,woff2}", "locales/en/*.json"],
          // i18next asks for `common.json?v=<version>`; without this the precached English never matches.
          ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
          // The language a player picks is cached the first time it loads, so it keeps working offline.
          // CacheFirst because the `?v=` makes every release a new URL: a cached file is never stale, and a
          // release fetches its own. Offline right after an update the new URL is not cached yet, so the
          // last release's file stands in rather than the game falling back to English.
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.includes("/locales/"),
              handler: "CacheFirst",
              options: {
                cacheName: "locales",
                expiration: { maxEntries: 120 },
                cacheableResponse: { statuses: [200] },
                plugins: [
                  {
                    handlerDidError: async ({ request }) => {
                      // This runs in the service worker, where `caches` is a global; the config is typed for node.
                      const { caches } = globalThis as unknown as { caches: WorkerCaches }
                      return (await (await caches.open("locales")).match(request, { ignoreSearch: true })) ?? undefined
                    },
                  },
                ],
              },
            },
          ],
          // iOS draws its own launch screens and does not go through the service worker for them,
          // so 27 splash PNGs in the precache were 0.6 MB nobody read.
          // The Lock editor's web worker carries a second copy of the world and the web walk for a develop-mode
          // tool: fetched when the editor's web mode opens, never precached for players.
          // The icons and og-image are listed by the plugin itself (manifest icons, includeAssets) with a revision
          // of their own. Globbed as well, the same URL shows up twice with two revisions, workbox throws while
          // the worker starts, and what installs is a worker with no precache and no routes: nothing offline.
          globIgnores: [
            "**/apple-splash-*.png",
            "**/webCheck.worker-*.js",
            "pwa-*.png",
            "maskable-icon-*.png",
            "og-image.png",
          ],
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
  base,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
  },
  // The Lock editor's web worker is a module worker: the world and the web walk split into chunks like the app.
  worker: {
    format: "es",
  },
})
