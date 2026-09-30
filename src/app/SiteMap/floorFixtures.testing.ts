import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"

// Hand-built floors for specs that pin one mechanic each. A fixture names the mechanic it exercises;
// none of them is carved from an authored floor.

export type Kind = "room" | "corridor"
export type Axis = { travel: Direction; back: Direction; step: readonly [number, number] }

export const AXES: Axis[] = [
  { travel: "e", back: "w", step: [0, 1] },
  { travel: "s", back: "n", step: [1, 0] },
]
export const KINDS: Kind[] = ["room", "corridor"]

export const cellOf = (kind: Kind, dirs: Direction[], state: CellState): GridCell =>
  kind === "room"
    ? { type: "room", roomType: "encounter", dirs: new Set(dirs), state }
    : { type: "corridor", dirs: new Set(dirs), state }

// Five cells along one axis: beyondDeparture, departure, mouth, landing, beyondLanding. The mouth
// carries one direction, toward the landing; the landing carries none back (the drop's asymmetry).
export const dropGrid = (axis: Axis, departure: Kind, landing: Kind) => {
  const at = (i: number): [number, number] => [2 + axis.step[0] * i, 2 + axis.step[1] * i]
  const cells: GridCell[][] = Array.from({ length: 6 }, () =>
    Array.from({ length: 6 }, () => ({ type: "empty" }) as GridCell)
  )
  const put = (i: number, cell: GridCell) => {
    const [r, c] = at(i)
    cells[r][c] = cell
  }
  put(0, cellOf("corridor", [axis.travel], "fogged"))
  put(1, cellOf(departure, [axis.back, axis.travel], "fogged"))
  put(2, cellOf("corridor", [axis.travel], "fogged"))
  put(3, cellOf(landing, [], "reachable"))
  const grid: FloorGrid = {
    siteId: "test",
    rows: 6,
    cols: 6,
    entrancePos: at(3),
    exitPos: at(3),
    staircases: {},
    cells,
  }
  return { grid, at }
}

const MOVES: Record<Direction, readonly [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

/** Builds a piece of the floor from the directions its neighbours are drawn in. A piece may drop or
 * replace them: a one-way mouth carries one direction and its landing carries none back. */
export type Piece = (dirs: Direction[]) => GridCell

export const corridorPiece: Piece = dirs => ({ type: "corridor", dirs: new Set(dirs), state: "fogged" })
export const roomPiece =
  (extra: Partial<Extract<GridCell, { type: "room" }>> = {}): Piece =>
  dirs => ({ type: "room", roomType: "encounter", family: "sumplete", dirs: new Set(dirs), state: "fogged", ...extra })

const BASE_PIECES: Record<string, Piece> = {
  ".": corridorPiece,
  R: roomPiece(),
  F: dirs => ({ type: "room", roomType: "fork", dirs: new Set(dirs), state: "fogged" }),
  E: dirs => ({ type: "room", roomType: "portal", dirs: new Set(dirs), state: "fogged" }),
}

/**
 * A floor drawn as text, one character per cell. A space is void; `.` a corridor, `R` a room, `F` a
 * fork and `E` the entrance; `pieces` adds the rest. Every non-void cell is open toward each non-void
 * neighbour, so what is drawn beside a cell is what it connects to — a piece that means otherwise
 * (a one-way mouth) says so itself.
 *
 * Each cell is its own section, which keeps a save's high-water mark — a device for restoring fog after
 * a floor is re-carved — from ever lighting a cell the walk did not name.
 */
export const floorFrom = (rows: string[], pieces: Record<string, Piece> = {}): FloorGrid => {
  const all = { ...BASE_PIECES, ...pieces }
  const cols = Math.max(...rows.map(row => row.length))
  const drawn = (r: number, c: number) => (rows[r]?.[c] ?? " ") !== " "
  let entrancePos: [number, number] | null = null
  const cells: GridCell[][] = rows.map((row, r) =>
    Array.from({ length: cols }, (_, c): GridCell => {
      const char = row[c] ?? " "
      if (char === " ") return { type: "empty" }
      const piece = all[char]
      if (!piece) throw new Error(`no piece for "${char}" at ${r},${c}`)
      if (char === "E") entrancePos = [r, c]
      const dirs = (Object.keys(MOVES) as Direction[]).filter(d => drawn(r + MOVES[d][0], c + MOVES[d][1]))
      return piece(dirs)
    })
  )
  if (!entrancePos) throw new Error("a floor needs an E")
  return addressed({
    siteId: "test",
    rows: rows.length,
    cols,
    entrancePos,
    exitPos: entrancePos,
    staircases: {},
    difficulty: "expert",
    cells,
  })
}

/** Gives every cell the section and ordinal a save files it under (`cellAddress`), as the assembler
 * does; without them a walk writes nothing down. The entrance opens the floor, as it does in play. */
export const addressed = (grid: FloorGrid): FloorGrid => {
  const cells = grid.cells.map((row, r) =>
    row.map((cell, c): GridCell => {
      if (cell.type === "empty") return cell
      const id = `${r * grid.cols + c}`
      const stamped = { ...cell, sectionAddress: `s${id}`, sectionHash: `s${id}`, ordinal: id }
      return r === grid.entrancePos[0] && c === grid.entrancePos[1] ? { ...stamped, state: "reachable" } : stamped
    })
  )
  return { ...grid, cells }
}
