import type { Difficulty } from "@/data/difficultyLevels"
import type { ConditionKind, SiteCondition } from "@/game/siteTypes"

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
  /** Things growing on the stone: how many, and which sprite. Placed like `life` but STILL — a weed in
   * a corner does not scurry — and drawn against the wall band as well as the floor, because the point
   * of a vine is that it came through the wall. */
  /** What is growing, in three places, as a DENSITY per available cell rather than a count: `floor`
   * tufts in the joints, `wall` roots through the band, `chamber` big ones in the rooms. 1 is one per
   * cell — every joint, every band, every chamber floor. `MapGrowth` multiplies by what that floor
   * actually has, which is the whole point: see CONDITION_MOOD. */
  growth?: { floor: number; wall: number; chamber: number; kind: ConditionKind }
  /** One colour laid over the whole map. The hour, and nothing else. */
  tint?: { fill: string; opacity: number }
  /** Things carried on the air: dust, chaff, soot, sand, sparks — or fog, which is the same thing drawn
   * huge and slow. `seconds` is one crossing; `size` is the radius the field is written around, in screen
   * pixels — each mote takes its own fraction of it and most take less than one (MapMood).
   *
   * **Count is per screen**, not per floor: the air is an HTML layer over the map's window (MapMood), so
   * these are the motes a player sees.
   *
   * **Dust is specks and there are a lot of them** — mostly under two pixels, everywhere at once. A dozen
   * motes of two to five pixels reads as circles sitting on the stone, not as air. Specks ride paired on
   * one element (`SPECKS` in MapMood), so a count here is very nearly half a number of nodes.
   *
   * **Pace is `seconds`, not distance.** A mote restarts where it began rather than wrapping, so a field
   * crossing much more than a phone's width spends half its time off the left edge.
   *
   * **Fog is the exception**: the same mechanism at the other end, a few huge soft ones barely moving —
   * a wash you see through, not weather. */
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
    drift: { count: 34, size: 0.9, fill: "#e8dcc0", opacity: 0.6, seconds: 8 },
    life: 3,
  },
  junior: {
    tint: { fill: "#c08840", opacity: 0.07 },
    drift: { count: 30, size: 0.8, fill: "#2a2018", opacity: 0.55, seconds: 10 },
    life: 2,
  },
  expert: {
    // DUST, like every other rank, and cold and slow because the air down here is sealed. It was four
    // discs of radius 26 at 0.07 — an incense haze in the writing, four big pale circles on the screen,
    // and the one rank whose air did not read as air at all. Haze wants a wash; a field of specks is
    // what the other four are and what this one is now, slower than any of them.
    tint: { fill: "#6a86a8", opacity: 0.09 },
    drift: { count: 30, size: 0.8, fill: "#93a8bd", opacity: 0.5, seconds: 18 },
  },
  master: {
    tint: { fill: "#0b0a12", opacity: 0.12 },
    drift: { count: 28, size: 0.7, fill: "#ffdf9a", opacity: 0.65, seconds: 12 },
  },
  wizard: {
    tint: { fill: "#26407a", opacity: 0.1 },
    drift: { count: 32, size: 1, fill: "#bfe4ff", opacity: 0.7, seconds: 14 },
  },
}

// The hours a floor can author (`theme` in the DSL). Each replaces only the keys it names, so a night
// floor in a merchant's cellar keeps the cellar's dust and its scarabs and only the light changes.
const THEME_MOOD: Record<string, Mood> = {
  night: { tint: { fill: "#0e1a3a", opacity: 0.3 } },
  sand: {
    tint: { fill: "#d8b070", opacity: 0.1 },
    drift: { count: 66, size: 0.75, fill: "#f0dcb4", opacity: 0.6, seconds: 3.2 },
  },
  fog: {
    tint: { fill: "#aebccc", opacity: 0.12 },
    drift: { count: 4, size: 34, fill: "#cfdae6", opacity: 0.1, seconds: 55 },
  },
}

/**
 * What a condition does to the air, at full strength. Scaled by the site's own `amount` before use.
 *
 * A condition COMPOSES where an hour REPLACES, and the difference is the whole reason it is a separate
 * axis. An hour is what the light is doing, so a night floor's tint is simply the tint. A condition is
 * something wrong with the place, and the place is still there underneath: a flooded merchant's cellar
 * is a cellar with water in it, and if its brackish cast replaced the rank's own the cellar would stop
 * being a cellar the moment it got wet.
 */
const CONDITION_MOOD: Record<
  ConditionKind,
  { tint: { fill: string; opacity: number }; growth: number; wall: number; plant: number }
> = {
  // Green forcing through the brick, and the light under it going green with it.
  //
  // THREE PLACES, not one, and the split is what makes a condition read as growth rather than as litter.
  // `growth` is the tufts in the floor joints — many and small. `wall` is what comes THROUGH the brick,
  // hanging off the band above a cell, and it is the whole reason the condition exists: a vine in a joint
  // is a weed, a root through a wall is a building losing. `plant` is the few big ones, and they go in
  // CHAMBERS only, because a plant that size in a passage is something the player would have to walk
  // through.
  //
  // A DENSITY PER CELL, not a count: a flat number per floor gives the entrance floors one sprite every
  // four to eleven rooms while a five-room vault at the top is choked. At 1 it is one per cell — every
  // joint, every band, every chamber floor — so what an author writes is a real fraction of "overgrown".
  overgrown: { tint: { fill: "#4d7a2e", opacity: 0.18 }, growth: 1, wall: 1, plant: 1 },
  // Standing water: cooler, darker, and what grows in it grows at the edges. No PLANTS — water does not
  // put a shrub in the middle of a chamber — but it does stain a wall, which is what the brief calls a
  // tide line, so the wall pass is where its own art will go.
  flooded: { tint: { fill: "#2b4c5a", opacity: 0.22 }, growth: 0.55, wall: 0.8, plant: 0 },
}

/** Two tints laid over each other, as one. The overlay is drawn once, so a condition cannot simply add
 * a second `tint` key — it has to fold into the one the rank already has. Alpha compositing over an
 * opaque ground: the result's opacity is what the two together let through, and its colour is the two
 * mixed in the proportion each contributes. */
const overlay = (
  base: { fill: string; opacity: number } | undefined,
  over: { fill: string; opacity: number }
): { fill: string; opacity: number } => {
  if (!base) return over
  const opacity = base.opacity + over.opacity * (1 - base.opacity)
  if (opacity === 0) return over
  const mix = (channel: number) => {
    const b = parseInt(base.fill.slice(1 + channel * 2, 3 + channel * 2), 16)
    const o = parseInt(over.fill.slice(1 + channel * 2, 3 + channel * 2), 16)
    return Math.round((o * over.opacity + b * base.opacity * (1 - over.opacity)) / opacity)
  }
  const hex = [0, 1, 2].map(c => mix(c).toString(16).padStart(2, "0")).join("")
  return { fill: `#${hex}`, opacity }
}

/** The air on this floor: its rank's own, with whatever its authored hour replaces, and whatever has got
 * into the site laid over the result. An unknown theme name is not an error — a family may recognise a
 * skin the map has no weather for — and simply leaves the rank's ambience alone. */
export const moodFor = (tier: Difficulty, theme?: string, condition?: SiteCondition): Mood => {
  const hour: Mood = { ...RANK_MOOD[tier], ...(theme ? (THEME_MOOD[theme] ?? {}) : {}) }
  if (!condition) return hour
  const amount = Math.max(0, Math.min(1, condition.amount))
  const spec = CONDITION_MOOD[condition.kind]
  if (!spec || amount === 0) return hour
  return {
    ...hour,
    tint: overlay(hour.tint, { fill: spec.tint.fill, opacity: spec.tint.opacity * amount }),
    // Densities out, not counts: the floor is what knows how many cells it has. Rounding, and the rule
    // that a root never rounds away, both moved to `MapGrowth` with them.
    growth: {
      floor: spec.growth * amount,
      wall: spec.wall * amount,
      chamber: spec.plant * amount,
      kind: condition.kind,
    },
  }
}
