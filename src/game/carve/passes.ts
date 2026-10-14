import { growMaze } from "./growMaze"
import { layFloor } from "./layFloor"
import { seatRouteRegions } from "./seatRouteRegions"
import { seatSeamGates } from "./seatSeamGates"
import { placeJunctions } from "./placeJunctions"
import { placeMainContent } from "./placeMainContent"
import { pass } from "./state"
import type { Finish, PassEntry } from "./state"

/**
 * EVERY PASS AN ATTEMPT RUNS, IN ORDER. The order is the order of `rand()` draws, so moving a pass that
 * draws moves every floor carved after it. See docs/instructions/carve-passes.md for the list it grows to.
 */
export const PASSES: readonly PassEntry[] = [
  pass("layFloor", ["rung", "attempt"], ["lay", "laidN"], layFloor),
  pass("growMaze", ["rung", "lay", "rand"], ["maze"], growMaze),
  pass("seatRouteRegions", ["maze", "lay"], ["regions"], seatRouteRegions),
  pass("seatSeamGates", ["regions", "lay", "maze"], ["seamGates"], seatSeamGates),
  pass("placeMainContent", ["maze", "regions", "lay"], ["content"], placeMainContent),
  pass("placeJunctions", ["maze", "regions", "content", "lay", "rand"], ["junctions"], placeJunctions),
]

/** Writes the grid from an attempt's settled state. No pass renders one yet, so no attempt yields a grid. */
export const finishAttempt: Finish = () => ({ retry: [] })
