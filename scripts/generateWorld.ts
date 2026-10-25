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
import { buildWorldConfigs } from "../src/mods/buildWorldConfigs"
import { MOD_REACHABILITY_SUPPORT } from "../src/mods/registeredMods"
import { checkPlacedWeb } from "../src/worldGen/webBakeCheck"
import { placementMoved, webJourneysOf } from "../src/worldGen/webPlacement"
import { layoutKey, layoutMoved } from "../src/worldGen/layoutCheck"
import type { PickLayout } from "../src/worldGen/configBuilder"
import type { WebPlacement } from "../src/worldGen/webPlacement"
import { generateFile, printStats } from "../src/worldGen/serializer"
import { validateWorldSpec } from "../src/worldGen/validateWorldSpec"
import {
  findDeadRegions,
  findEmptyChests,
  findMispairedStairs,
  findStrandingLocks,
  findUnbakedSwitchBoards,
  findUnseededDoorBoards,
  findUnwalkedLocks,
  floorsOwingALock,
  stuckPoints,
} from "../src/worldGen/validate"
import { worldGateWalk } from "../src/mods/worldGateWalk"
import { refusal as carveRefusal } from "../src/worldGen/carveSeedSearch"
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { readLedger, writeLedger } from "./carveLedger"
import { carveAt, makeLayoutPicker, printFailures, printPicks, unboundOutsideInputs } from "./layoutPicker"
import type { FloorConfig as GameFloorConfig, FloorGrid } from "../src/game/siteTypes"
import type { FloorConfig } from "../src/worldGen/types"
import { resolveEncounterMeta, ALL_FAMILY_META } from "../src/mods/allFamilyMeta"
import { puzzleSeeds } from "../src/data/puzzleSeeds"
import { HIEROGLYPH_REQUIRED } from "../src/mods/hieroglyph/game/hieroglyphData"
import { assignFragmentPieceIndices, hieroglyphCoverage } from "../src/mods/hieroglyph/game/fragmentFinalize"

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

// THE LAYOUT IS PICKED BEFORE THE LOOT. `pickLayout` runs inside the build (configBuilder.ts) once the world's
// structure is final and before the web and any loot are placed: every floor gets the layout closest to its authored
// packing that meets every hard criterion (layoutPicker.ts), and placement then walks the floors the player walks.
// Nothing placed afterwards may move a wall: the final world is carved again from scratch and compared with the pick
// (`layoutMoved`), and a web that lands elsewhere on it is refused too (`placementMoved`).
//
// Both `seed` and `packing` are stamped on EVERY floor, including the ones where they equal what the address formula
// and DEFAULT_PACKING produce: a floor that leaned on either would re-carve silently the day the seed formula, a
// journey id or the default moved.
//
// CARVE_RESEARCH=1 is a full re-search from scratch: every baked pin and every ledger entry is ignored. Run it after
// changing the assembler or adding a criterion, so the pins are the layouts closest to the authoring under today's
// rules rather than the ones that happened to hold before.
const CARVE_RESEARCH = process.env.CARVE_RESEARCH === "1"
const picker = makeLayoutPicker({
  ledger: CARVE_RESEARCH ? {} : readLedger(),
  baked: CARVE_RESEARCH ? undefined : generatedWorldConfigs,
})

// Every floor of the structural world gets its layout, or is named. A floor no layout meets renders a floor a player
// can lose a run on, or none at all, so the bake stops here, after every floor has been tried and before any loot is
// placed, listing every one of them.
const pickLayout: PickLayout = configs => {
  const outside = unboundOutsideInputs(configs)
  if (outside.length > 0) {
    console.error(`✗ ${outside.length} lock(s) cannot carve before the web is laid:`)
    for (const line of outside) console.error(`    ${line}`)
    process.exit(1)
  }
  picker.pickAll(configs)
  if (picker.failures.length > 0) {
    printPicks(picker.picks, picker.stats)
    printFailures(picker.failures)
    writeLedger(picker.nextLedger)
    process.exit(1)
  }
}

// --validate-only runs the full build — including every registered worldValidator (the hieroglyph
// coverage guard among them) — so `yarn validate-world` catches a coverage shortfall; it skips only
// the file write below.
const webPlacements: WebPlacement[] = []
const configs = buildWorldConfigs(EMPTY_FRACTION, { pickLayout, onWebPlaced: placed => webPlacements.push(placed) })
// Hieroglyph finalize (mod-owned, §D): stamp each fragment's pieceIndex — hieroglyph-specific
// logic the core serializer no longer owns. Every symbol's full required count is guaranteed
// placed by this point (placeFragments.ts's completion pass + the hieroglyph coverage
// worldValidator both hard-fail otherwise), so HIEROGLYPH_REQUIRED is written as-is — no capping.
assignFragmentPieceIndices(configs)

// THE FINAL WORLD, CARVED AFRESH: every sweep below reads these grids, never the ones the pick carved, so what it
// checks is the floor with its loot in it, as play carves it.
const finalGrids = new Map<string, FloorGrid | null>()
const carveFinal = (journeyId: string, floor: FloorConfig, levelNr: number, floorIndex: number): FloorGrid | null => {
  const key = layoutKey(journeyId, levelNr, floorIndex)
  if (!finalGrids.has(key)) {
    const result = carveAt(journeyId, levelNr, floorIndex)(floor, Infinity)
    finalGrids.set(key, result.success ? result.grid : null)
  }
  return finalGrids.get(key)!
}
const finalGridOf = (journeyId: string, levelNr: number, floorIndex: number) =>
  carveFinal(journeyId, configs[journeyId][levelNr - 1][floorIndex], levelNr, floorIndex)

// Loot placed after the pick must move no wall, and the web must stand where it was placed.
const movedAfterPick = [
  ...layoutMoved(picker.pickedShapes, configs, (journeyId, levelNr, floorIndex, config) =>
    carveFinal(journeyId, config as FloorConfig, levelNr, floorIndex)
  ),
  ...webPlacements.flatMap(placed => placementMoved(placed, configs, (id, levelNr, f) => finalGridOf(id, levelNr, f)!)),
]
if (movedAfterPick.length > 0) {
  console.error(`✗ ${movedAfterPick.length} floor(s) or web placement(s) moved after the layout was picked:`)
  for (const line of movedAfterPick.slice(0, 20)) console.error(`    ${line}`)
  if (movedAfterPick.length > 20) console.error(`    … and ${movedAfterPick.length - 20} more`)
  process.exit(1)
}

// A web floor's layout is picked before its web is laid, so once the web's doors stand on it the floor is asked the
// hard criteria again: a door can shut what its lock's walk counted on.
const webFloorsRefused = webJourneysOf(configs).flatMap(([, id]) =>
  configs[id].flatMap((site, levelIndex) =>
    site.flatMap((floor, f) => {
      const result = carveAt(id, levelIndex + 1, f)(floor, Infinity)
      const refused = carveRefusal(result, floor as GameFloorConfig)
      if (!refused) return []
      return [
        `${id} level ${levelIndex + 1} floor ${f}: "${refused.criterion}" once the web is laid — ${refused.detail}`,
      ]
    })
  )
)
if (webFloorsRefused.length > 0) {
  console.error(`✗ ${webFloorsRefused.length} web floor(s) fail their layout once the web is laid:`)
  for (const line of webFloorsRefused) console.error(`    ${line}`)
  process.exit(1)
}

// THE STAMPED WORLD, WALKED AFRESH: a strict walk from empty hands over the final configs, every floor carved again,
// must enter every journey, open every tier and pass every lock. The mod validators already ran on this same pinned
// world inside the build, so only the walk is asked here.
const { walk: finalWalk, journeyMeta } = worldGateWalk(configs)
const stuck = stuckPoints(finalWalk, journeyMeta)
const walkedJourneys = `strict walk enters ${finalWalk().enteredJourneys.size} of ${Object.keys(journeyMeta).length} journeys`
if (stuck.length > 0) {
  console.error(`✗ ${walkedJourneys}; ${stuck.length} place(s) a player gets stuck:`)
  for (const line of stuck) console.error(`    ${line}`)
  process.exit(1)
}
console.log(`  ${walkedJourneys}`)

const emptyChests = findEmptyChests(configs, carveFinal)

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
// not author the room.
const unbakedSwitches = findUnbakedSwitchBoards(configs, ALL_FAMILY_META, puzzleSeeds)
if (unbakedSwitches.length > 0) {
  console.error(`✗ ${unbakedSwitches.length} authored switch board(s) have no baked seed list:`)
  for (const board of unbakedSwitches.slice(0, 20))
    console.error(
      `    ${board.journeyId} level ${board.levelNr} floor ${board.floorIndex}: ` +
        `${board.familyId} at ${board.difficulty}, ${board.forkShape} fork`
    )
  if (unbakedSwitches.length > 20) console.error(`    … and ${unbakedSwitches.length - 20} more`)
  console.error("  Run `yarn generate-seeds` (it reads the spec, not the bake), then `yarn generate-world` again.")
  process.exit(1)
}

const unseededDoors = findUnseededDoorBoards(configs, ALL_FAMILY_META, puzzleSeeds)
if (unseededDoors.length > 0) {
  console.error(`✗ ${unseededDoors.length} door board(s) have no seed list:`)
  for (const door of unseededDoors)
    console.error(
      `    ${door.familyId}BoardUnseeded tier=${door.difficulty} steps=${door.steps}: ` +
        `${door.journeyId} level ${door.levelNr} floor ${door.floorIndex}, ${door.mechanismId}`
    )
  console.error(
    "  Run `yarn generate-seeds`, then `yarn generate-world` again. A tier and step count it finds no seed for needs a\n" +
      "  band of its own (yarn tsx scripts/processionDoorSeeds.ts prints the table)."
  )
  process.exit(1)
}

// A floor whose lock can be put in a state it cannot be got out of is a floor a player can lose a run
// on, and nothing in the assembler would notice: a switch shutting the way back is a legal carve. The
// state it died in is printed because that is what a person walks by hand to confirm it.
const { walked, stranding } = findStrandingLocks(configs, carveFinal)

// What the layout stage did, printed on every run: how many floors moved off their address seed, how many needed a
// packing above what was authored (the author's cue: the authored value cannot carve, so each is listed with how far
// it rose), and how many carve only on the ladder.
printPicks(picker.picks, picker.stats)
if (CARVE_RESEARCH) console.log("  (CARVE_RESEARCH=1: every pin and ledger entry ignored)")

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
  console.error(`✗ ${stranding.length} floor(s) hold a lock a player can be stranded in or lose a region of:`)
  for (const floor of stranding.slice(0, 20))
    console.error(`    ${floor.journeyId} level ${floor.levelNr} floor ${floor.floorIndex}: ${floor.problem}`)
  if (stranding.length > 20) console.error(`    … and ${stranding.length - 20} more`)
  process.exit(1)
}

// A lock can walk sound — the way out always stays reachable — and still deadlock two of its own
// mechanisms against each other, leaving a region no reachable state ever stands in. A ward or a key
// earned off this floor is read as openable elsewhere and left alone (`deadRegions`, game/lockWalk.ts),
// so only a region every bounding gate of which answers solely to an on-floor mechanism is named here.
const stuckRegions = findDeadRegions(configs, carveFinal)
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

// THE WEB ON THE PINNED FLOORS: where every stop and activator landed, the real floor walks, the doors shutting what
// they stand before, and the world solver agreeing with the web walk. Printed in full, refused on any failure.
for (const placed of webPlacements) {
  const { report, failures } = checkPlacedWeb(
    placed,
    configs,
    (journeyId, levelNr, floorIndex) => finalGridOf(journeyId, levelNr, floorIndex)!,
    MOD_REACHABILITY_SUPPORT,
    resolveEncounterMeta
  )
  console.log(report)
  if (failures.length > 0) {
    console.error(`✗ the web ${placed.resolved.web.name} fails on the baked floors:`)
    for (const failure of failures) console.error(`    ${failure}`)
    process.exit(1)
  }
}

if (emptyChests.length > 0) {
  console.error(`✗ ${emptyChests.length} chest(s) hold nothing — give them loot or take them out:`)
  for (const c of emptyChests.slice(0, 20))
    console.error(`    ${c.journeyId} level ${c.levelNr} floor ${c.floorIndex} at ${c.row},${c.col} (${c.place})`)
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
writeLedger(picker.nextLedger)
console.log("✓ Written: src/data/carveLedger.json")
console.log("  Run `yarn loot-report` to refresh docs/loot-report.md")
