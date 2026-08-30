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
import { findEmptyChests } from "../src/worldGen/validate"
import { assembleFloor } from "../src/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "../src/game/siteSeed"
import {
  resolveKeyRequirements,
  familyPriorityFor,
  familyCapacityFor,
  familyIsTrap,
  allocateEncounterSpread,
  resolveEncounterMeta,
} from "../src/mods/allFamilyMeta"
import { ALL_CURRENCY_DISTRIBUTIONS } from "../src/mods/allCurrencyDistributions"
import { HIEROGLYPH_REQUIRED } from "../src/mods/hieroglyph/game/hieroglyphData"
import { assignFragmentPieceIndices, hieroglyphCoverage } from "../src/mods/hieroglyph/game/fragmentFinalize"
import {
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_WORLD_VALIDATORS,
  MOD_REACHABILITY_SUPPORT,
  MOD_TOMB_TREASURE_RESOLVER,
  MOD_SHOP_STOCK,
  MOD_RESERVED_TREASURE_INDICES,
} from "../src/mods/registeredMods"

// The share of loot-eligible slots deliberately left empty so found loot stays meaningful (no
// 1-coin spam). A core world-gen knob (docs/mods/distribution-primitive-design.md); 0 = fill by
// reward priority + budget alone. Dial up after a regen feel-check if loot reads as too dense.
const EMPTY_FRACTION = 0

const __dirname = dirname(fileURLToPath(import.meta.url))

const errors = validateWorldSpec()
if (errors.length > 0) {
  console.error("✗ World spec validation failed:")
  errors.forEach(e => console.error(`  ${e.tombId}: ${e.message}`))
  process.exit(1)
}

const validateOnly = process.argv.includes("--validate-only")

// --validate-only must still run the full build — including every registered worldValidator
// (the hieroglyph coverage guard among them) — not just the spec-shape check above. Skipping
// buildConfigs here used to mean `yarn validate-world` could never catch a coverage shortfall;
// it only skips the file write below.
const configs = buildConfigs(
  resolveKeyRequirements,
  ALL_CURRENCY_DISTRIBUTIONS,
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_WORLD_VALIDATORS,
  familyPriorityFor,
  EMPTY_FRACTION,
  allocateEncounterSpread,
  MOD_REACHABILITY_SUPPORT,
  MOD_TOMB_TREASURE_RESOLVER,
  familyCapacityFor,
  MOD_SHOP_STOCK,
  MOD_RESERVED_TREASURE_INDICES,
  familyIsTrap
)
// Hieroglyph finalize (mod-owned, §D): stamp each fragment's pieceIndex — hieroglyph-specific
// logic the core serializer no longer owns. Every symbol's full required count is guaranteed
// placed by this point (placeFragments.ts's completion pass + the hieroglyph coverage
// worldValidator both hard-fail otherwise), so HIEROGLYPH_REQUIRED is written as-is — no capping.
assignFragmentPieceIndices(configs)

// Chests are authored, so the generator does not quietly work around one that holds nothing — it
// stops, and leaves the call to the author: add loot, or take the chest out. Assembles each floor at
// the seed a player actually gets, because a spec cannot tell an empty chest from a floor-key host.
// A floor that will not carve at its runtime seed renders "Site layout unavailable." for every
// player, permanently — so the sweep that already visits each one at that exact seed reports it here
// rather than reading a failure as a floor with no chests on it.
const unassembled: string[] = []
const emptyChests = findEmptyChests(configs, (journeyId, floor, levelNr, floorIndex) => {
  const seed = floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
  const result = assembleFloor(journeyId, floor, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId, floorIndex },
  })
  if (!result.success) unassembled.push(`${journeyId} level ${levelNr} floor ${floorIndex}`)
  return result.success ? result.grid : null
})

printStats(configs)
const cov = hieroglyphCoverage(configs, HIEROGLYPH_REQUIRED)
console.log(`  Hieroglyph fragments: ${cov.assigned}/${cov.target} placed (${cov.total} total)`)

// Reported after the stats, so a run that stops here still shows what it built. Nothing is written:
// an empty chest is a question for the author, and shipping a world that asks a player to open one
// for nothing is not the answer.
if (unassembled.length > 0) {
  console.error(`✗ ${unassembled.length} floor(s) cannot be carved at the seed the runtime hands them:`)
  for (const floor of unassembled.slice(0, 20)) console.error(`    ${floor}`)
  if (unassembled.length > 20) console.error(`    … and ${unassembled.length - 20} more`)
  process.exit(1)
}

if (emptyChests.length > 0) {
  console.error(`✗ ${emptyChests.length} chest(s) hold nothing — give them loot or take them out:`)
  for (const c of emptyChests.slice(0, 20))
    console.error(`    ${c.journeyId} level ${c.levelNr} floor ${c.floorIndex} at ${c.row},${c.col}`)
  if (emptyChests.length > 20) console.error(`    … and ${emptyChests.length - 20} more`)
  process.exit(1)
}

if (validateOnly) {
  console.log("✓ World spec valid")
  process.exit(0)
}

// The hieroglyph mod's baked data (per-hieroglyph piece targets) rides the generic modExports
// channel — core writes `export const hieroglyphRequired = …` without naming it.
writeFileSync(
  join(__dirname, "../src/data/generatedWorld.ts"),
  generateFile(configs, { hieroglyphRequired: HIEROGLYPH_REQUIRED })
)
console.log("✓ Written: src/data/generatedWorld.ts")
