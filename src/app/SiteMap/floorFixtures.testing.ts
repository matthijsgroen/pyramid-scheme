import type {
  CellState,
  DecorationKind,
  Direction,
  FloorGrid,
  GridCell,
  PropFootprint,
  RoomCell,
} from "@/game/siteTypes"
import { decorationFootprint } from "@/game/siteTypes"
import { floorFromPieces } from "./floorFrom"
import type { Piece } from "./floorFrom"
import { ONE_WAY_RUN_CELLS } from "@/game/siteAssembler"
import { fitPrefab } from "@/game/carve/placePrefabs"
import { parsePrefab } from "@/game/prefabNotation"
import type { Prefab } from "@/game/prefabTypes"

// Hand-built floors for specs that pin one mechanic each. A fixture names the mechanic it exercises;
// none of them is carved from an authored floor.

export type Kind = "room" | "corridor"
export type Axis = { travel: Direction; back: Direction; step: readonly [number, number] }

export const AXES: Axis[] = [
  { travel: "e", back: "w", step: [0, 1] },
  { travel: "s", back: "n", step: [1, 0] },
  { travel: "w", back: "e", step: [0, -1] },
  { travel: "n", back: "s", step: [-1, 0] },
]
export const KINDS: Kind[] = ["room", "corridor"]

export const cellOf = (kind: Kind, dirs: Direction[], state: CellState): GridCell =>
  kind === "room"
    ? { type: "room", roomType: "encounter", dirs: new Set(dirs), state }
    : { type: "corridor", dirs: new Set(dirs), state }

/** A drop laid along one axis, exactly as the carve lays it: from-node, launch, ONE_WAY_RUN_CELLS obstacle
 * cells, landing, to-node, in that order, `at(i)` being the i-th of them. The launch and the landing are
 * dead ends each naming only their own node, and each node names its end; the obstacle's cells name
 * nothing and carry the `obstacle` marker. Every cell starts as `state`; the entrance is whichever node the
 * walk is to start from. `runCells` defaults to the run along a row;
 * a story passes `oneWayRunCells(axis.travel)` to lay a vertical drop at the carve's own length. The walk
 * never reads the length, so the specs share the default. */
const dropIndexes = (runCells: number) => ({
  at: { fromNode: 0, launch: 1, landing: runCells + 2, toNode: runCells + 3 },
  obstacle: Array.from({ length: runCells }, (_, k) => k + 2),
})
export const { at: DROP_AT, obstacle: obstacleIndexes } = dropIndexes(ONE_WAY_RUN_CELLS)
export const dropGrid = (
  axis: Axis,
  fromNode: Kind,
  toNode: Kind,
  state: CellState = "fogged",
  entrance: "fromNode" | "toNode" = "fromNode",
  runCells: number = ONE_WAY_RUN_CELLS
) => {
  const { at: DROP_AT, obstacle: obstacleIndexes } = dropIndexes(runCells)
  const length = runCells + 4
  // The line sits in the middle of a strip two cells wider than it on every side, so a reveal or a claim
  // has void to leak into, and the axis start is chosen so every index is in range for either sign.
  const size = length + 4
  const start = (step: number) => (step < 0 ? 2 + length - 1 : 2)
  const origin: [number, number] = [
    axis.step[0] === 0 ? 2 : start(axis.step[0]),
    axis.step[1] === 0 ? 2 : start(axis.step[1]),
  ]
  const at = (i: number): [number, number] => [origin[0] + axis.step[0] * i, origin[1] + axis.step[1] * i]
  const rows = axis.step[0] === 0 ? 5 : size
  const cols = axis.step[1] === 0 ? 5 : size
  const cells: GridCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ type: "empty" }) as GridCell)
  )
  const put = (i: number, cell: GridCell) => {
    const [r, c] = at(i)
    cells[r][c] = cell
  }
  put(DROP_AT.fromNode, cellOf(fromNode, [axis.travel], state))
  put(DROP_AT.launch, cellOf("corridor", [axis.back], state))
  for (const i of obstacleIndexes)
    put(i, { type: "corridor", dirs: new Set<Direction>(), state, obstacle: { dir: axis.travel, kind: "zipline" } })
  put(DROP_AT.landing, cellOf("corridor", [axis.travel], state))
  put(DROP_AT.toNode, cellOf(toNode, [axis.back], state))
  const grid: FloorGrid = {
    siteId: "test",
    rows,
    cols,
    entrancePos: at(DROP_AT[entrance]),
    exitPos: at(DROP_AT[entrance === "fromNode" ? "toNode" : "fromNode"]),
    staircases: {},
    cells,
  }
  return { grid, at, dropAt: DROP_AT }
}

export { addressed, corridorPiece } from "./floorFrom"
export type { Piece } from "./floorFrom"

export const roomPiece =
  (extra: Partial<Extract<GridCell, { type: "room" }>> = {}): Piece =>
  dirs => ({ type: "room", roomType: "encounter", family: "sumplete", dirs: new Set(dirs), state: "fogged", ...extra })

/** `floorFromPieces` with `R` a plain encounter room. */
export const floorFrom = (rows: string[], pieces: Record<string, Piece> = {}): FloorGrid =>
  floorFromPieces(rows, { R: roomPiece(), ...pieces })

/** A made-up prefab read as the bake reads a `.room` file; a `mat` lies on the ground. `footprints` sizes kinds a
 * story needs bigger than the catalogue's. */
export const madeUpPrefab = (text: string, footprints: Partial<Record<DecorationKind, PropFootprint>> = {}): Prefab =>
  parsePrefab(
    `tier expert\n${text}`,
    "room",
    kind =>
      footprints[kind] ?? (kind === "mat" ? { cols: 1, rows: 1, tall: 0, ground: true } : decorationFootprint(kind))
  )

/** The floor with `prefab` laid over the node at `at` by the carve's own fit. */
const laidOver = (grid: FloorGrid, [r, c]: readonly [number, number], prefab: Prefab): FloorGrid => {
  const prefabRoom = fitPrefab(grid, r, c, prefab, grid.siteId)
  if (!prefabRoom) throw new Error(`${prefab.name} does not fit at ${r},${c}`)
  const cells = grid.cells.map(row => [...row])
  cells[r][c] = { ...(cells[r][c] as RoomCell), prefabRoom }
  return { ...grid, cells }
}

const FORK_HALL = madeUpPrefab(`room forkHall
layout
# # n # d # # # #
# w . . . . . a #
d . . . . . . . d
# . p . . . p . #
# . . . . . s . #
# # # # d # # # #
w wall jarRack
n wallItem niche
p floor pillar
a actor
s stop`)

/** A fork at `PREFAB_FORK` with arms west, east and south (and north to a room at 0,6 with `north`), laid over by a
 * made-up hall: rect rows 3-6, cols 3-9, its arms leaving by the door places at 4,2 (west), 4,10 (east), 7,6 (south)
 * and 2,6 (north). A niche hangs on the north wall at 2,4, a jar rack stands against it at 3,3, the actor's place is 3,9, two pillars stand at
 * `PREFAB_PILLARS` and the stop is 6,8, south of the east pillar. The entrance is at 4,0. */
export const PREFAB_FORK = [4, 6] as const
export const PREFAB_PILLARS = [
  [5, 4],
  [5, 8],
] as const
export const forkFloor = (fork: Partial<RoomCell> = {}, north = false): FloorGrid =>
  floorFrom(
    [
      ...(north ? ["      R", "      .", "      .", "      ."] : ["", "", "", ""]),
      "E.....G.....R",
      "      .",
      "      .",
      "      .",
      "      .",
      "      R",
    ],
    { G: dirs => ({ type: "room", roomType: "fork", dirs: new Set(dirs), state: "fogged", ...fork }) }
  )
export const prefabForkFloor = (fork: Partial<RoomCell> = {}, north = false): FloorGrid =>
  laidOver(forkFloor(fork, north), PREFAB_FORK, FORK_HALL)

/** Rooms whose node stands next to the ring, round a 2×1 skeleton. `L`: a chamber at 3,2 on the rect's north-west
 * corner (rows 3-5, cols 2-5), in by the north door place at 2,2 from the entrance at 0,2 and out east along row 3 by
 * the door place at 3,6 to a room at 3,8; its stop is 5,2. `T`: a fork at 3,3 on the south-west corner (rows 1-3,
 * cols 3-6), west by 3,2 to the entrance at 3,0, south by 4,3 to a room at 6,3 and east along row 3 by 3,7 to a room
 * at 3,9; its stop is 1,6. */
export const EDGE_NODE = { L: [3, 2], T: [3, 3] } as const
const L_CHAMBER = madeUpPrefab(`room lChamber
layout
# d # # # #
# . . . . d
# . p p . #
# s . . . #
# # # # # #
p floor bones
s stop`)
const T_FORK = madeUpPrefab(`room tFork
layout
# # # # # #
# . . . s #
# . p p . #
d . . . . d
# d # # # #
p floor bones
s stop`)
export const edgePrefabFloor = (shape: keyof typeof EDGE_NODE, node: Partial<RoomCell> = {}): FloorGrid =>
  laidOver(
    floorFrom(
      shape === "L" ? ["  E", "  .", "  .", "  G.....R", "", ""] : ["", "", "", "E..G.....R", "   .", "   .", "   R"],
      {
        G: dirs => ({
          type: "room",
          roomType: shape === "L" ? "chamber" : "fork",
          dirs: new Set(dirs),
          state: "fogged",
          ...node,
        }),
      }
    ),
    EDGE_NODE[shape],
    shape === "L" ? L_CHAMBER : T_FORK
  )

/** A treasure room at `PREFAB_CHEST` at the end of the corridor from the entrance at 1,0, laid over by a made-up vault
 * whose chest place is 1,5 and stop 2,4. */
export const PREFAB_CHEST = [1, 3] as const
const VAULT = madeUpPrefab(`room vault
layout
# # # # #
d . . c #
# . s . #
# # # # #
c chest
s stop`)
export const prefabChestFloor = (): FloorGrid =>
  laidOver(
    floorFrom(["", "E..T", "", "       "], {
      T: dirs => ({
        type: "room",
        roomType: "encounter",
        family: "treasure-chest",
        tags: ["treasure"],
        dirs: new Set(dirs),
        state: "fogged",
      }),
    }),
    PREFAB_CHEST,
    VAULT
  )

/** A chamber at `PREFAB_PORCH` entered from the west, laid over by a made-up porch drawn with its door on the east: only
 * its mirror fits, which lays the mat on the ground place at 1,5, beyond the stop at 1,3. */
export const PREFAB_PORCH = [1, 4] as const
const PORCH = madeUpPrefab(`room porch
mirror
layout
# # # # #
# g . s d
# # # # #
g ground mat
s stop`)
export const prefabPorchFloor = (): FloorGrid =>
  laidOver(
    floorFrom(["", "E...C", "       "], {
      C: dirs => ({ type: "room", roomType: "chamber", dirs: new Set(dirs), state: "fogged" }),
    }),
    PREFAB_PORCH,
    PORCH
  )
