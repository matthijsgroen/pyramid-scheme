import type { Difficulty } from "@/data/difficultyLevels"
import type { ConstellationOptions } from "./generateConstellation"

// Tier settings, per docs/game-design/puzzles/constellation.md §5. Each tier adds ONE rung and generation is
// made to prove it: `techniqueCap` says how far the reasoning may go, `requires` says the tier's own rung has
// to fire, and `requiresCount` says how often.
//
// `doubleChance` and `spareChance` are the number mix, which is the dial that actually scales this family: a
// sky of 3s and 4s opens itself, because a high number has few ways to be satisfied and forces its own lines,
// while a sky of 1s and 2s forces nothing and has to be reasoned into. So the mix leans OUT as the tiers go
// up, and the top two tiers share a width.
export const CONSTELLATION_CONFIG: Record<Difficulty, ConstellationOptions> = {
  // Counting on the smallest sky that holds it: numbers that use up every way out, and stars with one way
  // left. A board that teaches itself by being dragged on, which is P5's wordless first encounter.
  starter: { size: 5, stars: 6, doubleChance: 0.5, spareChance: 0.45, techniqueCap: "soleWayOut" },
  // Lines start getting in each other's way, which is the first reason on the ladder that is not arithmetic.
  junior: { size: 6, stars: 9, doubleChance: 0.4, spareChance: 0.4, techniqueCap: "crossed", requires: ["crossed"] },
  // The pigeonhole: what the other ways out cannot carry between them has to come this way. The rung that
  // opens a sky no amount of counting can start, so the tier is built to spend it twice.
  expert: {
    size: 7,
    stars: 13,
    doubleChance: 0.3,
    spareChance: 0.3,
    techniqueCap: "atLeastOne",
    requires: ["atLeastOne"],
    requiresCount: 2,
  },
  // Connectivity arrives as the one-clause reading of it: two stars that joining would finish, with sky left
  // over.
  master: {
    size: 8,
    stars: 16,
    doubleChance: 0.25,
    spareChance: 0.25,
    techniqueCap: "twinBlock",
    requires: ["twinBlock"],
    requiresCount: 2,
  },
  // **The top tier is the same sky leaned out, not a wider one.** More stars carrying 1 and 2, and the group
  // rung required — which is the "scales without growing" claim the family doc makes, and the tier to time
  // first, since tracing a group is the one piece of bookkeeping here that couples the whole board.
  //
  // The mix is leaner than it looks like it needs to be, because it was measured: at 0.15/0.15 the sealing
  // rung fired twice on 8 skies in 10, and at 0.1/0.1 on all 10. Growing the sky instead — 22 stars at the
  // old mix — took it DOWN to 1 in 10, since a denser sky hands the counting rungs enough work to finish the
  // board on their own. Which is the family's scaling claim, arrived at the hard way.
  wizard: {
    size: 8,
    stars: 20,
    doubleChance: 0.1,
    spareChance: 0.1,
    techniqueCap: "isolation",
    requires: ["isolation"],
    requiresCount: 2,
  },
}
