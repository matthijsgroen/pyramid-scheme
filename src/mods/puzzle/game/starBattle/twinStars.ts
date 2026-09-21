import type { Difficulty } from "@/data/difficultyLevels"
import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generateStarBattle, gradeStarBattle } from "./generateStarBattle"
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
 * also gives the mechanic a PAIR to name, which is the strongest fiction a skin on this board can hang on
 * (§11.3): two watchmen to a district, two torches to a chamber, two households to a field. Strongest, not
 * only — one farmstead to a holding reads perfectly well, which is why both families wear both faces.
 */
export const TWIN_STARS_META: FamilyMeta = {
  id: "twin-stars",
  ownerMod: "puzzle",
  // The same pools star battle carries. What this family adds to Water & Agriculture is not a face — it
  // wears the same `fields` (app/starBattle/skins.ts) — but different reasoning: a holding that takes two
  // households stays a capacity argument until its second one lands.
  tags: ["puzzle", "sky", "water", "agriculture"],
  // A farm and a sky, the same two star battle lists. A site never names a skin, it names a role.
  themes: ["default", "fields"],
  // 8×8 is the SMALLEST grid this rule has boards on — 7×7 and 6×6 admit no legal star set at all (two to
  // a row and two to a column that never touch does not fit). The debut is a junior one anyway, because the
  // tier is set by what a board ASKS rather than by how wide it is: the junior draw hands over a third of
  // its regions and never needs a region reading (§11.2).
  // The same board and the same faces as star battle, which it shares a screen with.
  faces: {
    sky: ["default"],
    water: ["fields"],
    agriculture: ["fields"],
  },
  minTier: "junior",
  icon: "✨",
  color: "violet",
  rewardPriority: 60, // a puzzle room like any other — fills once treasure's guaranteed slots are spoken for
  // Reads the table below, which is declared after this — only ever called once a room opens, never at
  // module load.
  seedable: seedable({
    resolveOptions: ({ difficulty }) => TWIN_STARS_CONFIG[difficulty ?? "expert"],
    generate: generateStarBattle,
    grade: gradeStarBattle,
  }),
}

/**
 * Every tier is 8×8, and the ladder is carried by the smallest region, the spread and the required rung.
 *
 * **The size cannot be the knob here.** Below 8×8 no board exists, and above it the board stops fitting a
 * phone: 10×10 lands on 34.8px squares at 390px wide against 43.5px for this one, under both platforms'
 * touch minimum, on a board whose main gesture is a drag across a row. So the family holds one grid and
 * separates its tiers by what a board asks instead.
 *
 * **`minRegion` is the knob playtesting turned up, and it is the strongest one here.** A region of three
 * squares can only be a straight line and a straight three owing two stars has ONE filling, so every one of
 * them is a gift the player takes on sight. At the arithmetic floor an 8×8 opens with about four of its
 * eight regions already answered — which reads as a junior board however hard the solver had to work for
 * the rest. Raising the floor to five removes them: 0.0–0.1 a board.
 *
 * **It was not enough, and the measurement that says so is the same one star battle's top tiers were
 * rebuilt on.** Every tier here placed its first star on step 0, 1 or 2 and settled in 27–31 steps: a board
 * whose opening is handed over is an easy board however tight its regions are. From expert up, no region
 * may sit inside one line; from master up the board must be argued open with `wouldStrand`, and the first
 * star may not land until the player has eliminated for several steps. Measured: master 31–49 steps with
 * the first star at step 8–20, wizard 38–46 at step 12–17, against 27–31 at step 0–2 before.
 *
 * **The harder rung makes the boards CHEAPER to draw**, which is the opposite of what the tiers cost
 * before: master fell from 609ms to about 55ms, because a ladder that can open a board without a gift can
 * also keep the maps that have none.
 *
 * Measured over eight boards a tier, none falling back to a nearest miss.
 */
export const TWIN_STARS_CONFIG: Record<Difficulty, StarBattleOptions> = {
  // Unreachable — the allocator never draws this family below its minTier. Present because the tier table
  // is total, and pointed at the gentlest real tier so a lab misconfiguration plays rather than throws.
  starter: {
    size: 8,
    quota: 2,
    regionSpread: 3,
    minRegion: 3,
    techniqueCap: "onlyWay",
    requires: ["onlyWay"],
    requiresCount: 3,
  },
  // **The gifts are the tier.** Three-square regions are left in and the board opens with a third of its
  // regions handed over, which is what makes a first encounter teach itself: the rule is demonstrated by
  // squares the player can place before working anything out. No region reading is allowed at all, so the
  // rest is counting. 4ms a board.
  junior: {
    size: 8,
    quota: 2,
    regionSpread: 3,
    minRegion: 3,
    techniqueCap: "onlyWay",
    requires: ["onlyWay"],
    requiresCount: 3,
  },
  // The gifts go away twice over: no region small enough to read on sight, and none sitting inside a single
  // line either, so the region boundary has to be argued rather than spotted. Two eliminations before the
  // first pair lands. 28–32 steps at about 500ms.
  expert: {
    size: 8,
    quota: 2,
    regionSpread: 3,
    minRegion: 5,
    noLineRegions: true,
    techniqueCap: "spanning",
    requires: ["regionLine", "spanning"],
    requiresCount: 2,
    firstStarAfter: 2,
  },
  // The hypothesis arrives, and with it an opening the board makes the player earn. This is where the
  // family stops being a counting exercise: 31–49 steps, of which nine to twenty-one are the new rung.
  master: {
    size: 8,
    quota: 2,
    regionSpread: 3,
    minRegion: 5,
    noLineRegions: true,
    techniqueCap: "wouldStrand",
    requires: ["wouldStrand"],
    requiresCount: 4,
    firstStarAfter: 6,
  },
  // The same reasoning at the tighter spread and much more of it, on a board that may not give up a star
  // for a dozen steps. The grid cannot grow (see above), so the top tier is bought with the opening.
  wizard: {
    size: 8,
    quota: 2,
    regionSpread: 2,
    minRegion: 5,
    noLineRegions: true,
    techniqueCap: "wouldStrand",
    requires: ["wouldStrand"],
    requiresCount: 10,
    firstStarAfter: 12,
  },
}
