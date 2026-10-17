import type { FloorGrid } from "@/game/siteTypes"

/**
 * The floor as the map DRAWS it: the place the explorer stands in is current, never done.
 *
 * A finished room takes a dimming wash so the player can tell what is behind them (`stateWash`). The room
 * they are standing in is finished too, but it is where they are — dimmed, it read darker than the room
 * ahead of it, which a lit rank's soft lamp no longer hides. Only the drawing changes: the cell keeps its
 * real state for everything that reads it.
 */
export const drawnAsCurrent = (grid: FloorGrid, here: ReadonlySet<string>): FloorGrid => {
  let changed = false
  const cells = grid.cells.map((row, r) =>
    row.map((cell, c) => {
      if (!("state" in cell) || cell.state !== "completed" || !here.has(`${r},${c}`)) return cell
      changed = true
      return { ...cell, state: "reachable" as const }
    })
  )
  return changed ? { ...grid, cells } : grid
}
