import { DEFAULT_SPREAD } from "../carveConstants"
import type { Direction } from "../siteTypes"
import { chainRooms } from "./chainRooms"
import { checkChainsSeated } from "./checkChainsSeated"
import { keyOf } from "./derive"
import { embedFloor } from "./embed/embedFloor"
import { finish } from "./finish"
import { FLOOR_PLANS } from "./floorPlans"
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
import { choosePrefabs, placePrefabs, seatOfChoice, stampPrefab } from "./placePrefabs"
import { relayKeys } from "./relayKeys"
import { render, renderShut } from "./render"
import type { WritableGrid } from "./render"
import type { RenderState } from "./render"
import { reserveJunctions } from "./reserveJunctions"
import { seatChainGates } from "./seatChainGates"
import { seatGateRuns } from "./seatGateRuns"
import { seatMainBarrierDoors } from "./seatMainBarrierDoors"
import { seatMainControls } from "./seatMainControls"
import { seatRouteRegions } from "./seatRouteRegions"
import { seatSeamGates } from "./seatSeamGates"
import { seatChambers } from "./seatChambers"
import { requireReads } from "./state"
import type { Cell, Finish, PassEntry } from "./state"
import { shutSwitchGround } from "./shutSwitchGround"
import { validate } from "./validate"
import { standForkSwitches } from "./standForkSwitches"
import { standPieces } from "./standPieces"
import type { PiecesState } from "./standPieces"
import { standSwitches } from "./standSwitches"

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
 * THE TAIL OF AN ATTEMPT, once every pass holds: render writes the grid from the decisions, validate asks
 * the grid's checks, the pieces a walk steps on stand on it, finish dresses the carve that passes them, and the
 * designed rooms the floor names are laid over its rooms.
 */
export const finishAttempt: Finish = (prep, state) => {
  const decided = requireReads("render", TAIL_READS, state)
  const grid = render(prep, decided)
  return validate(prep, decided, grid) ?? standPieces(prep, decided, grid) ?? placePrefabs(prep, finish(prep, grid))
}

/** The pieces' reads with every cell named on the sketch moved to where its node stands on the floor; a cell that
 * is no node (a connector) has no place a piece could stand, so it is left out. */
const piecesOnFloor = (decided: PiecesState, nodes: ReadonlyMap<string, Cell>): PiecesState => {
  const moved = (key: string) => {
    const cell = nodes.get(key)
    return cell && `${cell[0]},${cell[1]}`
  }
  return {
    maze: {
      ...decided.maze,
      mainPath: decided.maze.mainPath.flatMap(cell => {
        const at = nodes.get(keyOf(cell))
        return at ? [at] : []
      }),
    },
    switchWays: decided.switchWays.map(ways =>
      ways.flatMap(way => {
        const cell = moved(way.cell)
        return cell ? [{ ...way, cell }] : []
      })
    ),
    pipeHoles: new Map(
      [...decided.pipeHoles].flatMap(([hole, { cell }]) => {
        const at = moved(cell)
        return at ? [[hole, { cell: at }] as const] : []
      })
    ),
  }
}

/**
 * THE TAIL OF AN ATTEMPT ON THE ROOMS ENGINE. The designed rooms are chosen on the sketch with every reserved junction
 * shut, so whether a mod stands a switch there cannot move a room; render writes the sketch, and the embed gives each
 * node its footprint and each edge its corridor. The grid's checks, the pieces and finish run on the floor as on the
 * lattice, the pieces kept off the designed rooms' nodes, and each designed room is stamped at the rect the embed
 * gave it.
 */
export const finishInRooms: Finish = (prep, state) => {
  const decided = requireReads("render", [...TAIL_READS, "plan"], state)
  const held = new Set([...decided.pipeHoles.values()].map(({ cell }) => cell))
  const choices = choosePrefabs(prep, renderShut(prep, decided), held)
  if (!Array.isArray(choices)) return choices
  const sketch = render(prep, decided)
  const dirsAt = (key: string) => {
    const [r, c] = key.split(",").map(Number)
    const cell = sketch.cells[r][c]
    return cell.type === "empty" ? new Set<Direction>() : cell.dirs
  }
  const rooms = new Map(
    choices.map(choice => [keyOf(choice.cell), seatOfChoice(prep, choice, dirsAt(keyOf(choice.cell)))])
  )
  const { config } = prep.config
  const embedded = embedFloor(sketch, {
    seed: prep.input.seed,
    spread: config.spread ?? DEFAULT_SPREAD,
    straightness: config.corridorStraightness ?? FLOOR_PLANS[decided.plan].straightness,
    rooms,
  })
  const { nodes, prefabRects } = embedded
  // The embed builds every row afresh, so the pieces may stand on it in place.
  const grid = embedded.grid as WritableGrid
  const onFloor = new Set([...nodes.values()].map(keyOf))
  const kept = new Set(choices.map(choice => keyOf(nodes.get(keyOf(choice.cell))!)))
  const refused =
    validate(prep, decided, grid) ??
    standPieces(prep, piecesOnFloor(decided, nodes), grid, { isNode: (r, c) => onFloor.has(`${r},${c}`), kept })
  if (refused) return refused
  return choices.reduce(
    (laid, choice) =>
      stampPrefab(
        laid,
        { ...choice, cell: nodes.get(keyOf(choice.cell))! },
        prefabRects.get(keyOf(choice.cell))!,
        prep
      ),
    finish(prep, grid)
  )
}
