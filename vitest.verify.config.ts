import path from "node:path"
import { defineConfig } from "vitest/config"

/**
 * The sweeps that are too expensive to run on every change, held out of `yarn test` and run on demand.
 *
 * A `.verify.ts` file matches neither vitest's default `include` nor the one below by accident: the
 * main config never picks one up, so nothing here can creep back onto the critical path of a test run.
 * `yarn verify-world` is what runs them.
 */
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
