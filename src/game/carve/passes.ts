import { layFloor } from "./layFloor"
import { pass } from "./state"
import type { Finish, PassEntry } from "./state"

/**
 * EVERY PASS AN ATTEMPT RUNS, IN ORDER. The order is the order of `rand()` draws, so moving a pass that
 * draws moves every floor carved after it. See docs/instructions/carve-passes.md for the list it grows to.
 */
export const PASSES: readonly PassEntry[] = [pass("layFloor", ["rung", "attempt"], ["lay", "laidN"], layFloor)]

/** Writes the grid from an attempt's settled state. No pass renders one yet, so no attempt yields a grid. */
export const finishAttempt: Finish = () => ({ retry: [] })
