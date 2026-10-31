import type { Direction, FloorGrid, GridCell } from "@/game/siteTypes"

const MOVES: Record<Direction, readonly [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

/** Builds a piece of the floor from the directions its neighbours are drawn in. A piece may drop or
 * replace them: a one-way mouth carries one direction and its landing carries none back. */
export type Piece = (dirs: Direction[]) => GridCell

export const corridorPiece: Piece = dirs => ({ type: "corridor", dirs: new Set(dirs), state: "fogged" })

const BASE_PIECES: Record<string, Piece> = {
  ".": corridorPiece,
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
export const floorFromPieces = (rows: string[], pieces: Record<string, Piece> = {}): FloorGrid => {
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
