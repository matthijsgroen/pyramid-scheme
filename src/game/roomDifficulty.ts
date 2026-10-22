import type { Difficulty } from "@/data/difficultyLevels"
import type { Tileset } from "./siteTypes"

/** The difficulty one room of a chain is built at: its node's own, else the section's (a floor is a section
 * here too). Every per-room reader goes through this so a node that names a difficulty is dealt, bucketed,
 * tiered and generated at it everywhere at once. */
export const roomDifficulty = (
  section: { difficulty: Difficulty; difficultiesByIndex?: Record<number, Difficulty> },
  index: number
): Difficulty => section.difficultiesByIndex?.[index] ?? section.difficulty

/** What a room is drawn in when its node names a difficulty of its own: its section's tileset, else the
 * floor's, else the section's difficulty, so a junior node on a starter section still draws starter. A room
 * with no such node stamps nothing — it takes the section's tileset or the floor's through `cellTileset`. */
export const roomTileset = (
  section: { difficulty: Difficulty; difficultiesByIndex?: Record<number, Difficulty>; tileset?: Tileset },
  floor: { tileset?: Tileset },
  index: number
): { tileset?: Tileset } =>
  section.difficultiesByIndex?.[index] === undefined
    ? {}
    : { tileset: section.tileset ?? floor.tileset ?? section.difficulty }
