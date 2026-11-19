import { defineConfig, mergeConfig } from "vitest/config"
import base from "./vitest.config"

// `yarn mutate` against the whole suite takes about 90 minutes a function; SPECS (comma-separated globs) narrows it
// to the specs that test the target. Unset, the repo's normal unit-test selection runs.
const specs = process.env.SPECS?.split(",")

export default specs ? mergeConfig(base, defineConfig({ test: { include: specs } })) : base
