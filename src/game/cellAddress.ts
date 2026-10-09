import type { FloorGrid } from "./siteTypes"
import { cellSlot, legacyCellSlot } from "./cellSlot"

/**
 * WHAT A SAVE CALLS A CELL, once the carve is free to move.
 *
 * Which room of its section a cell is, is `cellSlot` next door; this is the whole address — section,
 * floor, slot. It sits in the domain because the carve itself is named by it: `openDoorsFor` asks which
 * gates a lever's position opens by address, and that runs headless in `yarn generate-world`, where no
 * React is in reach (`mark.ts` is the same split). `@/app/SiteMap/cellIdentity` re-exports it, because a
 * save spends the address and the slot in the same breath.
 *
 * A coordinate is an accident of the carve, and so — this is the part that took measuring — is the
 * ordinal. A cell's `ordinal` is its step along the CARVED walk, and how many steps that walk takes is
 * the carve's own choice (`targetDistance` in siteAssembler). Re-carving one expert floor at a
 * neighbouring seed took it from 685 cells to 668 and moved the main chain's forks from steps
 * 26/49/58 to 5/6/13/22/29/50: everything past the first divergence renumbers. An ordinal survives a
 * floor being re-SHUFFLED; it does not survive one being re-LENGTHENED, which is what compacting the
 * corridors will do to all 74 floors.
 *
 * What does survive is what the floor was AUTHORED from, which is the room list:
 *
 * - a puzzle, trap or tableau room is the k-th room of its chain — `p${pathIndex}`
 * - a chest, shop or gate is its section's one `end` or `gate` — named by the family that fills it
 * - a staircase is its `stairId`; the two plain portals are the entrance and the exit
 *
 * Measured over the baked world: 5250 such slots, no two alike inside a (section, floor), and every section
 * holds at least one but a lock region with no mechanism, plate or door. Re-carved at two different seeds, four floors across four tiers and a
 * tomb kept every slot.
 *
 * Cells with no slot — corridors and bare forks — are addressed by `~${ordinal}`, which resolves inside
 * one carve and deliberately resolves to nothing after the floor moves. Their fog comes back by the
 * high-water mark instead (`applyExplored` in useAssembledFloor).
 *
 * The section is named by its AUTHORING ADDRESS — `main`, `s0`, `s0.1` — and not by the structural hash
 * that used to key exploration. The hash covers the floor's own carve knobs (`packing`,
 * `corridorStraightness`), so retuning them moved every hash in the world and reset every run: exactly
 * the knobs corridor compaction turns. The address does not move, and the slots below degrade far more
 * gracefully than a reset when a section's contents are re-authored — add two puzzles to `s0` and
 * `p0`–`p3` still restore while `p4`–`p5` are simply new.
 *
 * The floor is in the address because a section carries none, and floors authored to the same shape
 * used to hash identically: 62 (level, hash) pairs in the baked world span more than one floor, and
 * every floor of every tomb shares one with all the others. Without it, walking a tomb's ground floor
 * would loot the floors above.
 */
export const cellAddress = (grid: FloorGrid, floor: number, row: number, col: number): string | null => {
  const cell = grid.cells[row]?.[col]
  if (!cell || cell.type === "empty") return null
  const slot = cellSlot(grid, row, col) ?? (cell.ordinal ? `~${cell.ordinal}` : null)
  if (!slot || cell.sectionAddress === undefined) return null
  return `${cell.sectionAddress}#${floor}/${slot}`
}

/**
 * THE ADDRESS A MECHANISM'S ROOM HAD BEFORE ITS SLOT NAMED THE MECHANISM (`legacyCellSlot`), or null for a
 * room whose address never changed. A save may hold state and exploration under it still: every reader
 * of a mechanism room's entries asks the address first and this second, and the backfill copies the
 * second to the first.
 */
export const legacyCellAddress = (grid: FloorGrid, floor: number, row: number, col: number): string | null => {
  const cell = grid.cells[row]?.[col]
  const slot = legacyCellSlot(grid, row, col)
  if (!cell || cell.type === "empty" || !slot || cell.sectionAddress === undefined) return null
  return `${cell.sectionAddress}#${floor}/${slot}`
}

/** What a save holds for a room: the entry under its address, else the one under the address it had
 * before its slot named the mechanism. Writes always go to the address, so the first read that finds
 * either is the one that stops being needed once the backfill has copied it. */
export const storedAtCell = <T>(
  grid: FloorGrid,
  floor: number,
  row: number,
  col: number,
  stored: ReadonlyMap<string, T> | undefined
): T | undefined => {
  return storedAtAddress(stored, cellAddress(grid, floor, row, col), legacyCellAddress(grid, floor, row, col))
}

/** The same read for a caller that already holds the two addresses (`FamilyContext`). */
export const storedAtAddress = <T>(
  stored: ReadonlyMap<string, T> | undefined,
  address: string | null | undefined,
  legacyAddress: string | null | undefined
): T | undefined =>
  (address ? stored?.get(address) : undefined) ?? (legacyAddress ? stored?.get(legacyAddress) : undefined)
