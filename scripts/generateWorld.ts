#!/usr/bin/env tsx
/**
 * Generates src/data/generatedWorld.ts — pyramid site configs with reward assignments.
 * Run: yarn generate-world
 *
 * Fragment distribution:
 * - fragmentSlot placeholders (main-path ends, section/sub-section ends) hold
 *   hieroglyphFragment rewards (specific inventory item IDs); leftover slots become junk loot
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
import { buildConfigs } from "../src/worldGen/configBuilder"
import { generateFile, printStats } from "../src/worldGen/serializer"
import { validateWorldSpec } from "../src/worldGen/validateWorldSpec"
import { resolveKeyRequirements } from "../src/mods/allFamilyMeta"
import { ALL_CURRENCY_DISTRIBUTIONS } from "../src/mods/allCurrencyDistributions"
import { EXPECTED_HIEROGLYPH_FRAGMENTS } from "../src/mods/hieroglyph/game/hieroglyphCurrency"
import { CAPPED_CURRENCIES } from "../src/mods/registeredMods"

const __dirname = dirname(fileURLToPath(import.meta.url))

const errors = validateWorldSpec()
if (errors.length > 0) {
  console.error("✗ World spec validation failed:")
  errors.forEach(e => console.error(`  ${e.tombId}: ${e.message}`))
  process.exit(1)
}

if (process.argv.includes("--validate-only")) {
  console.log("✓ World spec valid")
  process.exit(0)
}

const configs = buildConfigs(
  resolveKeyRequirements,
  ALL_CURRENCY_DISTRIBUTIONS,
  EXPECTED_HIEROGLYPH_FRAGMENTS,
  CAPPED_CURRENCIES
)
printStats(configs)
writeFileSync(join(__dirname, "../src/data/generatedWorld.ts"), generateFile(configs))
console.log("✓ Written: src/data/generatedWorld.ts")
