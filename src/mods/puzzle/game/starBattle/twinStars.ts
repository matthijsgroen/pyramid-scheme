import type { Difficulty } from "@/data/difficultyLevels"
import type { FamilyMeta } from "@/game/families/familyMeta"
import type { StarBattleOptions } from "./generateStarBattle"

/**
 * Two stars to every row, column and region — the classic form of the mechanic, and its own family rather
 * than star battle's top tier.
 *
 * **It is a second family because the rule is different, not because the board is bigger.** A tier may ask
 * for harder reasoning; it may not change what the player is being asked to do, and "two" changes every
 * sentence on the screen. Everything below the rule is shared outright: the same board, the same three
 * marks, the same drag, the same six rungs, the same hints (design doc §11).
 *
 * What the second star buys is the reason this exists. At one star a group is answered the moment its star
 * is found; at two, a group stays a capacity argument until its last star lands — `groupTight` fires ten
 * times a board here against eight at one star, and it fires on squares rather than on a single square. It
 * also gives the mechanic a PAIR to name, which is what a skin can hang a fiction on (§11.3): two watchmen
 * to a district, two torches to a chamber. A lone star only ever reads as the one and only, which is why
 * star battle wears `sky` and nothing else.
 */
export const TWIN_STARS_META: FamilyMeta = {
  id: "twin-stars",
  ownerMod: "puzzle",
  // The same cluster star battle carries, for the same reason: this is about where things sit, not about
  // light. A journey asking for `sky` may draw either, which is the point of them being two families.
  tags: ["puzzle", "sky"],
  // 8×8 is the SMALLEST grid this rule has boards on — 7×7 and 6×6 admit no legal star set at all (two to
  // a row and two to a column that never touch does not fit), so there is no junior form to debut with and
  // the family starts where its one grid is a fair ask.
  minTier: "expert",
  icon: "✨",
  color: "violet",
  rewardPriority: 60, // a puzzle room like any other — fills once treasure's guaranteed slots are spoken for
}

/**
 * Every tier is 8×8, and the ladder is carried by the region spread and the required rung.
 *
 * **The size cannot be the knob here.** Below 8×8 no board exists, and above it the board stops fitting a
 * phone: 10×10 lands on 34.8px squares at 390px wide against 43.5px for this one, under both platforms'
 * touch minimum, on a board whose main gesture is a drag across a row. So the family holds one grid and
 * separates its tiers the way the design doc says this mechanic separates them anyway — by how evenly the
 * regions are sized, and by which reading a board is made to spend (§5).
 *
 * Measured over twenty boards each, none falling back to a nearest miss.
 */
export const TWIN_STARS_CONFIG: Record<Difficulty, StarBattleOptions> = {
  // Unreachable — the allocator never draws this family below its minTier. Present because the tier table
  // is total, and pointed at the cheapest real tier so a lab misconfiguration plays rather than throws.
  starter: { size: 8, quota: 2, regionSpread: 3, techniqueCap: "regionLine", requires: ["regionLine"] },
  junior: { size: 8, quota: 2, regionSpread: 3, techniqueCap: "regionLine", requires: ["regionLine"] },
  // A steep spread, so a three-in-a-line region hands over both its stars and opens the board — the
  // two-star form of the one-square region that opens a star battle. Region-into-line twice, nothing above
  // it. 15ms a board to find.
  expert: {
    size: 8,
    quota: 2,
    regionSpread: 3,
    techniqueCap: "regionLine",
    requires: ["regionLine"],
    requiresCount: 2,
  },
  // The spread tightens, which takes the opening gift away, and the converse reading has to be spent three
  // times. 307ms a board.
  master: {
    size: 8,
    quota: 2,
    regionSpread: 2,
    techniqueCap: "lineRegion",
    requires: ["lineRegion"],
    requiresCount: 3,
  },
  // The top rung, twice — and unlike star battle's own top two tiers these differ in spread as well as in
  // the rung they must spend, so the separation is not resting on the requirement alone. 219ms a board.
  wizard: {
    size: 8,
    quota: 2,
    regionSpread: 2,
    techniqueCap: "spanning",
    requires: ["spanning"],
    requiresCount: 2,
  },
}
