#!/usr/bin/env tsx
/**
 * Generates src/data/generatedWorld.ts — pyramid site configs with reward assignments.
 * Run: yarn generate-world
 *
 * Fragment distribution:
 * - Intermediate chest nodes hold hieroglyphFragment rewards (specific inventory item IDs)
 * - Spread: starter fragments in starter+junior; junior in junior+expert; etc.
 * - No two fragments of the same hieroglyph in the same journey
 * - 47/157 fragments placed on linear sites; remaining 110 go on Phase 5 branches
 * - Distribution is deterministic (fixed WORLD_SEED)
 *
 * Map piece + floor structure: see scripts/worldGen/configBuilder.ts
 */
import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { buildConfigs } from "./worldGen/configBuilder"
import { generateFile, printStats } from "./worldGen/serializer"

const __dirname = dirname(fileURLToPath(import.meta.url))

const configs = buildConfigs()
printStats(configs)
writeFileSync(join(__dirname, "../src/data/generatedWorld.ts"), generateFile(configs))
console.log("✓ Written: src/data/generatedWorld.ts")
