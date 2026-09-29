import type { FloorGrid } from "./siteTypes"

/** How an obstacle's gate key is namespaced (gateKeyOf, siteAssembler.ts) — the one prefix that marks a
 * requiredKeyId as driven by a region layout's own control rather than a ward or a floor's own chest. */
export const OBSTACLE_KEY_PREFIX = "obstacle:"

/**
 * WHICH ROOM OF ITS SECTION A CELL IS, in a name the carve cannot move.
 *
 * What survives a floor being re-carved is what the floor was AUTHORED from, which is the room list:
 *
 * - a puzzle, trap or tableau room is the k-th room of its chain — `p${pathIndex}`
 * - a chest, a shop, or a section's own key-gate (SubSection.gate) is its section's one, named by the
 *   family that fills it — a section carries only one, so family alone already tells it apart
 * - an obstacle's gate or a mechanism's own room (a handle's or a control's) carries the family PLUS
 *   its own authored id — a region layout can stand more than one obstacle gate or control on the
 *   SAME main path, so family alone would no longer tell them apart
 * - a staircase is its `stairId`; the two plain portals are the entrance and the exit
 *
 * Corridors and bare forks get none, because they have no authored identity — how many corridor cells
 * there are and where the chain turns IS the carve. A fork carrying an encounter — a switch — does have
 * one: the encounter was authored onto the floor, and its progress has to survive the junction moving to
 * another cell.
 *
 * It lives in the domain rather than beside the save that spends it, because the assembler checks its own
 * floors against it (`assembleFloor`): two rooms of one section answering to the same name is a data-loss
 * bug, and a rule written twice is a rule that can be changed once. The save's full address — section,
 * floor and slot — is built on top of this in `cellAddress.ts`.
 */
export const cellSlot = (grid: FloorGrid, row: number, col: number): string | null => {
  const cell = grid.cells[row]?.[col]
  if (!cell || cell.type !== "room") return null
  if (cell.roomType === "fork" && cell.family === undefined) return null
  if (cell.roomType === "portal") {
    if (cell.stairId) return `stair:${cell.stairId}`
    return row === grid.entrancePos[0] && col === grid.entrancePos[1] ? "entrance" : "exit"
  }
  // A room the chain authored by position is named by that position; the ones a section gets exactly
  // one of — its terminal chest or shop, its own key-gate, the switch standing in its junction — are
  // named by what fills them.
  if (cell.pathIndex !== undefined) return `p${cell.pathIndex}`
  // A MECHANISM'S ROOM IS NAMED BY ITS OWN AUTHORED IDENTITY, UNIFORMLY — a handle and a control
  // alike, one rule rather than a control-only exception beside a family-only default. Family alone
  // stops picking out a single room the moment a region layout can stand more than one control on the
  // main path (FloorConfig.controls), and several may resolve to the same family ("handle") when none
  // names its own `encounter` — so every mechanism room carries its identity (RoomCell.mechanismId)
  // rather than only the ones that would otherwise collide.
  if (cell.mechanismId !== undefined) return `x${cell.family ?? "?"}:${cell.mechanismId}`
  // AN OBSTACLE'S GATE IS THE SAME KIND OF ROOM, ONE STEP OVER: a region layout can stand more than
  // one on the main path (one per connection its route crosses), so family alone no longer picks out
  // a single room the way it does for a section's own one chest or shop. Its key already carries the
  // obstacle's AUTHORED id, namespaced "obstacle:<stem>:" the same way a switch's is "switch:"
  // (gateKeyOf, siteAssembler.ts) — the prefix is stripped rather than split on the LAST colon, so the id
  // comes back exact whatever characters it authors, colons included.
  if (cell.requiredKeyId?.startsWith(OBSTACLE_KEY_PREFIX)) {
    const afterPrefix = cell.requiredKeyId.slice(OBSTACLE_KEY_PREFIX.length)
    const id = afterPrefix.slice(afterPrefix.indexOf(":") + 1)
    return `x${cell.family ?? "?"}:${id}`
  }
  return `x${cell.family ?? "?"}`
}
