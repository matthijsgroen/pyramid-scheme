import type { SiteConfig } from "@/game/siteTypes"
import { PYRAMID_STRUCTURES, TOMB_STRUCTURES } from "./journeyStructure"

/**
 * Which site each of a journey's levels sends the player into — one entry per level, not per authored
 * site. Every journey, a tomb included, has one site per level; a tomb's floors live inside its site.
 *
 * Levels rather than sites is what anything counting the world's rooms has to walk: the walk reads the
 * site a level enters, so a level never borrows a neighbour's board.
 */
export const levelSitesOf = (configs: Record<string, SiteConfig[]>): Record<string, SiteConfig[]> =>
  Object.fromEntries(
    [...PYRAMID_STRUCTURES, ...TOMB_STRUCTURES]
      .filter(({ id }) => configs[id]?.length)
      .map(({ id, levelCount = 1 }) => [
        id,
        Array.from({ length: levelCount }, (_unused, level) => configs[id][level] ?? configs[id][0]),
      ])
  )
