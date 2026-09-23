import type { FloorGrid } from "./siteTypes"

/**
 * WHICH ROOM OF ITS SECTION A CELL IS, in a name the carve cannot move.
 *
 * What survives a floor being re-carved is what the floor was AUTHORED from, which is the room list:
 *
 * - a puzzle, trap or tableau room is the k-th room of its chain — `p${pathIndex}`
 * - a chest, shop or gate is its section's one `end` or `gate` — named by the family that fills it
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
 * floor and slot — is built on top of this in `cellIdentity.ts`.
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
  // one of — its terminal chest or shop, its gate, the switch standing in its junction — are named by
  // what fills them.
  return cell.pathIndex !== undefined ? `p${cell.pathIndex}` : `x${cell.family ?? "?"}`
}
