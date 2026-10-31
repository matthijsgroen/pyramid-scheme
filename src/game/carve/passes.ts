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
import { bittenRooms } from "../roomFootprint"
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
 * stand on it, every block's ring is checked clear, finish dresses the carve that passes them, the pinned rooms
 * are laid over its rooms, two rooms that claim floor one node apart and not merged refuse the attempt (the backstop
 * of hangBranches' placement rule, reading every way a reserved junction's switch may shut as shut), and a floor with blocks is cut to its box.
 */
export const finishAttempt: Finish = (prep, state) => {
  const decided = requireReads("render", TAIL_READS, state)
  const blocks = state.blocks ?? []
  const grid = stampBlocks(prep, blocks, render(prep, decided)) as WritableGrid
  const shut = new Set(decided.switchWays.flat().map(({ cell }) => cell))
  const refusal =
    validate(prep, decided, grid, blocks) ??
    standPieces(prep, decided, grid) ??
    (blocks.length ? ringFault(grid, blocks, shut) : undefined)
  if (refusal) return refusal
  const laid = placePrefabs(prep, finish(prep, grid))
  if ("retry" in laid || "fatal" in laid) return laid
  const bitten = bittenRooms(laid, shut)
  if (bitten) return { retry: [{ type: "roomsBite", rooms: bitten }] }
  return blocks.length ? croppedToBox(laid) : laid
}
