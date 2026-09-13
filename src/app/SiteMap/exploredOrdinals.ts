import type { FloorGrid, GridCell } from "@/game/siteTypes"
import { decodeEdge } from "./useAssembledFloor"

/**
 * Exploration remembered by WHAT a cell is and WHERE IT SITS IN ITS SECTION, not by grid coordinate.
 *
 * A coordinate is an accident of the carve. The same section, carved a second time, puts its third
 * room somewhere else — so a save restored by coordinate marks rooms done that were never opened.
 * Measured on one floor of Valley of the Kings: 548 of 676 cells move when the carve changes, while
 * every one of them keeps its place in its section's walk.
 *
 * The kind travels with the ordinal because a section can re-shape without its hash moving — the hash
 * is computed from the authored spec, not from the carve. On that same floor, 7 of 676 cells swapped
 * between corridor and fork at the same ordinal. They are a mismatch rather than a silent lie now: the
 * kinds disagree, the entry is skipped, and that one cell reads as unexplored.
 */
export const cellOrdinalKey = (cell: GridCell): string | null => {
  if (cell.type === "empty" || !cell.ordinal) return null
  return `${cell.ordinal}@${cell.type === "room" ? `r${cell.roomType}` : "c"}`
}

/** The ordinal keys for one floor's stored coordinates, read off the grid those coordinates were
 * written against. Coordinates whose cell has gone, or whose section has been restructured since,
 * translate to nothing — exactly the ones a restore would have to skip anyway. */
export const ordinalsForFloor = (
  grid: FloorGrid,
  floor: number,
  exploredSections: Record<string, string[]>
): Record<string, string[]> => {
  const result: Record<string, string[]> = {}
  for (const [sectionHash, cellIds] of Object.entries(exploredSections)) {
    for (const cellId of cellIds) {
      const [cellFloor, r, c] = decodeEdge(cellId)
      if (cellFloor !== floor) continue
      const cell = grid.cells[r]?.[c]
      if (!cell || cell.type === "empty") continue
      if (cell.sectionHash !== sectionHash && cell.legacySectionHash !== sectionHash) continue
      const key = cellOrdinalKey(cell)
      if (!key) continue
      const current = result[sectionHash] ?? []
      if (!current.includes(key)) result[sectionHash] = [...current, key]
    }
  }
  return result
}

/** A floor of a journey, assembled the way the runtime assembles it. Injected so the migration can be
 * tested without a world, and so it reads the SAME carve the coordinates were written against. */
export type AssembleFor = (levelNr: number, floorIndex: number) => FloorGrid | null

/** Which (levelNr, floor) pairs a stored `exploredSections` covers. The key carries the level, the
 * cell ids carry the floor, so the set of floors to assemble is already in the save. */
const floorsIn = (exploredSections: Record<string, string[]>): [levelNr: number, floor: number][] => {
  const seen = new Set<string>()
  for (const [key, cellIds] of Object.entries(exploredSections)) {
    const levelNr = Number(key.split(":")[0])
    if (!Number.isFinite(levelNr)) continue
    for (const cellId of cellIds) seen.add(`${levelNr}:${decodeEdge(cellId)[0]}`)
  }
  return [...seen].map(pair => pair.split(":").map(Number) as [number, number])
}

/**
 * Translate a save's coordinate-keyed exploration into ordinal-keyed exploration.
 *
 * RUN IT WHILE THE OLD CARVE IS STILL THE ONE THE CODE PRODUCES. That is the whole reason this is a
 * two-release migration rather than a reset: a coordinate only means something against the floor it
 * was written against, so the translation has to happen in the release BEFORE the one that moves the
 * floors. Afterwards the ordinals stand on their own and the coordinates can go.
 *
 * A floor that cannot be assembled, or a coordinate whose section has been restructured since, yields
 * nothing — the same cells a restore would have skipped anyway.
 */
export const migrateExploredToOrdinals = (
  exploredSections: Record<string, string[]>,
  assembleFor: AssembleFor
): Record<string, string[]> => {
  const result: Record<string, string[]> = {}
  for (const [levelNr, floor] of floorsIn(exploredSections)) {
    const grid = assembleFor(levelNr, floor)
    if (!grid) continue
    const prefix = `${levelNr}:`
    const forLevel: Record<string, string[]> = {}
    for (const [key, cellIds] of Object.entries(exploredSections)) {
      if (key.startsWith(prefix)) forLevel[key.slice(prefix.length)] = cellIds
    }
    for (const [sectionHash, keys] of Object.entries(ordinalsForFloor(grid, floor, forLevel))) {
      const storedKey = `${prefix}${sectionHash}`
      const current = result[storedKey] ?? []
      result[storedKey] = [...current, ...keys.filter(key => !current.includes(key))]
    }
  }
  return result
}
