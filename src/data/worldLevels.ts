import type { SiteConfig } from "@/game/siteTypes"
import { generatedWorldConfigs } from "./generatedWorld"
import { PYRAMID_STRUCTURES, TOMB_STRUCTURES } from "./journeyStructure"

/**
 * Which site each of a journey's levels sends the player into — one entry per level, not per authored
 * site. A journey with a site per level maps one to one; a tomb has a single site and every one of its
 * levels re-enters it, re-carved at that level's own seed.
 *
 * Levels rather than sites is what anything counting the world's rooms has to walk: a tomb's one authored
 * balance room is a room the player meets once per level, and counting the site once had every level of
 * that tomb serving the identical board.
 */
export const worldLevelSites: Record<string, SiteConfig[]> = Object.fromEntries(
  [...PYRAMID_STRUCTURES, ...TOMB_STRUCTURES]
    .filter(({ id }) => generatedWorldConfigs[id]?.length)
    .map(({ id, levelCount }) => [
      id,
      Array.from(
        { length: levelCount },
        (_unused, level) => generatedWorldConfigs[id][level] ?? generatedWorldConfigs[id][0]
      ),
    ])
)
