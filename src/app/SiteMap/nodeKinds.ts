import type { FloorGrid, RoomCell, RoomType } from "@/game/siteTypes"
import { NODE_RADIUS_FORK, NODE_RADIUS_LARGE, NODE_RADIUS_PUZZLE } from "./mapScale"

// What KIND of node a cell is, and whether its gate is shut: the two pure questions asked by both the
// marker that draws it and the floor geometry that dresses the room around it (`roomClaims.ts`). Kept
// apart from either so neither has to import the other.

export type ShapeKind = "entrance" | "puzzle" | "trap" | "fork" | "gate" | "treasure" | "stairhead" | "exit"

export const shapeKindFor = (
  grid: FloorGrid,
  r: number,
  c: number,
  roomType: RoomType,
  tags: string[] | undefined,
  stairId: string | undefined
): ShapeKind => {
  if (roomType === "fork") return "fork"
  if (roomType === "portal") {
    if (stairId) return "stairhead"
    return r === grid.entrancePos[0] && c === grid.entrancePos[1] ? "entrance" : "exit"
  }
  if (tags?.includes("gate")) return "gate"
  if (tags?.includes("trap")) return "trap"
  if (tags?.includes("treasure") || tags?.includes("shop")) return "treasure"
  return "puzzle"
}

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
