import { walkFloorLock, describeFloorWalkFailure, deadFloorRegions } from "@/game/floorLockWalk"
import type { AssemblerResult, FloorGrid } from "@/game/siteTypes"

/** The checks a seed must pass, in the order they are asked. A seed that fails one is never asked the next. */
export const CARVE_CRITERIA = ["carves", "attempt 0", "lock walks sound", "no dead region"] as const
export type CarveCriterion = (typeof CARVE_CRITERIA)[number]

export type CarvePairFound = {
  found: true
  seed: number
  /** The `packing` that carved: the authored one, or the smallest raised one that carved. */
  packing: number
  grid: FloorGrid
  /** How far past the base seed the search went at the final packing: 0 means no stamped seed. */
  offset: number
  /** What the authored `packing` at the base seed failed, or null when it passed: the measure of how
   * many floors carve only on a widened grid and a doubled `packing` nobody authored ("attempt 0"). */
  baseRefusal: CarveCriterion | null
}
export type CarvePairMissing = {
  found: false
  /** The last criterion any pair reached, so the failure names what could never be satisfied. */
  hardest: CarveCriterion
  detail: string
  tried: number
  /** The largest `packing` asked for. */
  reached: number
  /** What the authored `packing` at the base seed failed; see CarvePairFound. */
  baseRefusal: CarveCriterion | null
}

/** Stamped seeds live in [0, 2^32). An address seed is `generateNewSeed`'s up to 1e16, past
 * `Number.MAX_SAFE_INTEGER`, and `floorAssemblySeed` adds to it, so a stamped `base + offset` could round to
 * a neighbour or lose the offset altogether. Reducing the base modulo 2^32 before adding keeps every
 * stamped seed an exact integer that survives being written as a literal. */
export const STAMPED_SEED_RANGE = 2 ** 32

/** The seed `offset` steps along from `base`. Offset 0 is the address's own seed, untouched; any other
 * offset is reduced into the stamped range, so the value the search carved is the value that is written. */
export const seedAtOffset = (base: number, offset: number): number =>
  offset === 0 ? base : ((base % STAMPED_SEED_RANGE) + offset) % STAMPED_SEED_RANGE

/** Why `result` is not acceptable, or null when it is. */
export const refusal = (result: AssemblerResult): { criterion: CarveCriterion; detail: string } | null => {
  if (!result.success) return { criterion: "carves", detail: JSON.stringify(result.reasons) }
  if (result.attempt > 0)
    return { criterion: "attempt 0", detail: `carved only on attempt ${result.attempt}, past the authored packing` }
  const walk = walkFloorLock(result.grid)
  if (!walk) return null
  if (!walk.sound) return { criterion: "lock walks sound", detail: describeFloorWalkFailure(walk.failure) }
  const dead = deadFloorRegions(result.grid)
  if (dead.length > 0) return { criterion: "no dead region", detail: dead.join(", ") }
  return null
}

/** How much `packing` rises between sweeps. Small, so the final value stays near what the author wrote;
 * a carve costs well under a millisecond, so a fine ladder costs the bake seconds, not the player anything. */
export const PACKING_STEP = 0.02

/** The `packing` the `rung`-th sweep asks for: the authored value, then `step` more per rung. Rounded to
 * six places so the value written into the baked file is the one that was carved, with no float drift. */
export const packingAtRung = (authored: number, rung: number, step: number = PACKING_STEP): number =>
  Math.round((authored + rung * step) * 1e6) / 1e6

export type CarvePairOptions = {
  /** The `packing` the author wrote (or the assembler's default when none was written). */
  authoredPacking: number
  /** The most `packing` a sweep may ask for. */
  ceiling: number
  /** Seeds past the base tried at each packing. */
  seedBudget: number
  /** Attempts the authored packing's base seed is given, so its refusal can say "attempt 0". */
  fullLadder: number
  step?: number
}

/**
 * Whether one already-chosen (packing, seed) pair still satisfies every criterion: a single one-attempt
 * carve, where finding a pair costs thousands. `baseRefusal` is what the authored packing at the base
 * seed fails given the whole ladder, so a verified pin reports the same figure a search would.
 * Null means the pair no longer holds and the floor is to be searched afresh.
 */
export const verifyCarvePair = (
  base: number,
  pair: { seed: number; packing: number },
  assemble: (seed: number, packing: number, attempts: number) => AssemblerResult,
  { authoredPacking, fullLadder }: Pick<CarvePairOptions, "authoredPacking" | "fullLadder">
): CarvePairFound | null => {
  const result = assemble(pair.seed, pair.packing, 1)
  if (refusal(result) || !result.success) return null
  const baseRefusal = refusal(assemble(base, authoredPacking, fullLadder))?.criterion ?? null
  const offset =
    pair.seed === base ? 0 : (pair.seed - (base % STAMPED_SEED_RANGE) + STAMPED_SEED_RANGE) % STAMPED_SEED_RANGE
  return { found: true, seed: pair.seed, packing: pair.packing, grid: result.grid, offset, baseRefusal }
}

/**
 * The first (packing, seed) pair that carves a floor on the assembler's first attempt, walks sound and
 * leaves no dead region. The carve-versus-authoring check is part of carving: a carve that disagrees with
 * its layout is refused inside the assembler, so it surfaces here as a failed attempt.
 *
 * Packing is the OUTER loop and seeds the inner: a seed is free to move and a packing is the author's
 * intent, so every seed at the authored packing is spent before the packing rises one step, and the
 * packing that is baked is the smallest that any seed carves at.
 *
 * Finding a pair is expensive and verifying one is cheap, so the search runs at bake time and the
 * runtime carves the baked pair once. Each try is ONE attempt, so a pair that only carves after the
 * ladder widened the grid costs a single carve to reject. `assemble(seed, packing, attempts)` carves the
 * floor within `attempts` attempts.
 */
export const searchCarvePair = (
  base: number,
  assemble: (seed: number, packing: number, attempts: number) => AssemblerResult,
  { authoredPacking, ceiling, seedBudget, fullLadder, step = PACKING_STEP }: CarvePairOptions
): CarvePairFound | CarvePairMissing => {
  let hardest = 0
  let detail = ""
  let tried = 0
  let reached = authoredPacking
  let baseRefusal: CarveCriterion | null = null
  for (let rung = 0; ; rung++) {
    const packing = packingAtRung(authoredPacking, rung, step)
    if (rung > 0 && packing > ceiling) break
    reached = packing
    for (let offset = 0; offset <= seedBudget; offset++) {
      const seed = seedAtOffset(base, offset)
      // Only the authored packing's base seed is carved with the whole ladder, so its refusal can say
      // "attempt 0" (it carves, but late) rather than only "carves"; every other try is one attempt.
      const first = rung === 0 && offset === 0
      const laddered = assemble(seed, packing, first ? fullLadder : 1)
      tried++
      if (first) baseRefusal = refusal(laddered)?.criterion ?? null
      // The ladder's answer names how the floor carves today; what it says about the PAIR is one attempt's.
      const result = first && laddered.success && laddered.attempt > 0 ? assemble(seed, packing, 1) : laddered
      const refused = refusal(result)
      if (!refused && result.success) return { found: true, seed, packing, grid: result.grid, offset, baseRefusal }
      if (refused) {
        const rank = CARVE_CRITERIA.indexOf(refused.criterion)
        if (rank >= hardest) {
          hardest = rank
          detail = refused.detail
        }
      }
    }
  }
  return { found: false, hardest: CARVE_CRITERIA[hardest], detail, tried, reached, baseRefusal }
}
