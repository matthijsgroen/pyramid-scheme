import path from "node:path"
import { defineConfig } from "vitest/config"

// The sweeps too expensive for `yarn test`. A `.verify.ts` matches no default include, so nothing
// creeps back onto a test run's critical path. `yarn verify-world` runs them.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/vitest.setup.ts"],
    include: ["src/**/*.verify.ts"],
  },
})
