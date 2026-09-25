import type { FloorGrid, RoomCell, RoomType } from "@/game/siteTypes"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import { NODE_RADIUS_FORK, NODE_RADIUS_LARGE, NODE_RADIUS_PUZZLE } from "./mapScale"

// What KIND of node a cell is, whether its gate is shut, and whether its family keeps it open: the
// questions asked by both the marker that draws it and the floor geometry that dresses the room around
// it (`roomClaims.ts`). Kept apart from either so neither has to import the other.

export type ShapeKind = "entrance" | "puzzle" | "trap" | "fork" | "gate" | "treasure" | "stairhead" | "exit"

export const shapeKindFor = (
  grid: FloorGrid,
  r: number,
  c: number,
  roomType: RoomType,
  tags: string[] | undefined,
  stairId: string | undefined
): ShapeKind => {
  // A junction draws as a junction only while it is nothing else. A switch — a fork with an encounter
  // standing in it — is read by its family's tags below, so the player sees there is something here to
  // do before walking onto it, and so finishing it earns the completed badge a bare fork never wears.
  // The room's FOOTPRINT is still a fork's (`canClaimVoid` asks the type, not this).
  if (roomType === "fork" && !tags?.length) return "fork"
  if (roomType === "portal") {
    if (stairId) return "stairhead"
    return r === grid.entrancePos[0] && c === grid.entrancePos[1] ? "entrance" : "exit"
  }
  if (tags?.includes("gate")) return "gate"
  if (tags?.includes("trap")) return "trap"
  if (tags?.includes("treasure") || tags?.includes("shop")) return "treasure"
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
  gate: NODE_RADIUS_LARGE,
  treasure: NODE_RADIUS_LARGE,
  stairhead: NODE_RADIUS_LARGE,
  exit: NODE_RADIUS_LARGE,
}
