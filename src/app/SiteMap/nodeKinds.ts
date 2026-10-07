import type { FloorGrid, RoomCell } from "@/game/siteTypes"
import { isSpent } from "@/game/mechanismDoors"
import { storedAtCell } from "@/game/cellAddress"
import type { FamilyDrawing } from "@/game/families/familyMeta"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import { NODE_RADIUS_FORK, NODE_RADIUS_LARGE, NODE_RADIUS_PUZZLE } from "./mapScale"

// What KIND of node a cell is, whether its gate is shut, and whether its family keeps it open: the
// questions asked by both the marker that draws it and the floor geometry that dresses the room around
// it (`roomClaims.ts`). Kept apart from either so neither has to import the other.

export type ShapeKind =
  | "entrance"
  | "puzzle"
  | "trap"
  | "fork"
  | "switch"
  | "handle"
  | "mechanism"
  | "plate"
  | "gate"
  | "treasure"
  | "stairhead"
  | "exit"

/** Everything a room's shape is read off and nothing else, so a caller holding a hand-built room can
 * ask without building a whole cell around it. */
export type ShapeCell = Pick<
  RoomCell,
  "roomType" | "tags" | "stairId" | "family" | "sequenceTile" | "mechanism" | "plate"
>

/** How the family standing in a room declares it is drawn; unset for a family that declares none, an
 * unregistered one, and a room with no family. */
export const drawingOf = (cell: Pick<RoomCell, "family">): FamilyDrawing | undefined =>
  cell.family === undefined ? undefined : getFamilyPlugin(cell.family)?.meta.drawing

/** The icon of the family standing in a room, for the marker that has no drawing of its own. */
export const familyIconOf = (cell: Pick<RoomCell, "family">): string | undefined =>
  cell.family === undefined ? undefined : getFamilyPlugin(cell.family)?.meta.icon

export const shapeKindFor = (grid: FloorGrid, r: number, c: number, cell: ShapeCell): ShapeKind => {
  // A junction that carries a family DIVIDES rather than merely branching: it asks something of the
  // player before a way on opens, so it wears a shape of its own instead of the shape of whatever
  // stands in it, and a bare junction keeps the one that never earns a completed badge. Keyed on the
  // family and not on any tag, so everything that comes to stand in a junction reads the same and core
  // names none of them; an unregistered family is no family, so a junction a switched-off mod left
  // behind is bare. The room's FOOTPRINT is still a fork's (`canClaimVoid` asks the type, not this).
  //
  // It may stand AHEAD of the handle branch below only because a lever's room is never a fork — a fork
  // carrying the handle family would be taken here and drawn as a switch. `handleAuthoring.spec.ts`
  // pins that, on real assembled floors.
  if (cell.roomType === "fork") {
    return cell.family !== undefined && getFamilyPlugin(cell.family) !== undefined ? "switch" : "fork"
  }
  if (cell.roomType === "portal") {
    if (cell.stairId) return "stairhead"
    return r === grid.entrancePos[0] && c === grid.entrancePos[1] ? "entrance" : "exit"
  }
  // A sequence tile and a stone's plate are ground stepped on, whatever else their cell says; the home plate's
  // record makes it no mechanism room.
  if (cell.sequenceTile || cell.plate) return "plate"
  // A MECHANISM'S ROOM IS DRAWN AS ITS REALISATION SAYS (`FamilyMeta.drawing`), never as a default: a lever
  // is a lever and a torch a torch, though both stand in an ordinary "encounter" room. A room working a
  // mechanism whose family declares no drawing — or whose mod is off — wears the family-icon marker, the one
  // drawing every realisation can fall back to.
  const drawing = drawingOf(cell)
  if (drawing) return drawing.marker
  if (cell.mechanism) return "mechanism"
  if (cell.tags?.includes("gate")) return "gate"
  if (cell.tags?.includes("trap")) return "trap"
  if (cell.tags?.includes("treasure") || cell.tags?.includes("shop")) return "treasure"
  return "puzzle"
}

/** A room its family keeps open (FamilyMeta.reEnterable): there is always something left to come back
 * for, so nothing the map draws may call it finished — no completed dim, no ✓ — however long ago the
 * player first walked in. The cell's `state` is left alone: navigation, reachability and the
 * high-water mark are all read off it.
 *
 * Read off the registry, so this names no family of its own, and an unregistered one answers "no" —
 * the right answer for a room left standing by a mod that is switched off.
 */
export const staysOpen = (cell: RoomCell): boolean => !!cell.family && !!getFamilyPlugin(cell.family)?.meta.reEnterable

/** A room whose family acts the instant its arrival prompt is taken (FamilyMeta.actsOnArrival) — a
 * lever, never a board, so `useSiteNavigation` performs the throw itself rather than opening the
 * family's screen. Read off the registry for the same reason `staysOpen` is: an unregistered family
 * answers "no", the right answer for a mod switched off. */
export const actsOnArrival = (cell: RoomCell): boolean =>
  !!cell.family && !!getFamilyPlugin(cell.family)?.meta.actsOnArrival

// Gating is soft: a locked gate is still "reachable" (clickable), so `state` doesn't distinguish
// locked from unlocked. This recovers that purely cosmetic distinction for the icon AND the floor
// tint under it, and never for clickability or badges.
export const isLockedGate = (cell: RoomCell, ownedKeys: ReadonlySet<string> | undefined): boolean =>
  cell.tags?.includes("gate") === true && !!cell.requiredKeyId && !(ownedKeys?.has(cell.requiredKeyId) ?? false)

// The visual shape a room takes. "encounter" rooms pick among the hand-drawn
// puzzle/trap/treasure/gate shapes by family tag; "portal" rooms (entrance/stairhead/exit
// are all `RoomType: "portal"` — pure transitions, no family) pick by position/stairId.
export const nodeRadius: Record<ShapeKind, number> = {
  entrance: NODE_RADIUS_LARGE,
  puzzle: NODE_RADIUS_PUZZLE,
  trap: NODE_RADIUS_PUZZLE,
  fork: NODE_RADIUS_FORK,
  // A junction with a board in it is somewhere to go, so it is sized like a room rather than like
  // the dot a plain junction gets.
  switch: NODE_RADIUS_PUZZLE,
  // A lever is somewhere to go, so it is sized like a room rather than like a junction's dot.
  handle: NODE_RADIUS_PUZZLE,
  // A mechanism marked by its family's icon is somewhere to go like a lever, and sized like one.
  mechanism: NODE_RADIUS_PUZZLE,
  // A pressure plate is stepped on rather than entered, so it is the size of a room and no larger.
  plate: NODE_RADIUS_PUZZLE,
  gate: NODE_RADIUS_LARGE,
  treasure: NODE_RADIUS_LARGE,
  stairhead: NODE_RADIUS_LARGE,
  exit: NODE_RADIUS_LARGE,
}

/** A room whose mechanism has been used up (a lit torch), read off the position it stands in now — the
 * same address `openDoorsFor` reads, falling back to `initial` for a save with no entry yet — so the map
 * can say "done" without the player touching it. No stored state of its own. */
export const isSpentAt = (
  grid: FloorGrid,
  floorIndex: number,
  r: number,
  c: number,
  cell: RoomCell,
  mechanismStates: ReadonlyMap<string, string> | undefined
): boolean => {
  // A sequence's first tile holds the record but is no activator: the sequence is one mechanism that is
  // never used up by a tile, and its tiles are ground; nor are a lock's stones, which always have a move left.
  if (!cell.mechanism || cell.sequenceTile || cell.plate) return false
  return isSpent(cell.mechanism, storedAtCell(grid, floorIndex, r, c, mechanismStates) || cell.mechanism.initial)
}
