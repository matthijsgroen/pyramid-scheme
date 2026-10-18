import { isWebKey } from "@/game/floorLock"
import type { SiteConfig } from "@/game/siteTypes"

/** The web keys a pyramid's exit waits for: those of its web doors standing on the main path. A door on a side
 * section or at a section's mouth shuts a pocket, not the way out. */
export const exitWebKeys = (site: SiteConfig): string[] =>
  site.flatMap(floor =>
    (floor.webDoors ?? []).filter(door => !("mouth" in door.at) && !("section" in door.at)).map(door => door.key)
  )

/**
 * THE NODES THAT ARE BURIED: 1-based, one per pyramid of the journey, those whose exit lies behind a web door whose key
 * is not held. Read off the authoring, so it holds before the player has stood in the pyramid.
 */
export const buriedLevels = (sites: readonly SiteConfig[], held: ReadonlySet<string>): ReadonlySet<number> =>
  new Set(sites.flatMap((site, i) => (exitWebKeys(site).some(key => isWebKey(key) && !held.has(key)) ? [i + 1] : [])))
