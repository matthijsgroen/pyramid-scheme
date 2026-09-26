import path from "node:path"
import { defineConfig } from "vitest/config"

// The sweeps too expensive for `yarn test`. A `.verify.ts` matches no default include, so nothing
// creeps back onto a test run's critical path. `yarn verify-content` runs them.
//
// **RUN AFTER AUTHORING, and not in CI.** This is the pass you make once you have changed a generator, a
// seed list or the world spec — the things whose output these sweeps check. It is deliberately not a CI
// job: a generator is worth re-checking when somebody changes one, not on every pull request, and putting
// it on the critical path is how it ended up making the build red or green according to machine load.
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
    // THESE ARE THE SLOW ONES BY DEFINITION, and they run beside each other: a generator that searches
    // takes as long as the machine lets it, so eight files of them racing for the same cores is exactly
    // where a per-test default of five seconds fires. It fired on rush-hour/wizard, which passes in forty
    // seconds when it has the machine to itself. A timeout here is a stuck-forever guard and nothing else
    // — how long anything takes is measured by running it, never asserted (docs/instructions/testing.md).
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
})
