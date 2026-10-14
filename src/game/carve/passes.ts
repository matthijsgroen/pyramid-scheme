import { chainRooms } from "./chainRooms"
import { checkChainsSeated } from "./checkChainsSeated"
import { finish } from "./finish"
import { growMaze } from "./growMaze"
import { hangBranches } from "./hangBranches"
import { isolate } from "./isolate"
import { labelCells } from "./labelCells"
import { layFloor } from "./layFloor"
import { mainRooms } from "./mainRooms"
import { placeDrops } from "./placeDrops"
import { placeJunctions } from "./placeJunctions"
import { placeMainContent } from "./placeMainContent"
import { relayKeys } from "./relayKeys"
import { render } from "./render"
import { reserveJunctions } from "./reserveJunctions"
import { seatChainGates } from "./seatChainGates"
import { seatGateRuns } from "./seatGateRuns"
import { seatMainBarrierDoors } from "./seatMainBarrierDoors"
import { seatMainControls } from "./seatMainControls"
import { seatRouteRegions } from "./seatRouteRegions"
import { seatSeamGates } from "./seatSeamGates"
import { settle } from "./settle"
import type { SettleState } from "./settle"
import { requireReads } from "./state"
import type { Finish, PassEntry } from "./state"
import { shutSwitchGround } from "./shutSwitchGround"

/**
 * EVERY PASS AN ATTEMPT RUNS, IN ORDER. The order is the order of `rand()` draws, so moving a pass that
 * draws moves every floor carved after it. Each pass declares its own reads and writes beside its code. See
 * docs/instructions/carve-passes.md for the list it grows to.
 */
export const PASSES: readonly PassEntry[] = [
  layFloor,
  growMaze,
  seatRouteRegions,
  seatSeamGates,
  placeMainContent,
  placeJunctions,
  seatGateRuns,
  seatMainBarrierDoors,
  seatMainControls,
  hangBranches,
  relayKeys,
  labelCells,
  seatChainGates,
  checkChainsSeated,
  isolate,
  mainRooms,
  chainRooms,
  reserveJunctions,
  shutSwitchGround,
  placeDrops,
]

/** What the tail reads: every key `render` and `settle` take from the passes, each checked as a pass's are. */
export const TAIL_READS = [
  "maze",
  "branches",
  "doors",
  "lay",
  "labels",
  "mainRooms",
  "chainRooms",
  "switchDoors",
  "drops",
  "forks",
  "junctions",
  "keys",
] as const satisfies readonly (keyof SettleState)[]

/**
 * THE TAIL OF AN ATTEMPT, once every pass holds: render writes the grid from the decisions, settle writes what
 * is still left to write onto it and asks the grid's checks, finish dresses the carve that passes them.
 */
export const finishAttempt: Finish = (prep, state) => {
  const decided = requireReads("render", TAIL_READS, state)
  const grid = render(prep, decided)
  return settle(prep, decided, grid) ?? finish(prep, grid)
}
