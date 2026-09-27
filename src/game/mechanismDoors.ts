import type { FloorGrid } from "./siteTypes"
import { cellAddress } from "@/app/SiteMap/cellIdentity"

// WHICH DOORS STAND OPEN IS ASKED OF EACH MECHANISM'S OWN MAPPING, NEVER STORED. The save holds the
// position; the floor holds what that position opens. Keeping the mapping here rather than in the save
// is what lets a re-carve move a door without a stored entry coming to fit one it was never set for.
export const openDoorsFor = (grid: FloorGrid, floor: number, positions: ReadonlyMap<string, string>): Set<string> => {
  const open = new Set<string>()
  if (positions.size === 0) return open
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || !cell.mechanism) continue
      const at = cellAddress(grid, floor, r, c)
      if (!at) continue
      const state = positions.get(at)
      if (state === undefined) continue
      // A position this build no longer has simply opens nothing — the same answer as rest, and the
      // only safe one: guessing at the nearest position would open a door nobody solved for.
      for (const p of cell.mechanism.positions) if (p.state === state) open.add(p.gateKeyId)
    }
  return open
}
