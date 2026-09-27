import type { FloorGrid, RoomCell } from "@/game/siteTypes"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import { NODE_RADIUS_FORK, NODE_RADIUS_LARGE, NODE_RADIUS_PUZZLE } from "./mapScale"

// What KIND of node a cell is, whether its gate is shut, and whether its family keeps it open: the
// questions asked by both the marker that draws it and the floor geometry that dresses the room around
// it (`roomClaims.ts`). Kept apart from either so neither has to import the other.

export type ShapeKind =
  "entrance" | "puzzle" | "trap" | "fork" | "switch" | "handle" | "gate" | "treasure" | "stairhead" | "exit"

/** Everything a room's shape is read off and nothing else, so a caller holding a hand-built room can
 * ask without building a whole cell around it. */
export type ShapeCell = Pick<RoomCell, "roomType" | "tags" | "stairId" | "family">

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
  // A handle stands as an ordinary "encounter" room, not a "fork" — it is a lever to pull, not a
  // junction — so it reads off its tag rather than off the fork/family branch above.
  if (cell.tags?.includes("handle")) return "handle"
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
  gate: NODE_RADIUS_LARGE,
  treasure: NODE_RADIUS_LARGE,
  stairhead: NODE_RADIUS_LARGE,
  exit: NODE_RADIUS_LARGE,
}
