import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    // **jsdom is opt-in, per file**, with `// @vitest-environment jsdom` at the top. Building one costs
    // real time — 257s across the suite when every file got one — and only a third of the spec files
    // ever touch a DOM. A file that needs one and forgets to say so fails loudly and immediately on the
    // first `document` it reaches for, so there is no quiet wrong state to end up in.
    environment: "node",
    setupFiles: ["./src/vitest.setup.ts"],
    exclude: ["node_modules/**", ".claude/**"],
  },
})
