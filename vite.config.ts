import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"
import babel from "vite-plugin-babel"
import path from "node:path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      babelConfig: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    tailwindcss(),
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
