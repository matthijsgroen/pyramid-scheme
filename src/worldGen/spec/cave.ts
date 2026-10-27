import { journey } from "../dsl"
import type { Rule, PyramidConstraint } from "../dsl"
import type { Tier } from "../types"

// A tomb's first level is a cave: its own tiles, cave furniture rather than the tier pool's rooms, and
// passages that turn far more often than a built corridor does.
export const CAVE_DRESSING: PyramidConstraint = {
  chambers: 0, // a cave takes none of its tier's pass-through chambers
  tileset: "cave",
  decorations: ["basin", "pillar", "rubblePile", "pit", "crystal", "brazier", "stalagmite", "puddle", "bones"],
  wallDecorations: ["roots", "stalactites"],
  corridorStraightness: 0.3,
}

/** A tomb's cave: `floorCount` floors of three puzzles at the tomb's own tier, down by main stairs to the pillar exit. */
export const tombCave = (tombId: string, difficulty: Tier, floorCount: number): Rule =>
  journey(tombId).pyramid("first", {
    ...CAVE_DRESSING,
    difficulty,
    floors: Array.from({ length: floorCount }, () => ({ pathPuzzles: 3, encounter: "puzzle" })),
  })
