import type { Difficulty } from "@/data/difficultyLevels"
import type { StarBattleOptions } from "./generateStarBattle"

// Tier settings, per docs/game-design/puzzles/star-battle.md §5.
//
// **Two knobs, and they pull against each other.** `regionSpread` decides how uneven the regions are, and a
// STEEPER spread makes an EASIER board, because a one-square region hands the player a star. The gates above
// it — `minRegion`, `noLineRegions`, `firstStarAfter` — take those gifts back: a region has to be three
// squares and has to touch two rows and two columns, and the first star may not land until the player has
// eliminated for a few steps. Measured against a LinkedIn Queens board, which has no gift at all and which
// this ladder could not move a single square on before `wouldStrand` existed (design doc §3.5).
export const STAR_BATTLE_CONFIG: Record<Difficulty, StarBattleOptions> = {
  // Counting alone, on the smallest grid, with regions uneven enough that a one-square one opens the board.
  // **The gifts are the teaching here** and stay: nothing on this tier needs the boundary to mean more than
  // "this is a group".
  starter: { size: 5, quota: 1, regionSpread: 3, techniqueCap: "groupTight" },
  // The region becomes a clue: one squeezed into a single line spends that line's star.
  junior: { size: 6, quota: 1, regionSpread: 3, techniqueCap: "regionLine", requires: ["regionLine"] },
  // The first tier with no gift in it: every region is three squares or more and none sits inside one line,
  // so the opening has to be argued rather than read. The reasoning is still the region readings.
  expert: {
    size: 6,
    quota: 1,
    regionSpread: 2,
    minRegion: 3,
    noLineRegions: true,
    techniqueCap: "spanning",
    requires: ["regionLine", "spanning"],
    requiresCount: 2,
  },
  // The hypothesis arrives, and with it an opening the board makes the player earn: three eliminations
  // before the first star. Smaller than the tier above it on purpose — the difficulty is in the map's shape
  // and the rung, not in the bookkeeping a wider grid buys.
  master: {
    size: 7,
    quota: 1,
    regionSpread: 2,
    minRegion: 3,
    noLineRegions: true,
    techniqueCap: "wouldStrand",
    requires: ["wouldStrand"],
    requiresCount: 2,
    firstStarAfter: 3,
  },
  // The same reasoning spent twice as often on a board half again as wide, and five steps of elimination
  // before a star lands — the shape of the Queens board this family was measured against.
  wizard: {
    size: 8,
    quota: 1,
    regionSpread: 2,
    minRegion: 3,
    noLineRegions: true,
    techniqueCap: "wouldStrand",
    requires: ["wouldStrand"],
    requiresCount: 4,
    firstStarAfter: 5,
  },
}
