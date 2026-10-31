import { cellSlot } from "./cellSlot"
import { roomPlaceOf } from "./roomShape"
import type { FloorGrid } from "./siteTypes"

/**
 * The sections of route regions that hold no room: the stub a region the route crosses grows off the route toward a
 * branch. A room is what keeps a section's fog when the floor is carved again, so a seed leaving such a stub bare is
 * passed over. A designed room's own floor and door places count as that room.
 */
export const roomlessRouteStubs = (grid: FloorGrid): string[] => {
  const onRoute = new Set<string>()
  const roomed = new Map<string, boolean>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type === "empty") return
      if (cell.sectionAddress === "main" && cell.region) onRoute.add(cell.region)
      if (!cell.sectionAddress?.startsWith("lock:")) return
      const room = roomPlaceOf(grid, r, c) !== undefined || cellSlot(grid, r, c) !== null
      roomed.set(cell.sectionAddress, (roomed.get(cell.sectionAddress) ?? false) || room)
    })
  )
  return [...roomed].flatMap(([section, room]) =>
    !room && onRoute.has(section.slice("lock:".length)) ? [section] : []
  )
}
