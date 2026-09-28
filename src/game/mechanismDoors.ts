import type { FloorGrid, GridCell } from "./siteTypes"
import { cellAddress } from "./cellAddress"

// WHICH DOORS STAND OPEN IS ASKED OF EACH MECHANISM'S OWN MAPPING, NEVER STORED. The save holds the
// position; the floor holds what that position opens. Keeping the mapping here rather than in the save
// is what lets a re-carve move a door without a stored entry coming to fit one it was never set for.
export const openDoorsFor = (grid: FloorGrid, floor: number, positions: ReadonlyMap<string, string>): Set<string> => {
  const open = new Set<string>()
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || !cell.mechanism) continue
      const at = cellAddress(grid, floor, r, c)
      if (!at) continue
      // NO STORED ENTRY MEANS THE MECHANISM'S OWN INITIAL POSITION, never "nothing open": a lever
      // stands on one of its two sides from the moment the floor is carved, and the gates that side
      // names stand open before anybody touches it.
      const state = positions.get(at) ?? cell.mechanism.initial
      // A position this build no longer has simply opens nothing — the only safe answer: guessing at
      // the nearest position would open a door nobody threw the lever for.
      for (const p of cell.mechanism.positions) if (p.state === state) open.add(p.gateKeyId)
    }
  return open
}

/**
 * The ways out a switch's board leaves open, put back the way the carve had them.
 *
 * A switch shuts every way out of its fork by overwriting the corridor node beyond it with a door, and
 * the board standing in the fork reopens the one it routes its beam to. That door is the ONLY thing in
 * the way: a node with something in it stops the walk from revealing past it, so the way out is opened
 * by giving the cell back its corridor — the same cell, the same walls, the same section — rather than
 * by marking the door passed.
 *
 * **Here, and before the save is applied.** Reachability spreads out of the cells a save calls explored
 * (`completeCell`), so a way out reopened after that pass would be open with the dark still behind it
 * until something else made the floor reveal again. Ahead of it, the floor reads exactly as one whose
 * switch had never shut that way.
 *
 * Only a door with nothing standing in it is ever touched: a gate a family renders is opened by what
 * the player does in it, and that is not this.
 */
export const openWaysOut = (grid: FloorGrid, open: ReadonlySet<string>): FloorGrid => {
  if (open.size === 0) return grid
  let opened = false
  const cells = grid.cells.map(row =>
    row.map((cell): GridCell => {
      if (cell.type !== "room" || cell.family !== undefined) return cell
      if (!cell.tags?.includes("gate") || !cell.requiredKeyId || !open.has(cell.requiredKeyId)) return cell
      opened = true
      return {
        type: "corridor",
        dirs: cell.dirs,
        state: cell.state,
        sectionAddress: cell.sectionAddress,
        sectionHash: cell.sectionHash,
        legacySectionHash: cell.legacySectionHash,
        ordinal: cell.ordinal,
        difficulty: cell.difficulty,
        hidden: cell.hidden,
      }
    })
  )
  return opened ? { ...grid, cells } : grid
}
