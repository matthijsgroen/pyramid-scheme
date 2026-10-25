import { startingGridSize } from "../layLocks"
import { carvedCells, deriveN, distanceFor } from "./ids"
import type { FloorPrep, Rung } from "./state"

// THE LADDER IS LOAD-BEARING. The bake picks each floor's layout (worldGen/carveSeedSearch.ts): every seed at the
// authored `packing`, then each raised packing up to PACKING_CEILING, each carved on attempt 0, and last the floor's
// base seed carved by this ladder. Floors whose grid `deriveN` sizes too small for any (packing, seed) carve only on
// the rungs below that grow it (`N += 2`, then recovery's `carvedCells` sizing); they are pinned at their base seed and
// authored packing, and the runtime carves them here. The ladder carve is held to the same hard criteria as any
// other, so a laddered floor ships only when it walks sound and holds its puzzles. Removing the ladder needs the
// derived grid to start large enough for those floors first; changing its rungs re-carves every floor that climbs
// them. `yarn layout-report` lists the floors that carve only here.
//
// Maze carving is a per-attempt gamble (each attempt reshuffles branch points and section order), so the
// carve retries. The first RECOVERY_ATTEMPT attempts run at the original sizing; the rest re-size the grid
// to what the carve actually needs and wind the side chains down. Measured over every authored floor × 30
// seeds each: all of them assemble, the slowest at attempt 37, so the tail of the budget is headroom
// rather than something floors rely on.
//
// Attempts 0..RECOVERY_ATTEMPT-1 are FROZEN. A pyramid interior is persistent and revisitable, its
// stored exploredSections keyed to its layout, so re-sizing a floor that already assembles would
// silently invalidate progress on it.
//
// Only a floor that has exhausted the budget — one nobody can enter, so there is no progress to
// protect — enters recovery. Each attempt then sizes the grid to what the carve needs (`carvedCells`)
// while winding `chainPacking` from `packing` down to 0, so the last attempt is the most permissive
// shape this config can take. That is what makes the phase converge rather than reroll the same
// too-tight puzzle.
const RECOVERY_ATTEMPT = 30
/** The most attempts a floor may take. */
export const ASSEMBLY_ATTEMPTS = 60
// Attempts spent at one packing before asking for more room, and how much more. Four rerolls is
// enough for a floor that only needed shuffle luck; seven rungs of 1.5x carry the tightest default
// past 1, so no floor is stuck at a wish its sections cannot fit.
const ATTEMPTS_PER_RUNG = 4
// Every other rung widens; the ones between just grow the grid. More room is the cheaper rescue —
// it costs the player nothing — and a longer main path is what re-couples a floor's walk to how much
// side content hangs off it, which is the very thing `targetDistance` exists to prevent.
const ATTEMPTS_PER_WIDEN = 8
const PACKING_WIDEN = 2
// The roomiest a widening will ever ask for. Past it the retry goes back to growing the grid, which
// is the lever that suits a floor whose sections already have room to wander: compounding the wish
// instead carves a walk hundreds of cells long for a floor holding three puzzles.
export const PACKING_CEILING = 1

/** Attempt 0's rung: the authored wish, and a grid sized to the floor's content or its lay, whichever is larger. */
export const firstRung = (prep: FloorPrep): Rung => {
  const packing = prep.sizing.packing
  const targetDistance = distanceFor(prep, packing)
  const startingN = Math.max(
    deriveN(prep, { packing, targetDistance }, prep.sizing.minCells),
    prep.sizing.layPlan ? startingGridSize(prep.sizing.layPlan) : 0
  )
  return { n: startingN, startingN, packing, targetDistance, chainPacking: packing, recovery: false }
}

/** The rung `attempt` carves at, from the one the attempt before it carved at. */
export const climb = (prep: FloorPrep, attempt: number, rung: Rung): Rung => {
  if (attempt >= RECOVERY_ATTEMPT) {
    // Recovery asks for the roomiest wish outright. Winding the CHAINS down is its lever, and on a
    // floor already carved as tight as it goes there is nothing left to wind: without this, a tight
    // floor spends the whole phase re-rolling the same starved shape.
    const packing = rung.packing < PACKING_CEILING ? PACKING_CEILING : rung.packing
    const targetDistance = rung.packing < PACKING_CEILING ? distanceFor(prep, packing) : rung.targetDistance
    const steps = Math.max(1, ASSEMBLY_ATTEMPTS - RECOVERY_ATTEMPT - 1)
    const chainPacking = (packing * (steps - (attempt - RECOVERY_ATTEMPT))) / steps
    const n = Math.max(rung.startingN, deriveN(prep, { packing, targetDistance }, carvedCells(prep, chainPacking)))
    return { ...rung, n, packing, targetDistance, chainPacking, recovery: true }
  }
  if (attempt === 0 || attempt % ATTEMPTS_PER_RUNG !== 0) return rung
  // Growing the grid cannot rescue a floor starved by its own packing: the main path is carved to
  // `targetDistance` however much room surrounds it, so branches that have nowhere to hang still
  // have nowhere to hang. Widening the wish is the lever that moves, and the grid follows it
  // through `deriveN` — up to the ceiling, past which the grid is the lever again.
  if (attempt % ATTEMPTS_PER_WIDEN === 0 && rung.packing < PACKING_CEILING) {
    const packing = Math.min(rung.packing * PACKING_WIDEN, PACKING_CEILING)
    const targetDistance = distanceFor(prep, packing)
    const startingN = Math.max(rung.n, deriveN(prep, { packing, targetDistance }, prep.sizing.minCells))
    return { ...rung, n: startingN, startingN, packing, targetDistance, chainPacking: packing }
  }
  return { ...rung, n: rung.n + 2 }
}
