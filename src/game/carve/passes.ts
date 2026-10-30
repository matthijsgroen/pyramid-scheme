import { chainRooms } from "./chainRooms"
import { checkChainsSeated } from "./checkChainsSeated"
import { finish } from "./finish"
import { growMaze } from "./growMaze"
import { hangBranches } from "./hangBranches"
import { isolate } from "./isolate"
import { labelCells } from "./labelCells"
import { layFloor } from "./layFloor"
import { mainRooms } from "./mainRooms"
import { nameSwitchWays } from "./nameSwitchWays"
import { placeDrops } from "./placeDrops"
import { placeJunctions } from "./placeJunctions"
import { placeMainContent } from "./placeMainContent"
import { placePipeHoles } from "./placePipeHoles"
import { placePrefabs } from "./placePrefabs"
import { relayKeys } from "./relayKeys"
import { render } from "./render"
import type { RenderState, WritableGrid } from "./render"
import { reserveJunctions } from "./reserveJunctions"
import { croppedToBox, ringFault, stampBlocks } from "./reserveRooms"
import { reserveRooms } from "./reserveRooms"
import { seatChainGates } from "./seatChainGates"
import { seatGateRuns } from "./seatGateRuns"
import { seatMainBarrierDoors } from "./seatMainBarrierDoors"
import { seatMainControls } from "./seatMainControls"
import { seatRouteRegions } from "./seatRouteRegions"
import { seatSeamGates } from "./seatSeamGates"
import { seatChambers } from "./seatChambers"
import { requireReads } from "./state"
import type { Finish, PassEntry } from "./state"
import { shutSwitchGround } from "./shutSwitchGround"
import { validate } from "./validate"
import { standForkSwitches } from "./standForkSwitches"
import { standPieces } from "./standPieces"
import { standSwitches } from "./standSwitches"

/**
 * EVERY PASS AN ATTEMPT RUNS, IN ORDER. The order is the order of `rand()` draws, so moving a pass that
 * draws moves every floor carved after it. Each pass declares its own reads and writes beside its code. See
 * docs/instructions/carve-passes.md for the list it grows to.
 */
export const PASSES: readonly PassEntry[] = [
  layFloor,
  reserveRooms,
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
  nameSwitchWays,
  standSwitches,
  standForkSwitches,
  placePipeHoles,
  seatChambers,
]

/** What the tail reads: every key `render`, `validate` and `standPieces` take from the passes, each checked as a pass's are. */
export const TAIL_READS = [
  "maze",
  "branches",
  "doors",
  "lay",
  "labels",
  "mainRooms",
  "chainRooms",
  "drops",
  "forks",
  "switchWays",
  "switchRooms",
  "forkSwitchRooms",
  "pipeHoles",
  "chambers",
] as const satisfies readonly (keyof RenderState)[]

/**
 * THE TAIL OF AN ATTEMPT, once every pass holds: render writes the grid from the decisions and the rooms that
 * reserved their blocks are drawn over their anchors, validate asks the grid's checks, the pieces a walk steps on
 * stand on it, every block's ring is checked clear, finish dresses the carve that passes them, the designed rooms
 * nothing reserved are laid over its rooms, and a floor with blocks is cut to its box.
 */
export const finishAttempt: Finish = (prep, state) => {
  const decided = requireReads("render", TAIL_READS, state)
  const blocks = state.blocks ?? []
  const grid = stampBlocks(prep, blocks, render(prep, decided)) as WritableGrid
  const refusal =
    validate(prep, decided, grid) ??
    standPieces(prep, decided, grid) ??
    (blocks.length ? ringFault(grid, blocks) : undefined)
  if (refusal) return refusal
  const laid = placePrefabs(prep, finish(prep, grid), blocks.length > 0)
  return blocks.length && !("retry" in laid) && !("fatal" in laid) ? croppedToBox(laid) : laid
}
