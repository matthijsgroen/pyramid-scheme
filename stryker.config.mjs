/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  // nodeLinker: pnpm hides sibling packages from the default "@stryker-mutator/*" plugin glob
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: { configFile: "vitest.stryker.config.ts" },
  coverageAnalysis: "perTest",
  reporters: ["clear-text", "progress", "html", "json"],
  ignorePatterns: [".claude", "dist", "reports"],
}
