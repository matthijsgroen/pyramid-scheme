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
import {
  findDeadRegions,
  findEmptyChests,
  findMispairedStairs,
  findStrandingLocks,
  findUnbakedSwitchBoards,
  findUndrawnHandles,
  findUndrawnOneWays,
  findUnwalkedLocks,
  floorsOwingALock,
} from "../src/worldGen/validate"
import { assembleFloor, DEFAULT_PACKING, PACKING_CEILING } from "../src/game/siteAssembler"
import { searchCarvePair, type CarveCriterion } from "../src/worldGen/carveSeedSearch"
import type { FloorGrid } from "../src/game/siteTypes"
import type { FloorConfig } from "../src/worldGen/types"
import { floorAssemblySeed, persistentInteriorSeed } from "../src/game/siteSeed"
import {
  resolveKeyRequirements,
  familyPriorityFor,
  familyCapacityFor,
  familyIsTrap,
  allocateEncounterSpread,
  resolveEncounterMeta,
  ALL_FAMILY_META,
} from "../src/mods/allFamilyMeta"
import { puzzleSeeds } from "../src/data/puzzleSeeds"
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
  REGISTERED_MOD_IDS,
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
  familyIsTrap,
  REGISTERED_MOD_IDS,
  resolveEncounterMeta
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
// player, permanently — so a carve that fails is collected rather than read as a floor with no
// chests on it, and reported below once every sweep has had its turn at it.
//
// One carve per floor, shared by every sweep that needs the grid rather than the spec.
// A floor is carved at the first (packing, seed) pair that carves on the assembler's FIRST attempt, walks
// sound and leaves no dead region: every seed at the authored `packing` is tried before the packing
// rises a step. Both are stamped on the floor only when they moved: a floor that needs no search stays
// implicitly seeded and keeps the packing its author wrote, so the baked world only names the floors the
// search changed, and the runtime carves exactly what was found here. A floor no pair satisfies is an
// authoring the assembler cannot satisfy, not bad luck, and is named (see STRICT_ATTEMPT_ZERO).
const CARVE_SEED_BUDGET = 100
// A floor no pair satisfies needs more than `packing` and a seed can give it (the grid the assembler
// derives is too small, and only its widening rungs grow it). Off, it is listed by name and carved by the
// ladder as the runtime carves it; on, it fails the build.
const STRICT_ATTEMPT_ZERO = process.env.STRICT_ATTEMPT_ZERO === "1"
const unsatisfiable: string[] = []
const unassembled: string[] = []
const carveSearch: {
  key: string
  offset: number
  baseRefusal: CarveCriterion | null
  authored: number
  packing: number
}[] = []
const grids = new Map<string, FloorGrid | null>()
const assembleOnce = (journeyId: string, floor: FloorConfig, levelNr: number, floorIndex: number) => {
  const cacheKey = `${journeyId}#${levelNr}#${floorIndex}`
  if (!grids.has(cacheKey)) {
    const base = floor.seed ?? floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
    // The whole address, so the ids derived from it here — a stairhead the authoring left unnamed,
    // a lever's gate stem — are the ones the runtime builds for this same floor.
    const floorRef = { journeyId, levelIndex: levelNr - 1, floorIndex }
    const authored = floor.packing ?? DEFAULT_PACKING
    // The authored packing is passed as written (possibly absent), so a floor the search leaves alone
    // carves exactly as the runtime carves its unstamped config.
    const assembleAt = (seed: number, packing: number, maxAttempts: number) =>
      assembleFloor(
        journeyId,
        { ...floor, seed, packing: packing === authored ? floor.packing : packing },
        base,
        resolveEncounterMeta,
        { resolveKeyRequirements, floorRef, maxAttempts }
      )
    const search = searchCarvePair(base, assembleAt, {
      authoredPacking: authored,
      ceiling: PACKING_CEILING,
      seedBudget: CARVE_SEED_BUDGET,
      fullLadder: Infinity,
    })
    // WITH WHY, NOT JUST WHERE. The assembler refuses an authoring it can never satisfy — a one-way
    // or a handle naming a section the floor does not have, a switch asking for more junctions than
    // `forks` reserves — and names it in the reason. Printed as a bare floor id, all of those reach
    // the author as "cannot be carved", which reads as a seed problem and sends them looking at the
    // wrong thing.
    if (search.found) {
      carveSearch.push({
        key: cacheKey,
        offset: search.offset,
        baseRefusal: search.baseRefusal,
        authored,
        packing: search.packing,
      })
      if (search.offset > 0) floor.seed = search.seed
      if (search.packing !== authored) floor.packing = search.packing
      grids.set(cacheKey, search.grid)
    } else {
      const refusal = `${journeyId} level ${levelNr} floor ${floorIndex}: no seed in ${search.tried} tries up to packing ${search.reached} satisfies "${search.hardest}" — ${search.detail}`
      unsatisfiable.push(refusal)
      carveSearch.push({ key: cacheKey, offset: 0, baseRefusal: search.baseRefusal, authored, packing: authored })
      const ladder = assembleAt(base, authored, Infinity)
      if (STRICT_ATTEMPT_ZERO || !ladder.success) unassembled.push(refusal)
      grids.set(cacheKey, ladder.success ? ladder.grid : null)
    }
  }
  return grids.get(cacheKey)!
}

const emptyChests = findEmptyChests(configs, assembleOnce)

printStats(configs)
const cov = hieroglyphCoverage(configs, HIEROGLYPH_REQUIRED)
console.log(`  Hieroglyph fragments: ${cov.assigned}/${cov.target} placed (${cov.total} total)`)

// A stair id is the pairing between the floor hosting the stairs and the floor arriving on them, so
// exactly two uses is the only sound count — three means two staircases answer to one id and the
// player is teleported to whichever floor the walk reaches first, one means a stairhead or an entrance
// with nothing on the other side. Checked off the spec, so the build that introduces the collision is
// the one that stops, rather than a player walking into the wrong floor months later.
const { paired, mispaired } = findMispairedStairs(configs)
if (mispaired.length > 0) {
  console.error(`✗ ${mispaired.length} stair id(s) are not wired exactly twice:`)
  for (const stair of mispaired.slice(0, 20))
    console.error(
      `    ${stair.stairId}: used ${stair.uses.length}× — ` +
        stair.uses.map(u => `${u.journeyId} level ${u.levelNr} floor ${u.floorIndex}`).join(", ")
    )
  if (mispaired.length > 20) console.error(`    … and ${mispaired.length - 20} more`)
  console.error("  Every staircase pairs one host floor with one arriving floor — see game/stairAddress.ts.")
  process.exit(1)
}
console.log(`  Stair sweep: ${paired} stair id(s), each wired exactly twice`)

// A board the offline pass never proved would be searched for on the player's device instead, which is
// the very thing the lists replaced — and it would happen quietly. So an authored switch whose shape and
// tier no list covers stops the build with its floor named: bake the list (`yarn generate-seeds`), or do
// not author the room. The playtest journey is excused by its capabilities, not by its id.
const unbakedSwitches = findUnbakedSwitchBoards(configs, ALL_FAMILY_META, puzzleSeeds)
if (unbakedSwitches.length > 0) {
  console.error(`✗ ${unbakedSwitches.length} authored switch board(s) have no baked seed list:`)
  for (const board of unbakedSwitches.slice(0, 20))
    console.error(
      `    ${board.journeyId} level ${board.levelNr} floor ${board.floorIndex}: ` +
        `${board.familyId} at ${board.difficulty}, ${board.forkShape} fork`
    )
  if (unbakedSwitches.length > 20) console.error(`    … and ${unbakedSwitches.length - 20} more`)
  console.error("  Run `yarn generate-seeds` to fill them.")
  process.exit(1)
}

// A drop the map still paints from both sides is a corridor the player walks into and falls out of, so
// it may stand only where meeting an undrawn mechanic is the point. The playtest journey is excused by
// its capabilities, not by its id; everywhere else the build stops with the floor named.
const undrawnDrops = findUndrawnOneWays(configs)
if (undrawnDrops.length > 0) {
  console.error(`✗ ${undrawnDrops.length} one-way drop(s) stand on floors that may not hold one:`)
  for (const drop of undrawnDrops.slice(0, 20))
    console.error(`    ${drop.journeyId} level ${drop.levelNr} floor ${drop.floorIndex}: ${drop.from} → ${drop.to}`)
  if (undrawnDrops.length > 20) console.error(`    … and ${undrawnDrops.length - 20} more`)
  console.error("  A drop is drawn from both sides today — author it on the develop journey until it is not.")
  process.exit(1)
}

// A lever nothing paints is a room with nothing to see and a door nothing on the floor holds a key to,
// so it may stand only where meeting an undrawn mechanic is the point — the same line the drop above
// holds, and the playtest journey is excused by its capabilities rather than by its id.
const undrawnHandles = findUndrawnHandles(configs)
if (undrawnHandles.length > 0) {
  console.error(`✗ ${undrawnHandles.length} handle(s) stand on floors that may not hold one:`)
  for (const handle of undrawnHandles.slice(0, 20))
    console.error(
      `    ${handle.journeyId} level ${handle.levelNr} floor ${handle.floorIndex}: ` +
        `${handle.in} ← ${handle.left.join(", ")} | → ${handle.right.join(", ")}`
    )
  if (undrawnHandles.length > 20) console.error(`    … and ${undrawnHandles.length - 20} more`)
  console.error("  A lever is undrawn today — author it on the develop journey until it is not.")
  process.exit(1)
}

// A floor whose lock can be put in a state it cannot be got out of is a floor a player can lose a run
// on, and nothing in the assembler would notice: a switch shutting the way back is a legal carve. The
// state it died in is printed because that is what a person walks by hand to confirm it.
const { walked, stranding } = findStrandingLocks(configs, assembleOnce)

// What the search did, printed on every run: how many floors carve at their authored packing and the
// address's own seed, how many needed a seed past it, and how many needed a packing above what was
// authored. The last is the author's cue: the authored value cannot carve, and the baked one is what the
// player gets, so each such floor is listed with how far it rose.
const moved = carveSearch.filter(f => f.offset > 0)
const raised = carveSearch.filter(f => f.packing !== f.authored)
const pastAttemptZero = carveSearch.filter(f => f.baseRefusal === "attempt 0")
console.log(
  `  Carve search: ${carveSearch.length} floor(s), ${moved.length} moved off their address seed (worst offset ${Math.max(0, ...carveSearch.map(f => f.offset))}), ${raised.length} raised above their authored packing (worst +${Math.max(0, ...carveSearch.map(f => f.packing - f.authored)).toFixed(2)}), ${pastAttemptZero.length} carve only past attempt 0 as authored, ${unsatisfiable.length} unsatisfiable up to packing ${PACKING_CEILING}`
)
for (const line of unsatisfiable) console.log(`    unsatisfiable: ${line}`)
if (raised.length > 0) {
  console.log(`  Floors whose authored packing cannot carve (authored -> baked), to correct in the authoring:`)
  for (const f of raised) console.log(`    ${f.key}: ${f.authored} -> ${f.packing}`)
}

// Reported once every sweep that carves a floor has had its turn, so it covers every assembly
// attempted rather than only the chest sweep's. Nothing is written: a floor that will not carve at
// its runtime seed renders "Site layout unavailable." for every player, permanently.
if (unassembled.length > 0) {
  console.error(`✗ ${unassembled.length} floor(s) cannot be carved at the seed the runtime hands them:`)
  for (const floor of unassembled.slice(0, 20)) console.error(`    ${floor}`)
  if (unassembled.length > 20) console.error(`    … and ${unassembled.length - 20} more`)
  process.exit(1)
}

// How far the sweep reached, printed on every run: a walk that reports no failure is otherwise
// indistinguishable from a walk that never got to a floor, and this is the number a reader compares
// against the authoring in front of them.
const owedALock = floorsOwingALock(configs)
console.log(`  Lock sweep: walked ${walked.length} of ${owedALock.length} floor(s) that author a mechanism`)

// Every floor that authors a switch in a reserved junction, or a lever, stands a mechanism on every
// carve — so each of them owes the walk a lock. Without this the day the wiring or the mechanism
// detection stops reaching one of them is the day the check turns into decoration for that floor, and
// it would stay green while it did.
const unwalked = findUnwalkedLocks(configs, walked)
if (unwalked.length > 0) {
  console.error(`✗ ${unwalked.length} floor(s) author a mechanism whose lock the sweep never walked:`)
  for (const floor of unwalked.slice(0, 20))
    console.error(`    ${floor.journeyId} level ${floor.levelNr} floor ${floor.floorIndex}`)
  if (unwalked.length > 20) console.error(`    … and ${unwalked.length - 20} more`)
  console.error("    Either the sweep is not reaching those floors, or floorLock no longer reads their mechanism.")
  process.exit(1)
}

if (stranding.length > 0) {
  console.error(`✗ ${stranding.length} floor(s) hold a lock a player can be stranded in:`)
  for (const floor of stranding.slice(0, 20))
    console.error(`    ${floor.journeyId} level ${floor.levelNr} floor ${floor.floorIndex}: ${floor.problem}`)
  if (stranding.length > 20) console.error(`    … and ${stranding.length - 20} more`)
  process.exit(1)
}

// A lock can walk sound — the way out always stays reachable — and still deadlock two of its own
// mechanisms against each other, leaving a region no reachable state ever stands in. A ward or a key
// earned off this floor is read as openable elsewhere and left alone (`deadRegions`, game/lockWalk.ts),
// so only a region every bounding gate of which answers solely to an on-floor mechanism is named here.
const stuckRegions = findDeadRegions(configs, assembleOnce)
if (stuckRegions.length > 0) {
  console.error(`✗ ${stuckRegions.length} floor(s) leave a region no reachable state stands in:`)
  for (const floor of stuckRegions.slice(0, 20))
    console.error(
      `    ${floor.journeyId} level ${floor.levelNr} floor ${floor.floorIndex}: ${floor.regions.join(", ")}`
    )
  if (stuckRegions.length > 20) console.error(`    … and ${stuckRegions.length - 20} more`)
  console.error(
    "  Two on-floor mechanisms are deadlocking each other's gate — the loot behind it can never be collected."
  )
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
