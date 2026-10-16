import type { FloorGrid, RoomCell } from "@/game/siteTypes"

/** The lock's name: its mechanisms stand on the floor as `flood.<id>`. */
export const FLOOD = "flood"

// A made-up lock, the puzzle the design is for: B burns and A does not, the door wants the opposite.
export const TWO_TORCHES = `
in -- hub -- hall
hub -[A+B:off]- out
hall -[S:a]
S toggle @hub
B torch @hall lit
A torch @hall
in ?
hub ?
hall ?
out ?
`

/** The cell where the lock's mechanism `id` stands, and that cell. */
export const homeOf = (grid: FloorGrid, id: string): { at: [number, number]; cell: RoomCell } => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.mechanism && cell.mechanismId === `${FLOOD}.${id}`) return { at: [r, c], cell }
    }
  throw new Error(`no ${id} on the floor`)
}
