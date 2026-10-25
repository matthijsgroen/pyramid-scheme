import { assembleFloor, DEFAULT_PACKING, PACKING_CEILING } from "../src/game/siteAssembler"
import {
  describeLayoutFailure,
  PACKING_STEP,
  refusal,
  searchCarvePair,
  verifyCarvePair,
  type LayoutFound,
  type LayoutNotFound,
} from "../src/worldGen/carveSeedSearch"
import { prepareLayout, searchLayout } from "../src/worldGen/layoutFeasibility"
import { gridShape, layoutKey } from "../src/worldGen/layoutCheck"
import type { FloorConfig as GameFloorConfig } from "../src/game/siteTypes"
import type { FloorConfig, SiteConfig } from "../src/worldGen/types"
import { floorAssemblySeed, persistentInteriorSeed } from "../src/game/siteSeed"
import { resolveKeyRequirements, resolveEncounterMeta } from "../src/mods/allFamilyMeta"
import { resolveOneWayRealisation } from "../src/mods/allOneWayRealisations"
import { resolvePassageRealisation } from "../src/mods/allPassageRealisations"
import { floorHash, sourceFingerprint, type CarveLedger } from "./carveLedger"

// Seeds tried at each packing, offsets 0 … CARVE_SEED_BUDGET-1 from the floor's base seed.
export const CARVE_SEED_BUDGET = 100

/** One floor's pick, for the bake's summary. */
export type FloorPick = { key: string; authored: number; packing: number; offset: number; laddered: boolean }

/** A floor no layout was picked for: its authoring cannot meet a hard criterion, or the bounded search met none. */
export type LayoutFailure = { key: string; kind: "infeasible" | "notFound"; message: string }

/** One floor carved with the bake's resolvers at its address, at the floor's own pin when it carries one. */
export const carveAt = (journeyId: string, levelNr: number, floorIndex: number) => {
  const base = floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
  // The whole address, so the ids derived from it here — a stairhead the authoring left unnamed,
  // a lever's gate stem — are the ones the runtime builds for this same floor.
  const floorRef = { journeyId, levelIndex: levelNr - 1, floorIndex }
  const resolvers = {
    resolveKeyRequirements,
    resolveOneWay: resolveOneWayRealisation,
    resolvePassage: resolvePassageRealisation,
    floorRef,
  }
  const carve = (config: FloorConfig, maxAttempts: number) =>
    assembleFloor(journeyId, config as GameFloorConfig, base, resolveEncounterMeta, { ...resolvers, maxAttempts })
  const prepare = (config: FloorConfig) =>
    prepareLayout(journeyId, config as GameFloorConfig, base, { ...resolvers, resolveEncounter: resolveEncounterMeta })
  return Object.assign(carve, { prepare })
}

/** A lock whose inputs come from outside the floor (a web's `A outside`) is bound by the web, which is laid only
 * after the layout is picked: such a lock cannot carve when its floor is picked, so it is refused by name. */
export const unboundOutsideInputs = (configs: Record<string, SiteConfig[]>): string[] =>
  Object.entries(configs).flatMap(([journeyId, sites]) =>
    sites.flatMap((site, levelIndex) =>
      site.flatMap((floor, floorIndex) =>
        (floor.locks ?? [])
          .filter(placed => (placed.lock.inputs?.length ?? 0) > 0 && !placed.web)
          .map(
            placed =>
              `${journeyId} level ${levelIndex + 1} floor ${floorIndex}: lock ${placed.as ?? placed.lock.name} takes inputs from outside the floor, which the web binds only after the layout is picked`
          )
      )
    )
  )

/**
 * THE LAYOUT STAGE OF THE BAKE: every floor of the structural world gets the layout closest to its authored packing
 * that meets every hard criterion (carveSeedSearch.ts), or is listed as a failure. A floor whose authoring cannot meet
 * a criterion at any seed is infeasible and never carved (layoutFeasibility.ts). A floor already carrying a baked
 * (seed, packing) is verified in one carve and searched only when the pair no longer holds. A floor the search once
 * found nothing for is recorded in the ledger against a hash of its authoring and of every source file the carve
 * reads, and is not searched again while neither changes.
 */
export const makeLayoutPicker = ({
  ledger,
  baked,
}: {
  ledger: CarveLedger
  /** The committed world's floors, whose pins are verified before any search; none for a full re-search. */
  baked?: Record<string, FloorConfig[][]>
}) => {
  const nextLedger: CarveLedger = {}
  const carveSources = sourceFingerprint([
    "src/game/siteAssembler.ts",
    "src/worldGen/carveSeedSearch.ts",
    "src/mods/allFamilyMeta.ts",
  ])
  const stats = { verified: 0, ledgered: 0, searched: 0, infeasible: 0 }
  const failures: LayoutFailure[] = []
  const picks: FloorPick[] = []
  // The shape of every floor's grid as its layout was picked: what the final world must still carve to.
  const pickedShapes = new Map<string, string>()

  const pickFloor = (journeyId: string, floor: FloorConfig, levelNr: number, floorIndex: number) => {
    const key = layoutKey(journeyId, levelNr, floorIndex)
    const where = `${journeyId} level ${levelNr} floor ${floorIndex}`
    const base = floor.seed ?? floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
    const authored = floor.packing ?? DEFAULT_PACKING
    const carve = carveAt(journeyId, levelNr, floorIndex)
    // The authored packing is passed as written (possibly absent), so a floor pinned at it carves exactly as the
    // runtime carves its unstamped config.
    const assembleAt = (seed: number, packing: number, maxAttempts: number) =>
      carve({ ...floor, seed, packing: packing === authored ? floor.packing : packing }, maxAttempts)
    const judge = (result: Parameters<typeof refusal>[0]) => refusal(result, floor as GameFloorConfig)
    const options = {
      authoredPacking: authored,
      ceiling: PACKING_CEILING,
      seedBudget: CARVE_SEED_BUDGET,
      fullLadder: Infinity,
      judge,
    }
    const hash = floorHash(carveSources, floor, { ...options, step: PACKING_STEP })
    const pinned = baked?.[journeyId]?.[levelNr - 1]?.[floorIndex]
    const result = searchLayout(floor as GameFloorConfig, carve.prepare(floor), (): LayoutFound | LayoutNotFound => {
      const verified = pinned
        ? verifyCarvePair(base, { seed: pinned.seed ?? base, packing: pinned.packing ?? authored }, assembleAt, options)
        : null
      if (verified) {
        stats.verified++
        return verified
      }
      const recorded = ledger[key]
      if (recorded?.kind === "notFound" && recorded.hash === hash) {
        stats.ledgered++
        return recorded.result
      }
      stats.searched++
      return searchCarvePair(base, assembleAt, options)
    })
    if (result.kind === "found") {
      picks.push({ key, authored, packing: result.packing, offset: result.offset, laddered: result.laddered })
      floor.seed = result.seed
      floor.packing = result.packing
      pickedShapes.set(key, gridShape(result.grid))
      return
    }
    if (result.kind === "infeasible") stats.infeasible++
    else nextLedger[key] = { kind: "notFound", hash, result }
    failures.push({ key, kind: result.kind, message: describeLayoutFailure(where, result) })
  }

  /** Picks every floor of `configs`, writing each found pair on its floor; failures are collected, never thrown. */
  const pickAll = (configs: Record<string, SiteConfig[]>) => {
    for (const [journeyId, sites] of Object.entries(configs))
      sites.forEach((site, levelIndex) => site.forEach((floor, f) => pickFloor(journeyId, floor, levelIndex + 1, f)))
  }

  return { pickAll, pickedShapes, failures, picks, stats, nextLedger }
}

/** The summary every layout pass prints: how many floors moved off their seed or packing, and how many carve only
 * on the ladder. */
export const printPicks = (picks: FloorPick[], stats: ReturnType<typeof makeLayoutPicker>["stats"]) => {
  const moved = picks.filter(f => f.offset > 0)
  const raised = picks.filter(f => f.packing !== f.authored)
  const laddered = picks.filter(f => f.laddered)
  console.log(
    `  Layouts: ${picks.length} floor(s) picked, ${moved.length} moved off their address seed (worst offset ${Math.max(0, ...picks.map(f => f.offset))}), ${raised.length} raised above their authored packing (worst +${Math.max(0, ...picks.map(f => f.packing - f.authored)).toFixed(2)}), ${laddered.length} carve only on the ladder`
  )
  console.log(
    `  Layout pins: ${stats.verified} verified in one carve, ${stats.ledgered} not-found floor(s) read from the ledger, ${stats.searched} searched, ${stats.infeasible} infeasible`
  )
  if (raised.length > 0) {
    console.log(`  Floors whose authored packing cannot carve (authored -> baked), to correct in the authoring:`)
    for (const f of raised) console.log(`    ${f.key}: ${f.authored} -> ${f.packing}`)
  }
  if (laddered.length > 0) {
    console.log(`  Floors that carve only on the ladder (accepted: they meet every hard criterion):`)
    for (const f of laddered) console.log(`    ${f.key}`)
  }
}

/** The failures, every one of them, under one heading. */
export const printFailures = (failures: LayoutFailure[]) => {
  const infeasible = failures.filter(f => f.kind === "infeasible")
  const notFound = failures.filter(f => f.kind === "notFound")
  if (infeasible.length > 0) {
    console.error(`✗ ${infeasible.length} floor(s) whose authoring no layout can satisfy:`)
    for (const f of infeasible) for (const line of f.message.split("\n")) console.error(`    ${line}`)
  }
  if (notFound.length > 0) {
    console.error(`✗ ${notFound.length} floor(s) with no layout in the search's budget:`)
    for (const f of notFound) console.error(`    ${f.message}`)
  }
}
