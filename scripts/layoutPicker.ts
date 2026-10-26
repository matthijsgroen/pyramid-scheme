import { DEFAULT_PACKING, PACKING_CEILING } from "../src/game/siteAssembler"
import {
  ALL_INSIDE,
  describeLayoutFailure,
  PACKING_STEP,
  refusal,
  searchCarvePair,
  sidePathStages,
  verifyCarvePair,
  type LayoutFound,
  type LayoutNotFound,
  type SidePathStage,
} from "../src/worldGen/carveSeedSearch"
import { prepareLayout, searchLayout } from "../src/worldGen/layoutFeasibility"
import { gridShape, layoutKey } from "../src/worldGen/layoutCheck"
import type { FloorConfig as GameFloorConfig } from "../src/game/siteTypes"
import type { FloorConfig, SiteConfig } from "../src/worldGen/types"
import { floorAssemblySeed, persistentInteriorSeed } from "../src/game/siteSeed"
import { worldFloorCarve } from "../src/mods/carveWorldFloor"
import { unjudgedLocks } from "../src/game/lockPuzzles"
import type { CorridorAssignment } from "../src/game/corridorSidePaths"
import { floorHash, sourceFingerprint, type CarveLedger } from "./carveLedger"

// Seeds tried at each packing, offsets 0 … CARVE_SEED_BUDGET-1 from the floor's base seed.
export const CARVE_SEED_BUDGET = 100

const sameStage = (a: SidePathStage, b: SidePathStage) =>
  a.outsideLock.join() === b.outsideLock.join() && !a.corridorsTakeTwo === !b.corridorsTakeTwo

/** One floor's pick, for the bake's summary. */
export type FloorPick = {
  key: string
  authored: number
  packing: number
  offset: number
  laddered: boolean
  /** Locks on the picked grid whose puzzle on the way could not be judged (`judgeLockPuzzles`). */
  unjudged: string[]
  /** The side sections standing on a lock corridor, and on which. */
  corridors: CorridorAssignment[]
  /** Where the search stood the side paths: those outside the lock, and whether a corridor takes two. */
  sidePaths: SidePathStage
}

/** A floor no layout was picked for: its authoring cannot meet a hard criterion, or the bounded search met none. */
export type LayoutFailure = { key: string; kind: "infeasible" | "notFound"; message: string }

/** One floor carved exactly as play carves it (`worldFloorCarve`), at the floor's own pin when it carries one, and
 * prepared with the same resolvers for the feasibility check. */
export const carveAt = (journeyId: string, levelNr: number, floorIndex: number) => {
  const { seed, resolvers, carve: carveWorld } = worldFloorCarve(journeyId, levelNr, floorIndex)
  const carve = (config: FloorConfig, maxAttempts: number) => carveWorld(config as GameFloorConfig, maxAttempts)
  const prepare = (config: FloorConfig) => prepareLayout(journeyId, config as GameFloorConfig, seed, resolvers)
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
    "src/mods/carveWorldFloor.ts",
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
    // runtime carves its unstamped config. The side-path fields are written only where they say something, as the
    // bake writes them.
    const { outsideLock: _outside, corridorsTakeTwo: _two, ...authoring } = floor
    const standing = ({ outsideLock, corridorsTakeTwo }: SidePathStage): FloorConfig => ({
      ...authoring,
      ...(outsideLock.length > 0 ? { outsideLock } : {}),
      ...(corridorsTakeTwo ? { corridorsTakeTwo } : {}),
    })
    const assembleAt = (seed: number, packing: number, maxAttempts: number, sidePaths: SidePathStage) =>
      carve({ ...standing(sidePaths), seed, packing: packing === authored ? floor.packing : packing }, maxAttempts)
    const judge = (result: Parameters<typeof refusal>[0]) => refusal(result, floor as GameFloorConfig)
    const prepared = carve.prepare(authoring)
    const corridorsWith = (sidePaths: SidePathStage): CorridorAssignment[] => {
      const prep = carve.prepare(standing(sidePaths))
      return prep.ok ? [...prep.prep.sections.corridorAssignments] : []
    }
    const stages = prepared.ok
      ? sidePathStages(
          prepared.prep.sections.corridorCandidates,
          prepared.prep.sections.corridorAssignments,
          corridorsWith({ outsideLock: [], corridorsTakeTwo: true })
        )
      : [ALL_INSIDE]
    const options = {
      authoredPacking: authored,
      ceiling: PACKING_CEILING,
      seedBudget: CARVE_SEED_BUDGET,
      fullLadder: Infinity,
      judge,
      stages,
    }
    const hash = floorHash(carveSources, authoring, { ...options, step: PACKING_STEP })
    const pinned = baked?.[journeyId]?.[levelNr - 1]?.[floorIndex]
    const recorded = ledger[key]
    const result = searchLayout(authoring as GameFloorConfig, prepared, (): LayoutFound | LayoutNotFound => {
      // A pin at the most preferred side-path stage holds as any pin does. One at a later stage holds only while the
      // floor hashes as it did when it was found there: otherwise it is searched again from the first stage.
      const pinnedStage: SidePathStage = {
        outsideLock: pinned?.outsideLock ?? [],
        ...(pinned?.corridorsTakeTwo ? { corridorsTakeTwo: true as const } : {}),
      }
      const stageHolds =
        sameStage(pinnedStage, stages[0]) ||
        (recorded?.kind === "sidePaths" && recorded.hash === hash && sameStage(recorded.sidePaths, pinnedStage))
      const verified =
        pinned && stageHolds
          ? verifyCarvePair(
              base,
              { seed: pinned.seed ?? base, packing: pinned.packing ?? authored, sidePaths: pinnedStage },
              assembleAt,
              options
            )
          : null
      if (verified) {
        stats.verified++
        return verified
      }
      if (recorded?.kind === "notFound" && recorded.hash === hash) {
        stats.ledgered++
        return recorded.result
      }
      stats.searched++
      return searchCarvePair(base, assembleAt, options)
    })
    if (result.kind === "found") {
      picks.push({
        key,
        authored,
        packing: result.packing,
        offset: result.offset,
        laddered: result.laddered,
        unjudged: unjudgedLocks(result.grid, floor as GameFloorConfig),
        corridors: corridorsWith(result.sidePaths),
        sidePaths: result.sidePaths,
      })
      floor.seed = result.seed
      floor.packing = result.packing
      if (result.sidePaths.outsideLock.length > 0) floor.outsideLock = result.sidePaths.outsideLock
      else delete floor.outsideLock
      if (result.sidePaths.corridorsTakeTwo) floor.corridorsTakeTwo = true
      else delete floor.corridorsTakeTwo
      if (!sameStage(result.sidePaths, stages[0]))
        nextLedger[key] = { kind: "sidePaths", hash, sidePaths: result.sidePaths }
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
  const unjudged = picks.filter(f => f.unjudged.length > 0)
  if (unjudged.length > 0) {
    console.log(`  Floors with a lock whose puzzle on the way could not be judged (no control tied to its ground):`)
    for (const f of unjudged) console.log(`    ${f.key}: ${f.unjudged.join(", ")}`)
  }
  if (laddered.length > 0) {
    console.log(`  Floors that carve only on the ladder (accepted: they meet every hard criterion):`)
    for (const f of laddered) console.log(`    ${f.key}`)
  }
  printSidePaths(picks)
}

/** Where the side paths of lock floors stand: on the lock's corridors, or hung outside it where no layout fit them. */
const printSidePaths = (picks: FloorPick[]) => {
  const inLock = picks.filter(f => f.corridors.length > 0)
  const load = inLock.map(f => {
    const perCorridor = new Map<string, number>()
    for (const { corridor } of f.corridors) perCorridor.set(corridor, (perCorridor.get(corridor) ?? 0) + 1)
    return perCorridor
  })
  const corridors = load.reduce((sum, perCorridor) => sum + perCorridor.size, 0)
  const doubled = load.reduce((sum, perCorridor) => sum + [...perCorridor.values()].filter(n => n > 1).length, 0)
  const outside = picks.filter(f => f.sidePaths.outsideLock.length > 0)
  const moved = outside.reduce((sum, f) => sum + f.sidePaths.outsideLock.length, 0)
  console.log(
    `  Side paths: ${inLock.length} floor(s) carry side paths in their lock corridors (${corridors} corridors, ${doubled} taking two), ${moved} side path(s) on ${outside.length} floor(s) hang outside the lock`
  )
  for (const f of inLock)
    console.log(`    ${f.key}: ${f.corridors.map(({ section, corridor }) => `s${section} on ${corridor}`).join(", ")}`)
  if (outside.length > 0) {
    console.log(`  Side paths hung outside their lock (accepted: no layout fit them inside, one to a corridor):`)
    for (const f of outside)
      console.log(`    ${f.key}: ${f.sidePaths.outsideLock.map(section => `s${section}`).join(", ")}`)
  }
  const doubling = picks.filter(f => f.sidePaths.corridorsTakeTwo)
  if (doubling.length > 0) {
    console.log(`  Floors whose lock corridors take two side paths (no layout fit even with every side path outside):`)
    for (const f of doubling) console.log(`    ${f.key}`)
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
