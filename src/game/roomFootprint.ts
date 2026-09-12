import type { FloorGrid, GridCell } from "./siteTypes"

/** Out of bounds reads as void, which is why a room on the grid's edge claims into the map's margin. */
export const cellAt = (grid: FloorGrid, r: number, c: number): GridCell => grid.cells[r]?.[c] ?? { type: "empty" }

/**
 * A neighbour is claimable if it is genuine void (`empty`), or — the one exception — a single corridor
 * tile that only exists to APPROACH a gate: either a real gate room two steps away (revealed), or a
 * corridor stub whose far side got masked to `empty` because it leads into an undetected hidden section.
 * Either way that corridor tile reads better as the junction's own doorway than as a separate hallway.
 * Diagonal neighbours can only ever be void — a real edge is never diagonal.
 *
 * It lives in the DOMAIN because two layers need the same answer: the renderer builds the claim itself,
 * and the assembler ranks rooms by how much floor they will draw when it hands a floor's biggest chamber
 * to the site's god. Two copies of this rule disagreed by three cells on the first floor they were
 * measured against, and the god landed in a pocket while an eight-cell hall stood empty.
 */
export const isClaimableNeighbor = (
  grid: FloorGrid,
  ownerR: number,
  ownerC: number,
  nr: number,
  nc: number
): boolean => {
  const cell = cellAt(grid, nr, nc)
  if (cell.type === "empty") return true
  if (cell.type !== "corridor") return false
  const dr = nr - ownerR,
    dc = nc - ownerC
  if (Math.abs(dr) + Math.abs(dc) !== 1) return false
  const beyond = grid.cells[ownerR + dr * 2]?.[ownerC + dc * 2]
  const leadsToGate = beyond?.type === "room" && !!beyond.tags?.includes("gate")
  return leadsToGate || cell.dirs.size === 1
}

/**
 * How many cells of its own 3x3 a room can take — the size of the chamber it will draw.
 *
 * An upper bound rather than the final claim: the renderer resolves cells two rooms both want, so a
 * room wedged against another may end up with fewer. Nothing needs the exact number — this exists to
 * RANK rooms against each other, and a contested cell lowers both sides of that comparison.
 */
export const footprintSize = (grid: FloorGrid, r: number, c: number): number => {
  let n = 0
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      if (isClaimableNeighbor(grid, r, c, r + dr, c + dc)) n++
    }
  return n
}
