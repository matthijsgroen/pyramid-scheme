import type { Difficulty } from "@/data/difficultyLevels"
import type { StarBattleOptions } from "./generateStarBattle"

// Tier settings, per docs/game-design/puzzles/star-battle.md §5.
//
// **`regionSpread` is the knob that carries this family**, and it runs the opposite way to intuition: a
// STEEPER spread of region sizes makes an EASIER board, because a one-square region hands the player a star.
// Measured on 8×8: at spread 3, six draws in a hundred are solvable and the region rungs never fire at all;
// at spread 2 it is one draw in a hundred and each board spends two or three region readings. The technique
// cap and the required rung then say which reasoning those boards are allowed and made to use.
export const STAR_BATTLE_CONFIG: Record<Difficulty, StarBattleOptions> = {
  // Counting alone, on the smallest grid, with regions uneven enough that a one-square one opens the board.
  // Nothing here needs the boundary to mean more than "this is a group".
  starter: { size: 5, quota: 1, regionSpread: 3, techniqueCap: "groupTight" },
  // The region becomes a clue: one squeezed into a single line spends that line's star.
  junior: { size: 6, quota: 1, regionSpread: 3, techniqueCap: "regionLine", requires: ["regionLine"] },
  // The spread tightens, which is what makes the region readings the board rather than a moment in it.
  expert: {
    size: 7,
    quota: 1,
    regionSpread: 2,
    techniqueCap: "lineRegion",
    requires: ["regionLine"],
    requiresCount: 2,
  },
  // The converse reading arrives, and it needs the rest of a line already emptied — so it comes later in a
  // solve than the region-into-line one, and a bigger grid is what makes room for it.
  master: {
    size: 8,
    quota: 1,
    regionSpread: 2,
    techniqueCap: "lineRegion",
    requires: ["regionLine"],
    requiresCount: 3,
  },
  // The top rung, spent at least once. **The top two tiers share a size and differ in the rung they must
  // spend**, which is the weakest tier separation in the catalogue and is written down as the lab's starting
  // point rather than a claim (design doc §5).
  wizard: { size: 8, quota: 1, regionSpread: 2, techniqueCap: "spanning", requires: ["spanning"] },
}
