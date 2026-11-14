import type { Direction, FloorGrid } from "@/game/siteTypes"
import { cellAt } from "@/game/roomFootprint"
import { prefabRoomAt, prefabRoomCells } from "@/game/roomShape"
import { DIR_MOVES } from "./corridorRuns"
import { COL_PITCH, ROW_PITCH, cellCenter } from "./mapScale"
import { shapeKindFor } from "./nodeKinds"
import { nodeArtOffset } from "./nodeArt"
import { opensToward, type RoomClaims } from "./roomClaims"
import { drawnAt, roomStop } from "./roomWalk"

export type StandingOffset = { readonly dx: number; readonly dy: number }

const AT_CENTRE: StandingOffset = { dx: 0, dy: 0 }

const offsetTo = (r: number, c: number, [tr, tc]: readonly [number, number]): StandingOffset => ({
  dx: cellCenter(tr, tc).cx - cellCenter(r, c).cx,
  dy: cellCenter(tr, tc).cy - cellCenter(r, c).cy,
})

/** The stop of the prefab room whose rect holds this cell, the node's own included. */
const prefabStop = (grid: FloorGrid, r: number, c: number) => {
  const node = prefabRoomCells(grid).get(`${r},${c}`)
  if (!node) return undefined
  const [nr, nc] = node.split(",").map(Number)
  return roomStop(grid, nr, nc)
}

/** Where a prefab room's chest, portal or mechanism is drawn, relative to its node's centre: a mechanism on the
 * prefab's place for it, anything else at the stop, stepped aside as on a corridor node with no south door.
 * Undefined outside a prefab room, where the art stands as its node decides. */
export const prefabArtOffset = (
  grid: FloorGrid,
  claims: RoomClaims,
  r: number,
  c: number
): StandingOffset | undefined => {
  const room = prefabRoomAt(grid, r, c)
  const art = drawnAt(grid, [r, c])?.art
  if (!room || !art) return undefined
  const at = offsetTo(r, c, art)
  if (room.nodeArt) return at
  const step = openStep(grid, claims, ...art, nodeArtOffset(undefined))
  return { dx: at.dx + step.dx, dy: at.dy + step.dy }
}

/** `nodeArtOffset`'s step, kept only along an axis whose side of the cell is floor it is open to
 * (`opensToward`). Stepped toward a wall, the art hangs past the cell and is cut there, so on that axis it
 * stands centred instead. */
const openStep = (grid: FloorGrid, claims: RoomClaims, r: number, c: number, step: StandingOffset): StandingOffset => ({
  dx: step.dx === 0 || opensToward(grid, claims, r, c, step.dx > 0 ? "e" : "w") ? step.dx : 0,
  dy: step.dy === 0 || opensToward(grid, claims, r, c, step.dy > 0 ? "s" : "n") ? step.dy : 0,
})

/** Where a node's own furniture stands in its cell: away from its doorways, never toward a wall. */
export const nodeArtStep = (grid: FloorGrid, claims: RoomClaims, r: number, c: number): StandingOffset => {
  const cell = cellAt(grid, r, c)
  return openStep(grid, claims, r, c, nodeArtOffset(cell.type === "empty" ? undefined : cell.dirs))
}

// Beside it first, on the floor line the flight stands on; in front of it next; behind it last.
const ASIDE: ReadonlyArray<Direction> = ["e", "w", "s", "n"]

/** Where the explorer is drawn standing in a room, relative to its node's centre. A stair's art IS its
 * node, so on the centre he stands in its shaft; he stands in the cell next to it instead — a bare cell of
 * the room's own floor, one with no prop in it. Drawing only: the explorer is still AT the node.
 * In a prefab room, on its node or on a cell it absorbed, he stands at the room's stop. */
export const standingOffset = (grid: FloorGrid, claims: RoomClaims, r: number, c: number): StandingOffset => {
  const stop = prefabStop(grid, r, c)
  if (stop) return offsetTo(r, c, stop)
  const cell = cellAt(grid, r, c)
  if (cell.type !== "room" || shapeKindFor(grid, r, c, cell) !== "stairhead") return AT_CENTRE
  return besideNode(grid, claims, r, c) ?? AT_CENTRE
}

/** Where somebody the room is FOR stands (roomOccupants): in a bare cell of the room beside its node, so the
 * explorer walking up to the marker meets them rather than standing in them — or, in a room with no floor to
 * spare, in the corner a node's furniture takes, away from every way out. In a prefab room fit for somebody, north of
 * its stop; in one that is not, beside the stop: east of it, else west, on the room's free floor. */
export const occupantOffset = (grid: FloorGrid, claims: RoomClaims, r: number, c: number): StandingOffset => {
  const actor = drawnAt(grid, [r, c])?.actor
  if (actor) return offsetTo(r, c, actor)
  return besideNode(grid, claims, r, c) ?? nodeArtStep(grid, claims, r, c)
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
