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
import { resolveKeyRequirements, familyWeightFor, allocateEncounterFamily } from "../src/mods/allFamilyMeta"
import { ALL_CURRENCY_DISTRIBUTIONS } from "../src/mods/allCurrencyDistributions"
import { HIEROGLYPH_REQUIRED } from "../src/mods/hieroglyph/game/hieroglyphData"
import {
  assignFragmentPieceIndices,
  cappedHieroglyphRequired,
  hieroglyphCoverage,
} from "../src/mods/hieroglyph/game/fragmentFinalize"
import { CAPPED_CURRENCIES, DYNAMIC_DISTRIBUTIONS, MOD_WORLD_VALIDATORS } from "../src/mods/registeredMods"

// The share of loot-eligible slots deliberately left empty so found loot stays meaningful (no
// 1-coin spam). A core world-gen knob (docs/mods/distribution-primitive-design.md); 0 = fill by
// eagerness + budget alone. Dial up after a regen feel-check if loot reads as too dense.
const EMPTY_FRACTION = 0

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
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_WORLD_VALIDATORS,
  familyWeightFor,
  EMPTY_FRACTION,
  allocateEncounterFamily
)
// Hieroglyph finalize (mod-owned, §D): stamp each fragment's pieceIndex and cap the required
// counts to what was actually placed — hieroglyph-specific logic the core serializer no longer owns.
assignFragmentPieceIndices(configs)
const hieroglyphRequired = cappedHieroglyphRequired(configs, HIEROGLYPH_REQUIRED)

printStats(configs)
const cov = hieroglyphCoverage(configs, HIEROGLYPH_REQUIRED)
console.log(`  Hieroglyph fragments: ${cov.assigned}/${cov.target} placed (${cov.total} total)`)
if (cov.uncovered.length > 0) console.warn(`  ⚠ Hieroglyphs with 0 fragments: ${cov.uncovered.join(", ")}`)

// The hieroglyph mod's baked data (capped per-hieroglyph piece targets) rides the generic
// modExports channel — core writes `export const hieroglyphRequired = …` without naming it.
writeFileSync(join(__dirname, "../src/data/generatedWorld.ts"), generateFile(configs, { hieroglyphRequired }))
console.log("✓ Written: src/data/generatedWorld.ts")
