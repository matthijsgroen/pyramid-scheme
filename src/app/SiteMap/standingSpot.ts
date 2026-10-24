import type { Direction, FloorGrid } from "@/game/siteTypes"
import { cellAt } from "@/game/roomFootprint"
import { DIR_MOVES } from "./corridorRuns"
import { COL_PITCH, ROW_PITCH } from "./mapScale"
import { shapeKindFor } from "./nodeKinds"
import { nodeArtOffset } from "./nodeArt"
import type { RoomClaims } from "./roomClaims"

export type StandingOffset = { readonly dx: number; readonly dy: number }

const AT_CENTRE: StandingOffset = { dx: 0, dy: 0 }

// Beside it first, on the floor line the flight stands on; in front of it next; behind it last.
const ASIDE: ReadonlyArray<Direction> = ["e", "w", "s", "n"]

/** Where the explorer is drawn standing in a room, relative to its node's centre. A stair's art IS its
 * node, so on the centre he stands in its shaft; he stands in the cell next to it instead — a bare cell of
 * the room's own floor, one with no prop in it. Drawing only: the explorer is still AT the node. */
export const standingOffset = (grid: FloorGrid, claims: RoomClaims, r: number, c: number): StandingOffset => {
  const cell = cellAt(grid, r, c)
  if (cell.type !== "room" || shapeKindFor(grid, r, c, cell) !== "stairhead") return AT_CENTRE
  return besideNode(grid, claims, r, c) ?? AT_CENTRE
}

/** Where somebody the room is FOR stands (roomOccupants): in a bare cell of the room beside its node, so the
 * explorer walking up to the marker meets them rather than standing in them — or, in a room with no floor to
 * spare, in the corner a node's furniture takes, away from every way out. */
export const occupantOffset = (grid: FloorGrid, claims: RoomClaims, r: number, c: number): StandingOffset => {
  const cell = cellAt(grid, r, c)
  return besideNode(grid, claims, r, c) ?? nodeArtOffset(cell.type === "empty" ? undefined : cell.dirs)
}

/** A bare cell of this room's own floor next to its node — claimed by it, empty in the grid, no prop on it. */
const besideNode = (grid: FloorGrid, claims: RoomClaims, r: number, c: number): StandingOffset | undefined => {
  const bare = (dir: Direction) => {
    const [dr, dc] = DIR_MOVES[dir]
    const key = `${r + dr},${c + dc}`
    return (
      claims.claimedBy.get(key) === `${r},${c}` &&
      cellAt(grid, r + dr, c + dc).type === "empty" &&
      !claims.decorationCells.has(key)
    )
  }
  const dir = ASIDE.find(bare)
  if (!dir) return undefined
  const [dr, dc] = DIR_MOVES[dir]
  return { dx: dc * COL_PITCH, dy: dr * ROW_PITCH }
}
