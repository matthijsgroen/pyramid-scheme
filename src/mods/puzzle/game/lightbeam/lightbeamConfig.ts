import type { Difficulty } from "@/data/difficultyLevels"
import type { LightbeamOptions } from "./generateLightbeam"

// Tier settings, from docs/game-design/puzzles/lightbeam.md §6. Every tier gets a full configuration:
// this family is not gated to a debut tier, because a starter corridor can sit behind a ward gate deep
// inside a wizard pyramid, so a starter board is not only ever seen by a beginner. Starter is therefore
// gentle rather than empty — a real route to find, just a short one with a low cap.
//
// Two dials do the work, and they pull against each other:
//
// - **The cap** is what a board may DEMAND, as everywhere in the catalogue.
// - **`shadows`** is what makes a board demand it. Built without them, a board is a chain of "the light
//   visibly dies there" whatever the cap says, and every tier solves like starter only bigger. A shadow
//   puts something unsettled in the way of a wrong setting, and then ruling that setting out takes the
//   rungs the tier was set to reach.
//
// Measured over 40 seeds a tier: 3.0 / 3.7 / 5.8 / 6.6 / 8.4 movable pieces and 8 / 14 / 57 / 105 / 371
// configurations, so the space the player is choosing inside grows the whole way up. Starter is settled
// by a visible dead end alone; two thirds of master and wizard boards need the exhaustive rung.
//
// 7 wide is the ceiling, matching the other grid families: inside a 360px encounter modal there are no
// gutters to reclaim here, so a cell is simply the board over N — 47px at seven columns, and an eighth
// would drop under a thumb's width (docs/instructions/puzzle-screens.md §1).
export const LIGHTBEAM_CONFIG: Record<Difficulty, { size: number } & LightbeamOptions> = {
  starter: { size: 5, turns: 3, techniqueCap: "deadEnd" },
  junior: { size: 5, turns: 4, setMirrors: 1, slidingMirrors: 1, shadows: 1, techniqueCap: "feedsExit" },
  expert: {
    size: 6,
    turns: 3,
    slidingMirrors: 1,
    slidingWalls: 1,
    decoys: 1,
    shadows: 1,
    techniqueCap: "neverReached",
  },
  master: {
    size: 6,
    turns: 3,
    slidingMirrors: 1,
    slidingWalls: 1,
    decoys: 1,
    shadows: 2,
    techniqueCap: "onlySurvivor",
  },
  wizard: {
    size: 7,
    turns: 5,
    setMirrors: 1,
    slidingMirrors: 2,
    slidingWalls: 1,
    decoys: 1,
    shadows: 3,
    techniqueCap: "onlySurvivor",
  },
}
