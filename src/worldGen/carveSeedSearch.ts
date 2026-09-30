import { floorLock } from "@/game/floorLock"
import { walkLock, describeLockWalkFailure, deadRegions } from "@/game/lockWalk"
import type { AssemblerResult, FloorGrid } from "@/game/siteTypes"

/** The checks a seed must pass, in the order they are asked. A seed that fails one is never asked the next. */
export const CARVE_CRITERIA = ["carves", "attempt 0", "lock walks sound", "no dead region"] as const
export type CarveCriterion = (typeof CARVE_CRITERIA)[number]

export type CarveSeedFound = {
  found: true
  seed: number
  grid: FloorGrid
  /** How far past the base seed the search went: 0 means the floor needs no stamped seed. */
  offset: number
  /** What the base seed failed, or null when it passed: the measure of how many floors carve today at
   * a widened grid and a doubled `packing` nobody authored ("attempt 0"). */
  baseRefusal: CarveCriterion | null
}
export type CarveSeedMissing = {
  found: false
  /** The last criterion any seed reached, so the failure names what could never be satisfied. */
  hardest: CarveCriterion
  detail: string
  tried: number
  /** What the base seed failed; see CarveSeedFound. */
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
const refusal = (result: AssemblerResult): { criterion: CarveCriterion; detail: string } | null => {
  if (!result.success) return { criterion: "carves", detail: JSON.stringify(result.reasons) }
  if (result.attempt > 0)
    return { criterion: "attempt 0", detail: `carved only on attempt ${result.attempt}, past the authored packing` }
  const lock = floorLock(result.grid)
  if (!lock) return null
  const walk = walkLock(lock)
  if (!walk.sound) return { criterion: "lock walks sound", detail: describeLockWalkFailure(walk.failure) }
  const dead = deadRegions(lock)
  if (dead.length > 0) return { criterion: "no dead region", detail: dead.join(", ") }
  return null
}

/**
 * The first seed from `base` upward that carves a floor on the assembler's first attempt, walks sound
 * and leaves no dead region. The carve-versus-authoring check is part of carving: a carve that
 * disagrees with its layout is refused inside the assembler, so it surfaces here as a failed attempt.
 *
 * Finding a seed is expensive and verifying one is cheap, so the search runs at bake time and the
 * runtime carves the stamped seed once. Each try is ONE attempt, so a seed that only carves after the
 * ladder widened the grid costs a single carve to reject. `assemble(seed, attempts)` carves the floor at
 * `seed` within `attempts` attempts; `fullLadder` is the count the base seed is given.
 */
export const searchCarveSeed = (
  base: number,
  assemble: (seed: number, attempts: number) => AssemblerResult,
  budget: number,
  fullLadder: number
): CarveSeedFound | CarveSeedMissing => {
  let hardest = 0
  let detail = ""
  let baseRefusal: CarveCriterion | null = null
  for (let offset = 0; offset <= budget; offset++) {
    const seed = seedAtOffset(base, offset)
    // The base seed is carved with the whole ladder, so its refusal can say "attempt 0" (it carves, but
    // late) rather than only "carves"; every other seed is one attempt, and the ladder is not paid for.
    const result = assemble(seed, offset === 0 ? fullLadder : 1)
    const refused = refusal(result)
    if (offset === 0) baseRefusal = refused?.criterion ?? null
    if (!refused && result.success) return { found: true, seed, grid: result.grid, offset, baseRefusal }
    if (refused) {
      const rank = CARVE_CRITERIA.indexOf(refused.criterion)
      if (rank >= hardest) {
        hardest = rank
        detail = refused.detail
      }
    }
  }
  return { found: false, hardest: CARVE_CRITERIA[hardest], detail, tried: budget + 1, baseRefusal }
}
