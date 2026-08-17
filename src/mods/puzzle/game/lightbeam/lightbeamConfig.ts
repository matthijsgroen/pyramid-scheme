import type { Difficulty } from "@/data/difficultyLevels"
import type { LightbeamOptions } from "./generateLightbeam"

// Tier settings, from docs/game-design/puzzles/lightbeam.md §6 and §7. Every tier gets a full
// configuration: this family is not gated to a debut tier, because a starter corridor can sit behind a
// ward gate deep inside a wizard pyramid, so a starter board is not only ever seen by a beginner. Starter
// is therefore gentle rather than empty — a real route to find, just a short one with a low cap.
//
// Three dials, and they do different jobs:
//
// - **The cap** is what a board may DEMAND, as everywhere in the catalogue.
// - **`shadows`** is what makes a board demand it. Built without them, a board is a chain of "the light
//   visibly dies there" whatever the cap says, and every tier solves like starter only bigger. A shadow
//   puts something unsettled in the way of a wrong setting, so ruling that setting out takes the rungs the
//   tier was set to reach.
// - **`goals`** is what kind of problem the board is, as against how hard. The numbers below are a LEAN
//   BASELINE, and one or two goals turn their own dials hard on top (goals.ts). Before this existed every
//   dial was turned a little on every board, so every wizard grid was the average wizard grid.
//
// The split that keeps the ramp intact: **the tier sets the route** — how long, how wide, how much is
// given — and **a goal sets what is in the way**. Measured over 40 seeds a tier with goals drawn:
// 3.0 / 3.9 / 5.4 / 6.3 / 8.0 movable pieces and 8 / 15 / 45 / 82 / 315 configurations, no goal falling
// back on any tier, worst generation 50ms. Starter is settled by a visible dead end alone; expert always
// has a piece to reason irrelevant; half of master and two thirds of wizard need the exhaustive rung.
//
// Which goals a tier may draw is a fairness question, not a taste one:
//
// - `sortTheWheat` piles on decoys, and a decoy is only fair once `neverReached` can prove it irrelevant —
//   so expert and up.
// - `blindAlleys` piles on shadows, which need at least the shrine-side elimination to unpick — so junior
//   and up.
//
// **Grid size is capacity, not difficulty.** It is set by what has to fit — the route's length, the pieces,
// and the empty shoulders that keep two tappable pieces apart — and it barely moves how hard a board is,
// because the configuration space is driven by piece count and the reasoning by the cap. Difficulty is the
// cap and the goals; size is the canvas they need. An earlier version of this table listed grid size as a
// difficulty knob, which was wrong.
//
// That is also why this family goes past the 7-wide ceiling the other grid families stop at. Theirs is a
// real ceiling because every cell is tappable, so cell size IS tap-target size. Here only the movable
// pieces are tappable, they are never allowed to touch (generateLightbeam's `piecesAreSpaced`), and a piece
// therefore owns the empty shoulders around it — so its hit area can be a thumb wide while the cell it
// stands in is smaller. `LightbeamBoard` spends that, and the sizes below run 45 / 45 / 40 / 40 / 35px a
// cell inside a 360px modal (docs/instructions/puzzle-screens.md §1, and §9 of the family doc).
export const LIGHTBEAM_CONFIG: Record<Difficulty, { size: number } & LightbeamOptions> = {
  starter: {
    size: 7,
    turns: 2,
    techniqueCap: "deadEnd",
    goals: ["longChain", "clearTheWay"],
    goalCount: 1,
  },
  junior: {
    size: 7,
    turns: 3,
    slidingMirrors: 1,
    fiddleProof: true,
    techniqueCap: "feedsExit",
    goals: ["longChain", "clearTheWay", "blindAlleys", "crossedBeams"],
    goalCount: 1,
  },
  expert: {
    size: 8,
    turns: 3,
    slidingMirrors: 1,
    slidingStops: 3,
    fiddleProof: true,
    techniqueCap: "neverReached",
    goals: ["longChain", "sortTheWheat", "clearTheWay", "blindAlleys", "orderOfOperations", "crossedBeams"],
    goalCount: 2,
  },
  master: {
    size: 8,
    turns: 4,
    slidingMirrors: 1,
    slidingStops: 3,
    fiddleProof: true,
    shadows: 1,
    techniqueCap: "onlySurvivor",
    goals: ["longChain", "sortTheWheat", "clearTheWay", "blindAlleys", "orderOfOperations", "crossedBeams"],
    goalCount: 2,
  },
  wizard: {
    size: 9,
    turns: 6,
    setMirrors: 1,
    slidingMirrors: 1,
    slidingStops: 3,
    fiddleProof: true,
    doors: 1,
    doorNodes: 2,
    decoys: 1,
    shadows: 1,
    techniqueCap: "onlySurvivor",
    goals: ["longChain", "sortTheWheat", "clearTheWay", "blindAlleys", "orderOfOperations", "crossedBeams"],
    goalCount: 2,
  },
}
