import type { Difficulty } from "@/data/difficultyLevels"

// What the air in a tomb is like. Everything here is OVERLAY — a wash, some drifting motes, a few living
// things — never a second set of art (docs/game-design/spritesheet-renderer-prep.md, "Mood settings"): a
// night floor is the same tomb at a different hour, and doubling the sheet count to say so would buy the
// player nothing.
//
// Three mechanisms cover every mood asked for, which is why there are three and not one per idea:
//
// | asked for | mechanism |
// | --------- | --------- |
// | night     | `tint` — one wash over everything |
// | sand      | `drift` — many small motes, quick, blowing across |
// | fog       | `drift` — a few huge soft ones, slow |
// | scarabs   | `life` — sprites that scurry on the floor |
//
// A mood is keyed by the floor's `theme` (the hour) over its RANK's own ambience (the place), so an
// unthemed floor is still not airless — the ranks differ from each other by the doc's own table, and a
// theme replaces only the parts it names.

export type Mood = {
  /** One colour laid over the whole map. The hour, and nothing else. */
  tint?: { fill: string; opacity: number }
  /** Things carried on the air: dust, chaff, soot, sand, sparks — or fog, which is the same thing drawn
   * huge and slow. `seconds` is one crossing; `size` is the radius in map units. */
  drift?: { count: number; size: number; fill: string; opacity: number; seconds: number }
  /** How many scarabs are about. They scurry on lit floor, never through wall. */
  life?: number
}

// The ranks, from the doc's mood table: a merchant's cellar is dusty and bright, a priest's wing is cold
// and hazy with incense, the gods' vault is starlit. Scarabs belong to the lower ranks — vermin get into
// a cellar and a noble's wing, and the deeper tombs are too sealed and too cold for them.
const RANK_MOOD: Record<Difficulty, Mood> = {
  starter: {
    tint: { fill: "#c8b48a", opacity: 0.06 },
    drift: { count: 26, size: 1.6, fill: "#e8dcc0", opacity: 0.5, seconds: 14 },
    life: 3,
  },
  junior: {
    tint: { fill: "#c08840", opacity: 0.07 },
    drift: { count: 18, size: 1.4, fill: "#2a2018", opacity: 0.45, seconds: 18 },
    life: 2,
  },
  expert: {
    tint: { fill: "#6a86a8", opacity: 0.09 },
    drift: { count: 7, size: 26, fill: "#93a8bd", opacity: 0.07, seconds: 40 },
  },
  master: {
    tint: { fill: "#0b0a12", opacity: 0.12 },
    drift: { count: 14, size: 1.2, fill: "#ffdf9a", opacity: 0.55, seconds: 22 },
  },
  wizard: {
    tint: { fill: "#26407a", opacity: 0.1 },
    drift: { count: 16, size: 2, fill: "#bfe4ff", opacity: 0.6, seconds: 26 },
  },
}

// The hours a floor can author (`theme` in the DSL). Each replaces only the keys it names, so a night
// floor in a merchant's cellar keeps the cellar's dust and its scarabs and only the light changes.
const THEME_MOOD: Record<string, Mood> = {
  night: { tint: { fill: "#0e1a3a", opacity: 0.3 } },
  sand: {
    tint: { fill: "#d8b070", opacity: 0.1 },
    drift: { count: 70, size: 1.4, fill: "#f0dcb4", opacity: 0.55, seconds: 5 },
  },
  fog: {
    tint: { fill: "#aebccc", opacity: 0.12 },
    drift: { count: 9, size: 34, fill: "#cfdae6", opacity: 0.1, seconds: 55 },
  },
}

/** The air on this floor: its rank's own, with whatever its authored hour replaces. An unknown theme name
 * is not an error — a family may recognise a skin the map has no weather for — and simply leaves the
 * rank's ambience alone. */
export const moodFor = (tier: Difficulty, theme?: string): Mood => ({
  ...RANK_MOOD[tier],
  ...(theme ? (THEME_MOOD[theme] ?? {}) : {}),
})
