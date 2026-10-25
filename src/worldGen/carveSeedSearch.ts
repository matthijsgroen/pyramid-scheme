import { walkFloorLock, describeFloorWalkFailure, deadFloorRegions } from "@/game/floorLockWalk"
import { lockGroundUnfed, lockWithoutPuzzle } from "@/game/lockPuzzles"
import type { AssemblerResult, FloorConfig, FloorGrid } from "@/game/siteTypes"
import { roomlessRouteStubs } from "@/game/routeStubs"

/** What every picked layout meets, in the order they are asked; a carve that fails one is never asked the next.
 * Packing and the carve's attempt are no criteria: they order the search (`searchCarvePair`). */
export const HARD_CRITERIA = [
  "carves",
  "lock walks sound",
  "lock holds a puzzle",
  "no dead region",
  "every stub holds a room",
] as const
export type HardCriterion = (typeof HARD_CRITERIA)[number]
export type CarveRefusal = { criterion: HardCriterion; detail: string }

/** The authoring a criterion is answered in, named in a failure so the author knows where to look. */
export const AUTHORING_FIELD: Record<HardCriterion, string> = {
  carves: "the floor's content or its locks",
  "lock walks sound": "locks",
  "lock holds a puzzle":
    "where the lock stands (a lock placed before the floor's content, lockBeforeFloorContent), its regions' `takes`, or pathPuzzles and sideSections",
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
}
/** The bounded search met no candidate: the furthest criterion any candidate reached, and how often each refused. */
export type LayoutNotFound = {
  kind: "notFound"
  hardest: HardCriterion
  detail: string
  counts: Partial<Record<HardCriterion, number>>
  seeds: number
  packings: number
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
 * region appetites are part of "lock holds a puzzle". */
export const refusal = (result: AssemblerResult, floor: Pick<FloorConfig, "locks">): CarveRefusal | null => {
  if (!result.success) return { criterion: "carves", detail: JSON.stringify(result.reasons) }
  const walk = walkFloorLock(result.grid)
  if (!walk) return null
  if (!walk.sound) return { criterion: "lock walks sound", detail: describeFloorWalkFailure(walk.failure) }
  const unfed = [
    ...lockWithoutPuzzle(result.grid).map(lock => `lock ${lock} has no puzzle on its way`),
    ...lockGroundUnfed(result.grid, floor),
  ]
  if (unfed.length > 0) return { criterion: "lock holds a puzzle", detail: unfed.join(", ") }
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
}

const offsetOf = (base: number, seed: number) =>
  seed === base ? 0 : (seed - (base % STAMPED_SEED_RANGE) + STAMPED_SEED_RANGE) % STAMPED_SEED_RANGE

/**
 * Whether an already-pinned (seed, packing) pair still meets every hard criterion, in one carve where finding a pair
 * costs thousands. A pin at the base seed and the authored packing is carved as the runtime carves it, ladder and
 * all, so a laddered floor is verified rather than searched again; any other pin is carved on one attempt, which is
 * the attempt the runtime's carve at it settles on. Null means the floor is to be searched afresh.
 */
export const verifyCarvePair = (
  base: number,
  pair: { seed: number; packing: number },
  assemble: (seed: number, packing: number, attempts: number) => AssemblerResult,
  { authoredPacking, fullLadder, judge }: Pick<CarvePairOptions, "authoredPacking" | "fullLadder" | "judge">
): LayoutFound | null => {
  const atBase = pair.seed === base && pair.packing === authoredPacking
  const result = assemble(pair.seed, pair.packing, atBase ? fullLadder : 1)
  if (!result.success || (!atBase && result.attempt > 0) || judge(result)) return null
  return {
    kind: "found",
    seed: pair.seed,
    packing: pair.packing,
    laddered: result.attempt > 0,
    grid: result.grid,
    offset: offsetOf(base, pair.seed),
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
 * every seed at the authored packing is spent before the packing rises one step. `assemble(seed, packing, attempts)`
 * carves the floor within `attempts` attempts; a carve that disagrees with its layout is refused inside it.
 */
export const searchCarvePair = (
  base: number,
  assemble: (seed: number, packing: number, attempts: number) => AssemblerResult,
  { authoredPacking, ceiling, seedBudget, fullLadder, step = PACKING_STEP, judge }: CarvePairOptions
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
  for (const packing of packings)
    for (let offset = 0; offset < seedBudget; offset++) {
      const seed = seedAtOffset(base, offset)
      const result = assemble(seed, packing, 1)
      if (accepts(result) && result.success)
        return { kind: "found", seed, packing, laddered: false, grid: result.grid, offset }
    }
  const ladder = assemble(base, authoredPacking, fullLadder)
  if (accepts(ladder) && ladder.success)
    return { kind: "found", seed: base, packing: authoredPacking, laddered: true, grid: ladder.grid, offset: 0 }
  return {
    kind: "notFound",
    hardest: HARD_CRITERIA[hardest],
    detail,
    counts,
    seeds: seedBudget,
    packings: packings.length,
  }
}

/** The bake's line for a floor no layout was picked for. */
export const describeLayoutFailure = (where: string, result: LayoutNotFound | LayoutInfeasible): string => {
  if (result.kind === "infeasible")
    return result.all.map(({ criterion, detail }) => `${where}: infeasible — ${criterion}: ${detail}`).join("\n")
  const counts = HARD_CRITERIA.flatMap(criterion =>
    result.counts[criterion] ? [`${criterion} ${result.counts[criterion]}`] : []
  ).join(", ")
  return `${where}: no layout in ${result.seeds} seeds × ${result.packings} packings and the ladder meets "${result.hardest}" (${counts}) — change ${AUTHORING_FIELD[result.hardest]} or raise the budget; ${result.detail}`
}
