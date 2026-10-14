import { growMaze } from "./growMaze"
import { layFloor } from "./layFloor"
import { seatGateRuns } from "./seatGateRuns"
import { seatMainBarrierDoors } from "./seatMainBarrierDoors"
import { seatMainControls } from "./seatMainControls"
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
  pass("seatGateRuns", ["maze", "regions", "content", "junctions", "seamGates", "lay"], ["runGates"], seatGateRuns),
  pass(
    "seatMainBarrierDoors",
    ["maze", "regions", "content", "junctions", "seamGates", "runGates", "lay"],
    ["mainBarrierDoors"],
    seatMainBarrierDoors
  ),
  pass(
    "seatMainControls",
    ["maze", "regions", "content", "junctions", "seamGates", "runGates", "mainBarrierDoors", "lay"],
    ["mainControls"],
    seatMainControls
  ),
]

/** Writes the grid from an attempt's settled state. No pass renders one yet, so no attempt yields a grid. */
export const finishAttempt: Finish = () => ({ retry: [] })
