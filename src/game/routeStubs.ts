import { cellSlot } from "./cellSlot"
import type { FloorGrid } from "./siteTypes"

/**
 * The sections of route regions that hold no room: the stub a region the route crosses grows off the route toward a
 * branch. A room is what keeps a section's fog when the floor is carved again, so a seed leaving such a stub bare is
 * passed over.
 */
export const roomlessRouteStubs = (grid: FloorGrid): string[] => {
  const onRoute = new Set<string>()
  const roomed = new Map<string, boolean>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type === "empty") return
      if (cell.sectionAddress === "main" && cell.region) onRoute.add(cell.region)
      if (!cell.sectionAddress?.startsWith("lock:")) return
      roomed.set(cell.sectionAddress, (roomed.get(cell.sectionAddress) ?? false) || cellSlot(grid, r, c) !== null)
    })
  )
  return [...roomed].flatMap(([section, room]) =>
    !room && onRoute.has(section.slice("lock:".length)) ? [section] : []
  )
}
