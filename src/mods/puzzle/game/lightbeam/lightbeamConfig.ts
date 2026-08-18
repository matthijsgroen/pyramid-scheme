import type { Difficulty } from "@/data/difficultyLevels"
import type { LightbeamOptions } from "./generateLightbeam"

// Tier settings, from docs/game-design/puzzles/lightbeam.md §6.4. Every tier gets a full configuration:
// this family is not gated to a debut tier, because a starter corridor can sit behind a ward gate deep
// inside a wizard pyramid, so a starter board is not only ever seen by a beginner.
//
// **Each tier adds ONE thing to the vocabulary** (§6.4), rather than turning every dial a little further:
//
// | starter | right angles only, dead ends kept short          |
// | junior  | a longer route, and the walls that come with it  |
// | expert  | sliding mirrors and sliding walls               |
// | master  | the diagonal cut — a route that leaves the rows  |
// | wizard  | doors, sockets, givens, shadows, three-stop forks |
//
// Measured over 40 seeds a tier, re-run in one pass when the fork arrived (§11.13):
//
// | tier    | player pieces | distinct forks | configurations | legs a wrong turn runs | forks on it | seen from the door | worst gen |
// | starter | 3.0           | 1              |            320 | 2.96                   | 1.00        | 33%                |    10ms   |
// | junior  | 4.0           | 1              |            640 | 3.48                   | 1.50        | 25%                |    19ms   |
// | expert  | 5.9           | 1              |          4 368 | 4.09                   | 2.46        | 14%                |    31ms   |
// | master  | 7.0           | 5              |          9 216 | 4.42                   | 2.86        | 13%                |    55ms   |
// | wizard  | 7.1           | 23             |         37 350 | 5.56                   | 3.47        | 11%                |   655ms   |
//
// **"Seen from the door" is no longer the number to steer by, and this table is where that gets recorded.**
// §6.3 built the ramp on it — the share of wrong turns a player can dismiss without following them — on the
// premise that following one costs something. It does not: a wrong mirror turn is one tap, the beam redraws,
// and you turn again. So the column measures a cost the player never pays, and it shows: wizard's fork went
// from 5 shapes to 23 and its configuration space from 21 216 to 37 350 while that percentage moved from 10%
// to 11%, i.e. the maze got substantially bigger and the metric read it as very slightly easier.
//
// `docs/instructions/puzzle-screens.md` §5 already names the honest signal and it is a different one:
// **which techniques a puzzle needs**. That is `techniqueCap` below, which every board is gated against.
// The two columns worth reading beside it are the ones the player actually meets — how many pieces they
// hold, and how many ways each of them can be set. The other three stay for continuity with §6.3 and
// because monotone-on-every-column is still a cheap thing to notice going backwards.
//
// The old note here claimed master and wizard could only be parted by a second shadow costing twice the
// generation time. Both halves were wrong: the diagonal cut parted them, and it made master's worst board
// four times faster to build, because a diagonal draft that will not fit fails in the route builder.
//
// Two currencies §6.3 measured separately, kept here because route length and piece placement really are
// different levers even if the percentage they were justified by is not the one to steer by:
//
// - **Legs** — how far a wrong turn must be followed before it closes. Bought with route length, which is
//   why junior's one addition is a longer route. Walls are not a separate dial; a longer route is what
//   makes `blockWrongSettings` need them, since a wrong ray on a short route mostly runs off the frame.
// - **Forks** — how many unsettled pieces stand in that wrong ray, which is the only thing that stops T3
//   `deadEnd` from settling it in one step. Bought with pieces placed where wrong rays go: expert's
//   sliding pieces, and wizard's shadows.
//
// **Master's addition is the diagonal cut** (§11.8), built in §11.12's step. Shadows held the slot until it
// was, and they were the right stand-in — they are what makes the cap bite at all (§6.1) — so they moved to
// wizard's baseline and master's goal pool rather than being dropped.
//
// A tier's goal pool is **derived from its vocabulary, not authored beside it** (§6.4). Three goals change
// the piece list rather than the amount of it — `longChain` adds a given, `clearTheWay` adds a sliding
// wall, `orderOfOperations` adds a door and its sockets — so each may only be drawn once its tier has met
// that piece. Before this rule a starter board could draw a sliding wall and an expert board a door.
// `sortTheWheat` also waits for `neverReached`, since a decoy is only fair once a rung can prove it
// irrelevant.
//
// **Starter draws no goal at all.** Every goal either introduces a piece it has not met or lengthens the
// route it is meant to keep short, and a tier that teaches rather than tests does not need one.
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
  // Right angles, the shortest route the board allows, and nothing else. Fiddling works here on purpose.
  //
  // Three bends rather than two, and that is a floor rather than a preference: two binary pieces make four
  // configurations, and every dark one of them is either a tap from done or solved by tapping both — so
  // `openingIsHonest` rejects the lot and nothing generates. Three player pieces is the least an honest
  // board can carry.
  starter: {
    size: 7,
    turns: 3,
    techniqueCap: "deadEnd",
    goals: [],
    goalCount: 0,
  },
  // One addition: a longer route.
  //
  // The ladder in §6.4 asks for walls here too, and they do not come: measured over 40 seeds, junior ships
  // 0.00 fixed walls. `blockWrongSettings` only ever adds one where a wrong ray would otherwise rejoin the
  // route, `thinWalls` strips every one that is not load-bearing (§5.1), and on a route this length a wrong
  // turn nearly always runs off the frame instead. Walls only start appearing once the board is dense
  // enough to need them — 0.05 at expert, 0.23 at master. There is no dial for them, and adding one would
  // ship stone the player cannot spend, which §5.1 rules out. So junior's addition is route length alone.
  junior: {
    size: 8,
    turns: 4,
    fiddleProof: true,
    // The same reasoning as starter, over a longer route. Junior's addition buys legs, not forks (§6.3), and
    // the shrine-side elimination needs a piece standing in the wrong ray — which is expert's addition, not
    // this one. Leaving the cap at `feedsExit` would be a ceiling no junior board ever reaches.
    techniqueCap: "deadEnd",
    goals: [],
    goalCount: 0,
  },
  // One addition: pieces that slide. A sliding piece is a piece standing where a wrong ray goes, which is
  // what starts the fork count moving.
  //
  // The sliding MIRROR is the baseline, so every expert board has one. The sliding WALL comes from
  // `clearTheWay` in the pool rather than from the baseline — §7's lean-baseline rule, and it is also what
  // keeps this affordable: pinned into every board it took wizard's worst generation from 520ms to 1407ms,
  // because a three-stop track has to fit a straight stretch that is spaced from everything already there.
  expert: {
    size: 8,
    turns: 5,
    slidingMirrors: 1,
    slidingStops: 3,
    fiddleProof: true,
    techniqueCap: "neverReached",
    goals: ["crossedBeams", "clearTheWay", "sortTheWheat"],
    goalCount: 1,
  },
  // One addition: **the diagonal cut** (§11.8) — the slot §6.4 has always assigned here, and shadows were
  // only ever holding it. So the shadow comes off the baseline as the cut mirror goes on: it is a swap
  // rather than a second addition, which is what the vocabulary ladder means by one new thing a tier.
  // Master boards still meet a shadow through `blindAlleys` in the pool, on the boards that draw it.
  //
  // Measured over 40 seeds (§11.12): the trade is a rung rather than a piece. `exitRun` — the family's
  // clearest sentence, "the shrine can only be lit from there" — falls from 34 boards in 40 to 15, and
  // `onlySurvivor` does that work instead. That is what a board pays for reasoning it cannot read off the
  // rows and columns, and it is why the cut belongs at a tier whose cap already allows the exhaustive pair.
  master: {
    size: 8,
    turns: 5,
    slidingMirrors: 1,
    slidingStops: 3,
    cutMirrors: 1,
    fiddleProof: true,
    techniqueCap: "onlySurvivor",
    goals: ["crossedBeams", "clearTheWay", "sortTheWheat", "blindAlleys"],
    goalCount: 2,
  },
  // Everything, and one addition of its own: **a mirror's fork is three stops rather than two** (§11.8
  // rule 1, measured in §11.13). Every other tier authors `[45°, 135°]` and nothing else; a wizard board
  // draws its lists per piece, so the same nine mirrors offer 23 different forks across 40 boards instead
  // of 5. The piece count does not move — this is rule 8's "one piece doing more", the same trade the
  // diagonal cut made at master.
  //
  // **The decoy pays for it**, which is rule 8's cost model applied rather than quoted: three stops is 1.5×,
  // so something goes. Measured over 40 seeds — keeping the decoy took wizard's worst board to 1511ms, which
  // is past the 1400ms this file already calls a trade not worth making; dropping it lands at 605ms with the
  // configuration space still 1.8× what two stops gave. Decoys still reach wizard boards through
  // `sortTheWheat` in the pool, and `neverReached` still fires without one, because a shadow is a decoy too.
  wizard: {
    size: 9,
    turns: 6,
    setMirrors: 1,
    slidingMirrors: 1,
    slidingStops: 3,
    fiddleProof: true,
    doors: 1,
    doorNodes: 2,
    shadows: 1,
    cutMirrors: 1,
    mirrorStops: 3,
    techniqueCap: "onlySurvivor",
    goals: ["crossedBeams", "longChain", "clearTheWay", "sortTheWheat", "blindAlleys", "orderOfOperations"],
    goalCount: 2,
  },
}
