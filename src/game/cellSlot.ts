import type { FloorGrid, RoomCell } from "./siteTypes"

/** How an obstacle's gate key is namespaced (gateKeyOf, siteAssembler.ts) — the one prefix that marks a
 * requiredKeyId as driven by a region layout's own control rather than a ward or a floor's own chest. */
export const OBSTACLE_KEY_PREFIX = "obstacle:"

/** The id a plain switch's junction answers to (`RoomCell.mechanismId`): its index among the floor's
 * reserved junctions. No authored id can start with it, because an authored id is letters, digits, `_`
 * and `-` (USABLE_LABEL in the assembler), so a switch never answers to the name of a control or handle. */
const PLAIN_SWITCH_PREFIX = "switch:"
export const plainSwitchId = (index: number): string => `${PLAIN_SWITCH_PREFIX}${index}`

/** A room shut by a switch and filled by nothing: a way out of its fork, wearing a gate's bars (closeWaysOut). It
 * answers to the way out's key and holds no family, mechanism or sequence tile. */
const isSwitchDoor = (cell: RoomCell): cell is RoomCell & { ordinal: string } =>
  cell.family === undefined &&
  cell.ordinal !== undefined &&
  cell.mechanismId === undefined &&
  cell.requiredKeyId?.startsWith(PLAIN_SWITCH_PREFIX) === true

/** What a mechanism's room is filed under. It names the mechanism and never the family that realises it,
 * so a mechanic bound to another realisation keeps its stored state and its explored mark. */
const mechanismSlot = (mechanismId: string): string => `xmech:${mechanismId}`

/**
 * WHICH ROOM OF ITS SECTION A CELL IS, in a name the carve cannot move.
 *
 * What survives a floor being re-carved is what the floor was AUTHORED from, which is the room list:
 *
 * - a puzzle, trap or tableau room is the k-th room of its chain — `p${pathIndex}`
 * - a chest, a shop, or a section's own key-gate (SubSection.gate) is its section's one, named by the
 *   family that fills it — a section carries only one, so family alone already tells it apart
 * - a mechanism's own room (a handle's, a control's, a switch's) is `xmech:` plus its own authored id,
 *   never the family — binding the mechanism to another realisation must not move its progress
 * - an obstacle's gate carries its own authored id — a region layout can stand more than one on the
 *   SAME main path, so family alone would not tell them apart
 * - a sequence's tile is the sequence's authored id plus its step in the order, so every tile has a name of
 *   its own and the first tile's is the one its single state is filed under
 * - a region barrier has one door per entrance, all asking for one key, so each is named by the authored id
 *   PLUS the neighbouring region it is the entrance from
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
  // A MECHANISM'S ROOM IS NAMED BY ITS OWN AUTHORED IDENTITY, UNIFORMLY — a handle, a control and a
  // switch alike, and never by the family that realises it. Family alone stops picking out a single room
  // the moment a region layout can stand more than one control on the main path (FloorConfig.controls),
  // and the family is the one thing a binding may change, so every mechanism room carries its identity
  // (RoomCell.mechanismId).
  // A sequence's tile is named by the sequence, which is a kind of control with one state across several
  // cells, not a realisation: it carries no family.
  if (cell.sequenceTile) return `xsequence:${cell.sequenceTile.id}#${cell.sequenceTile.step}`
  if (cell.mechanismId !== undefined) return mechanismSlot(cell.mechanismId)
  // AN OBSTACLE'S GATE IS THE SAME KIND OF ROOM, ONE STEP OVER: a region layout can stand more than
  // one on the main path (one per connection its route crosses), and a control owns it so it carries no
  // family: it is named `xobstacle:<authored id>`. Its key already carries the
  // obstacle's AUTHORED id, namespaced "obstacle:<stem>:" the same way a switch's is "switch:"
  // (gateKeyOf, siteAssembler.ts) — the prefix is stripped rather than split on the LAST colon, so the id
  // comes back exact whatever characters it authors, colons included.
  if (cell.requiredKeyId?.startsWith(OBSTACLE_KEY_PREFIX)) {
    const afterPrefix = cell.requiredKeyId.slice(OBSTACLE_KEY_PREFIX.length)
    const id = afterPrefix.slice(afterPrefix.indexOf(":") + 1)
    // One door per entrance of a region barrier: the neighbour's authored name tells them apart, and
    // is what a re-carve cannot move.
    return cell.regionBarrier ? `xobstacle:${id}@${cell.regionBarrier.entrance}` : `xobstacle:${id}`
  }
  // A SWITCH'S DOOR IS A ROOM NO AUTHOR NAMED: no family fills it and no chain position is its own, so what
  // names it is the ordinal it stands at. Its key names only the way out, and two ways out of one fork can lead
  // into one region (a lock's), so the key could not tell two doors of one section apart.
  if (isSwitchDoor(cell)) return `xdoor:${cell.ordinal}`
  return `x${cell.family ?? "?"}`
}

/**
 * THE SLOT A MECHANISM'S ROOM WAS FILED UNDER BEFORE IT NAMED THE MECHANISM — `x<family>:<id>`, or a bare
 * `x<family>` for a plain switch — or null when the room has no such second name. A save may still hold
 * entries under it: reads fall back to it and the backfill copies them to `cellSlot`'s name. Nothing is
 * deleted from a save, so it stays readable until a later release drops the old keys.
 */
export const legacyCellSlot = (grid: FloorGrid, row: number, col: number): string | null => {
  const cell = grid.cells[row]?.[col]
  if (!cell || cell.type !== "room" || cell.pathIndex !== undefined || cell.sequenceTile) return null
  if (isSwitchDoor(cell)) return "x?"
  if (cell.mechanismId === undefined) return null
  const family = cell.family ?? "?"
  return cell.mechanismId.startsWith(PLAIN_SWITCH_PREFIX) ? `x${family}` : `x${family}:${cell.mechanismId}`
}
