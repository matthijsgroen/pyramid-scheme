import { DEFAULT_SPREAD } from "../carveConstants"
import type { IsNode } from "../sequenceTiles"
import type { CellRect, Direction, FloorGrid } from "../siteTypes"
import { chainRooms } from "./chainRooms"
import { checkChainsSeated } from "./checkChainsSeated"
import { keyOf } from "./derive"
import { embedFloor } from "./embed/embedFloor"
import { MOVES } from "./embed/graph"
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

/** The pieces' reads with every cell named on the sketch moved to where it stands on the floor. The main path is
 * its nodes and every corridor cell that stands for the sketch's main path between them; a switch way or a pipe hole
 * on a cell that is no node has no place a piece could stand, so it is left out. */
const piecesOnFloor = (
  decided: PiecesState,
  nodes: ReadonlyMap<string, Cell>,
  sources: ReadonlyMap<string, string>
): PiecesState => {
  const moved = (key: string) => {
    const cell = nodes.get(key)
    return cell && `${cell[0]},${cell[1]}`
  }
  const { mainPath } = decided.maze
  const drawnMain = new Set(mainPath.map(keyOf))
  mainPath.slice(1).forEach(([r, c], i) => drawnMain.add(`${(r + mainPath[i][0]) / 2},${(c + mainPath[i][1]) / 2}`))
  return {
    maze: {
      ...decided.maze,
      mainPath: [
        ...mainPath.flatMap(cell => {
          const at = nodes.get(keyOf(cell))
          return at ? [at] : []
        }),
        ...[...sources].flatMap(([at, from]) => (drawnMain.has(from) ? [at.split(",").map(Number) as Cell] : [])),
      ],
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

const SIDES = Object.values(MOVES)

/**
 * Where a piece may stand on a laid floor: any corridor cell of a string, that is no door (it touches no room and
 * lies in no designed room's footprint), no gate held open, no second lane, and no part of a drop or next to one.
 * Where its region holds open ground, a piece stands on that ground, so it is never met only beyond a gate it may
 * hold. Open ground is what a walk reaches from the entrance by the cells' ways without entering a room that asks for
 * a key (`requiredKeyId` or `requiredKeyIds`) or a region barrier's door.
 */
const standable = (grid: FloorGrid, rects: readonly CellRect[]): IsNode => {
  const at = (r: number, c: number) => grid.cells[r]?.[c]
  const ground = (r: number, c: number) => {
    const cell = at(r, c)
    if (cell?.type !== "corridor" || cell.openGate || cell.obstacle || cell.shoulderOf) return false
    if (
      rects.some(
        rect => r >= rect.top - 1 && r <= rect.top + rect.rows && c >= rect.left - 1 && c <= rect.left + rect.cols
      )
    )
      return false
    return SIDES.every(([dr, dc]) => {
      const next = at(r + dr, c + dc)
      return !next || next.type === "empty" || (next.type === "corridor" && !next.obstacle)
    })
  }
  const open = new Set<string>([`${grid.entrancePos[0]},${grid.entrancePos[1]}`])
  const queue: Cell[] = [[...grid.entrancePos]]
  while (queue.length) {
    const [r, c] = queue.shift()!
    const cell = at(r, c)
    if (!cell || cell.type === "empty") continue
    for (const dir of cell.dirs) {
      const [dr, dc] = MOVES[dir]
      const next = at(r + dr, c + dc)
      if (!next || next.type === "empty" || open.has(`${r + dr},${c + dc}`)) continue
      if (next.type === "room" && (next.requiredKeyId || next.requiredKeyIds?.length || next.regionBarrier)) continue
      open.add(`${r + dr},${c + dc}`)
      queue.push([r + dr, c + dc])
    }
  }
  const openRegions = new Set<string | undefined>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type === "corridor" && open.has(`${r},${c}`) && ground(r, c)) openRegions.add(cell.region)
    })
  )
  return (r, c) => {
    const cell = at(r, c)
    if (!ground(r, c) || cell?.type !== "corridor") return false
    return open.has(`${r},${c}`) || !openRegions.has(cell.region)
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
    rooms,
    keep: new Set([...held, ...decided.switchWays.flatMap(ways => ways.map(way => way.cell))]),
    wide: config.corridorWidth === 2,
  })
  if ("refused" in embedded) return embedded
  const { nodes, prefabRects, sources } = embedded
  // The embed builds every row afresh, so the pieces may stand on it in place.
  const grid = embedded.grid as WritableGrid
  const kept = new Set(choices.map(choice => keyOf(nodes.get(keyOf(choice.cell))!)))
  const refused =
    validate(prep, decided, grid) ??
    standPieces(prep, piecesOnFloor(decided, nodes, sources), grid, {
      isNode: standable(grid, [...prefabRects.values()]),
      kept,
    })
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
