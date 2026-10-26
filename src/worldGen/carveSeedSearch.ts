import { walkFloorLock, describeFloorWalkFailure, deadFloorRegions } from "@/game/floorLockWalk"
import { lockGroundUnfed, lockWithoutPuzzle } from "@/game/lockPuzzles"
import type { AssemblerResult, FloorConfig, FloorGrid } from "@/game/siteTypes"
import type { CorridorAssignment } from "@/game/corridorSidePaths"
import { roomlessRouteStubs } from "@/game/routeStubs"

/** What every picked layout meets, in the order they are asked; a carve that fails one is never asked the next.
 * Packing and the carve's attempt are no criteria: they order the search (`searchCarvePair`). */
export const HARD_CRITERIA = [
  "carves",
  "lock walks sound",
  "lock holds an encounter",
  "no dead region",
  "every stub holds a room",
] as const
export type HardCriterion = (typeof HARD_CRITERIA)[number]
export type CarveRefusal = { criterion: HardCriterion; detail: string }

/** The authoring a criterion is answered in, named in a failure so the author knows where to look. */
export const AUTHORING_FIELD: Record<HardCriterion, string> = {
  carves: "the floor's content or its locks",
  "lock walks sound": "locks",
  "lock holds an encounter":
    "where the lock stands (a lock placed before the floor's content, lockBeforeFloorContent), its regions' `takes`, or pathPuzzles and sideSections (any puzzle, trap, chest or shop on the lock's way counts)",
  "no dead region": "locks",
  "every stub holds a room": "sideSections or locks",
}

/** A layout that meets every hard criterion. `laddered`: it carves only on the runtime ladder, past attempt 0. */
export type LayoutFound = {
  kind: "found"
  seed: number
  /** The `packing` that carved: the authored one, or the smallest raised one that carved. */
  packing: number
  laddered: boolean
  grid: FloorGrid
  /** How far past the base seed the pinned seed lies: 0 is the address's own seed. */
  offset: number
  /** Where the floor's side paths stand: the stage of `sidePathStages` that carved. */
  sidePaths: SidePathStage
}
/** The bounded search met no candidate: the furthest criterion any candidate reached, and how often each refused. */
export type LayoutNotFound = {
  kind: "notFound"
  hardest: HardCriterion
  detail: string
  counts: Partial<Record<HardCriterion, number>>
  seeds: number
  packings: number
  /** How many side-path stages were searched (`sidePathStages`). */
  stages: number
}
/** The authoring cannot meet a criterion at any seed, decided before any carve (layoutFeasibility.ts). */
export type LayoutInfeasible = {
  kind: "infeasible"
  criterion: HardCriterion
  detail: string
  /** Every infeasibility the authoring has, the first of which is `criterion`. */
  all: CarveRefusal[]
}
export type LayoutResult = LayoutFound | LayoutNotFound | LayoutInfeasible

/** Stamped seeds live in [0, 2^32). An address seed is `generateNewSeed`'s up to 1e16, past
 * `Number.MAX_SAFE_INTEGER`, and `floorAssemblySeed` adds to it, so a stamped `base + offset` could round to
 * a neighbour or lose the offset altogether. Reducing the base modulo 2^32 before adding keeps every
 * stamped seed an exact integer that survives being written as a literal. */
export const STAMPED_SEED_RANGE = 2 ** 32

/** The seed `offset` steps along from `base`. Offset 0 is the address's own seed, untouched; any other
 * offset is reduced into the stamped range, so the value the search carved is the value that is written. */
export const seedAtOffset = (base: number, offset: number): number =>
  offset === 0 ? base : ((base % STAMPED_SEED_RANGE) + offset) % STAMPED_SEED_RANGE

export { roomlessRouteStubs }

/** Which hard criterion `result` misses, or null when it meets them all. `floor` is the authoring carved: its locks'
 * region appetites are part of "lock holds an encounter". */
export const refusal = (result: AssemblerResult, floor: Pick<FloorConfig, "locks">): CarveRefusal | null => {
  if (!result.success) return { criterion: "carves", detail: JSON.stringify(result.reasons) }
  const walk = walkFloorLock(result.grid)
  if (!walk) return null
  if (!walk.sound) return { criterion: "lock walks sound", detail: describeFloorWalkFailure(walk.failure) }
  const unfed = [
    ...lockWithoutPuzzle(result.grid, floor).map(lock => `lock ${lock} has no encounter on its way`),
    ...lockGroundUnfed(result.grid, floor),
  ]
  if (unfed.length > 0) return { criterion: "lock holds an encounter", detail: unfed.join(", ") }
  const dead = deadFloorRegions(result.grid)
  if (dead.length > 0) return { criterion: "no dead region", detail: dead.join(", ") }
  const bare = roomlessRouteStubs(result.grid)
  if (bare.length > 0) return { criterion: "every stub holds a room", detail: bare.join(", ") }
  return null
}

/** How much `packing` rises between sweeps. Small, so the final value stays near what the author wrote;
 * a carve costs well under a millisecond, so a fine ladder costs the bake seconds, not the player anything. */
export const PACKING_STEP = 0.02

/** The `packing` the `rung`-th sweep asks for: the authored value, then `step` more per rung. Rounded to
 * six places so the value written into the baked file is the one that was carved, with no float drift. */
export const packingAtRung = (authored: number, rung: number, step: number = PACKING_STEP): number =>
  Math.round((authored + rung * step) * 1e6) / 1e6

/** Every packing the search asks, closest to the authored one first: the authored value, then each step up to
 * `ceiling`. A packing authored above the ceiling is asked at its own value only. */
export const packingsFor = (authored: number, ceiling: number, step: number = PACKING_STEP): number[] => {
  const packings = [authored]
  for (let rung = 1; packingAtRung(authored, rung, step) <= ceiling; rung++)
    packings.push(packingAtRung(authored, rung, step))
  return packings
}

/** Where a lock floor's side paths stand: `outsideLock` hang outside the lock as branches, every other one the lock's
 * corridors take stands on one, two to a corridor only with `corridorsTakeTwo`. */
export type SidePathStage = { outsideLock: number[]; corridorsTakeTwo?: true }

/** Every side path the lock's corridors take, one to a corridor. */
export const ALL_INSIDE: SidePathStage = { outsideLock: [] }

const ascending = (sections: Iterable<number>) => [...sections].sort((a, b) => a - b)

/**
 * WHERE THE SIDE PATHS STAND, MOST PREFERRED FIRST. `candidates` are the sections offered a lock corridor, in authored
 * order; `single` and `double` are their assignment at one and at two sections a corridor.
 * - One to a corridor: a section past the corridors that take it hangs outside the lock from the first stage on; each
 *   next stage moves the last authored section still inside out as well, until none is inside.
 * - Only then two to a corridor, the same way, for as long as a corridor still holds two: once none does, the stage is
 *   one already asked.
 * Moving the last authored section out leaves every earlier one on its corridor, since sections are paired in
 * authored order.
 */
export const sidePathStages = (
  candidates: readonly number[],
  single: readonly CorridorAssignment[],
  double: readonly CorridorAssignment[]
): SidePathStage[] => {
  const stagesOf = (assigned: readonly CorridorAssignment[], twoAllowed: boolean): SidePathStage[] => {
    const inside = assigned.map(({ section }) => section)
    const overflow = candidates.filter(section => !inside.includes(section))
    const stages: SidePathStage[] = []
    for (let moved = 0; moved <= inside.length; moved++) {
      const staying = assigned.slice(0, inside.length - moved)
      const outsideLock = ascending([...overflow, ...inside.slice(inside.length - moved)])
      if (!twoAllowed) stages.push({ outsideLock })
      else if (new Set(staying.map(({ corridor }) => corridor)).size < staying.length)
        stages.push({ outsideLock, corridorsTakeTwo: true })
      else break
    }
    return stages
  }
  return [...stagesOf(single, false), ...stagesOf(double, true)]
}

/** Carves the floor at `seed` and `packing` within `attempts` attempts, its side paths standing as `sidePaths` says. */
export type CarveAssemble = (
  seed: number,
  packing: number,
  attempts: number,
  sidePaths: SidePathStage
) => AssemblerResult

export type CarvePairOptions = {
  /** The `packing` the author wrote (or the assembler's default when none was written). */
  authoredPacking: number
  /** The most `packing` a sweep may ask for. */
  ceiling: number
  /** Seeds tried at each packing: offsets 0 … seedBudget-1 from the base. */
  seedBudget: number
  /** The attempts the runtime ladder gives a floor: the last candidate's. */
  fullLadder: number
  step?: number
  /** Which hard criterion a carve misses: `refusal` against the floor carved. */
  judge: (result: AssemblerResult) => CarveRefusal | null
  /** Where the side paths may stand, most preferred first (`sidePathStages`); a floor with no lock asks one. */
  stages: SidePathStage[]
}

const offsetOf = (base: number, seed: number) =>
  seed === base ? 0 : (seed - (base % STAMPED_SEED_RANGE) + STAMPED_SEED_RANGE) % STAMPED_SEED_RANGE

/**
 * Whether an already-pinned (seed, packing, side paths) still meets every hard criterion, in one carve where finding
 * a pair costs thousands. A pin at the base seed and the authored packing is carved as the runtime carves it, ladder
 * and all, so a laddered floor is verified rather than searched again; any other pin is carved on one attempt, which
 * is the attempt the runtime's carve at it settles on. The pin is carved with its own side paths. Null means the
 * floor is to be searched afresh.
 */
export const verifyCarvePair = (
  base: number,
  pair: { seed: number; packing: number; sidePaths?: SidePathStage },
  assemble: CarveAssemble,
  { authoredPacking, fullLadder, judge }: Pick<CarvePairOptions, "authoredPacking" | "fullLadder" | "judge">
): LayoutFound | null => {
  const atBase = pair.seed === base && pair.packing === authoredPacking
  const sidePaths = pair.sidePaths ?? ALL_INSIDE
  const result = assemble(pair.seed, pair.packing, atBase ? fullLadder : 1, sidePaths)
  if (!result.success || (!atBase && result.attempt > 0) || judge(result)) return null
  return {
    kind: "found",
    seed: pair.seed,
    packing: pair.packing,
    laddered: result.attempt > 0,
    grid: result.grid,
    offset: offsetOf(base, pair.seed),
    sidePaths,
  }
}

/**
 * THE LAYOUT CLOSEST TO WHAT THE AUTHOR WROTE THAT MEETS EVERY HARD CRITERION. Packing is the author's intention,
 * never a requirement, so it orders the candidates and refuses none: every seed at the authored packing, then each
 * raised packing closest first, each candidate one attempt; then, last, the runtime ladder carve at the base seed,
 * which widens the grid as play would. The first candidate meeting every hard criterion is pinned. One that only the
 * ladder carves is `laddered`; the ladder carve is judged like any other, so no fallback ships a floor unchecked.
 *
 * Packing is the OUTER loop and seeds the inner: a seed is free to move and a packing is the author's intent, so
 * every seed at the authored packing is spent before the packing rises one step. `assemble(seed, packing, attempts,
 * sidePaths)` carves the floor within `attempts` attempts; a carve that disagrees with its layout is refused inside
 * it.
 *
 * WHERE THE SIDE PATHS STAND is the outermost preference: each of `stages` (`sidePathStages`) asks every candidate,
 * and the next is asked only when none met every hard criterion. A stage moves side paths between a lock corridor and
 * a branch outside the lock, never off the floor, so it refuses nothing and loses no section: with every stage spent
 * the floor is not found.
 */
export const searchCarvePair = (
  base: number,
  assemble: CarveAssemble,
  { authoredPacking, ceiling, seedBudget, fullLadder, step = PACKING_STEP, judge, stages }: CarvePairOptions
): LayoutFound | LayoutNotFound => {
  const counts: Partial<Record<HardCriterion, number>> = {}
  let hardest = 0
  let detail = ""
  const accepts = (result: AssemblerResult): boolean => {
    const refused =
      judge(result) ??
      (result.success ? null : { criterion: "carves" as const, detail: JSON.stringify(result.reasons) })
    if (!refused) return true
    counts[refused.criterion] = (counts[refused.criterion] ?? 0) + 1
    const rank = HARD_CRITERIA.indexOf(refused.criterion)
    if (rank >= hardest) {
      hardest = rank
      detail = refused.detail
    }
    return false
  }
  const packings = packingsFor(authoredPacking, ceiling, step)
  const searchStage = (sidePaths: SidePathStage): LayoutFound | null => {
    for (const packing of packings)
      for (let offset = 0; offset < seedBudget; offset++) {
        const seed = seedAtOffset(base, offset)
        const result = assemble(seed, packing, 1, sidePaths)
        if (accepts(result) && result.success)
          return { kind: "found", seed, packing, laddered: false, grid: result.grid, offset, sidePaths }
      }
    const ladder = assemble(base, authoredPacking, fullLadder, sidePaths)
    if (accepts(ladder) && ladder.success)
      return {
        kind: "found",
        seed: base,
        packing: authoredPacking,
        laddered: true,
        grid: ladder.grid,
        offset: 0,
        sidePaths,
      }
    return null
  }
  const asked = stages.length > 0 ? stages : [ALL_INSIDE]
  for (const sidePaths of asked) {
    const found = searchStage(sidePaths)
    if (found) return found
  }
  return {
    kind: "notFound",
    hardest: HARD_CRITERIA[hardest],
    detail,
    counts,
    seeds: seedBudget,
    packings: packings.length,
    stages: asked.length,
  }
}

/** A found layout without its grid: what a search run apart from the bake hands back, to be carved again there. */
export type LayoutPin = Omit<LayoutFound, "grid">

/**
 * WHAT SEARCHING THE STAGES IN TURN DECIDES, from each stage searched on its own (`searchCarvePair` given that one
 * stage): the first stage in order that found a layout; or, when none did, the refusals of them all, the hardest
 * criterion any reached and the detail of the last carve that reached it. A stage left unsearched (null) is one a
 * stage before it already decided.
 */
export const mergeStageSearches = (
  searched: ReadonlyArray<LayoutPin | LayoutNotFound | null>
): LayoutPin | LayoutNotFound => {
  let merged: LayoutNotFound | undefined
  for (const result of searched) {
    if (result === null) continue
    if (result.kind === "found") return result
    if (!merged) {
      merged = { ...result, counts: { ...result.counts }, stages: 1 }
      continue
    }
    // In the order the stage met them, so the counts read as they would had the stages been searched in one run.
    for (const [criterion, count] of Object.entries(result.counts) as Array<[HardCriterion, number]>)
      merged.counts[criterion] = (merged.counts[criterion] ?? 0) + count
    if (HARD_CRITERIA.indexOf(result.hardest) >= HARD_CRITERIA.indexOf(merged.hardest)) {
      merged.hardest = result.hardest
      merged.detail = result.detail
    }
    merged.stages++
  }
  if (!merged) throw new Error("no stage was searched")
  return merged
}

/** The bake's line for a floor no layout was picked for. */
export const describeLayoutFailure = (where: string, result: LayoutNotFound | LayoutInfeasible): string => {
  if (result.kind === "infeasible")
    return result.all.map(({ criterion, detail }) => `${where}: infeasible — ${criterion}: ${detail}`).join("\n")
  const counts = HARD_CRITERIA.flatMap(criterion =>
    result.counts[criterion] ? [`${criterion} ${result.counts[criterion]}`] : []
  ).join(", ")
  const stages = result.stages > 1 ? `, at each of ${result.stages} side-path stages,` : ""
  return `${where}: no layout in ${result.seeds} seeds × ${result.packings} packings and the ladder${stages} meets "${
    result.hardest
  }" (${counts}) — change ${AUTHORING_FIELD[result.hardest]} or raise the budget; ${result.detail}`
}
