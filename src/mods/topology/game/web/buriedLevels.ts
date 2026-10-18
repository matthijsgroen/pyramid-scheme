import type { FloorConfig, SiteConfig } from "@/game/siteTypes"

/** The web keys a floor's main path waits for: its web doors on the main path, and the owners a stop added inside a
 * lock (a stop lands in a lock only from the main path's line). A door on a side section or at a section's mouth shuts
 * a pocket, not the way out. */
export const mainPathWebKeys = (floor: FloorConfig): string[] => [
  ...(floor.webDoors ?? []).filter(door => !("mouth" in door.at) && !("section" in door.at)).map(door => door.key),
  ...(floor.locks ?? []).flatMap(placed => (placed.web?.fronts ?? []).map(front => placed.web!.inputs[front.input])),
]

/**
 * THE NODES THAT ARE BURIED: 1-based, one per pyramid of the journey, those whose exit lies behind a web door whose key
 * is not held. Read off the authoring, so it holds before the player has stood in the pyramid.
 */
export const buriedLevels = (sites: readonly SiteConfig[], held: ReadonlySet<string>): ReadonlySet<number> =>
  new Set(sites.flatMap((site, i) => (site.flatMap(mainPathWebKeys).some(key => !held.has(key)) ? [i + 1] : [])))
