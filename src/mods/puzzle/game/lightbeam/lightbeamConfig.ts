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
// | wizard  | doors, sockets, givens, decoys, shadows          |
//
// Measured over 40 seeds a tier, re-run in one pass when the diagonal cut arrived (§11.12) — the share of
// wrong turns a player can dismiss without following them, which is the ramp that matters (§6.3):
//
// | tier    | player pieces | legs a wrong turn runs | forks on it | seen from the door | worst gen |
// | starter | 3.0           | 2.96                   | 1.00        | 33%                |    11ms   |
// | junior  | 4.0           | 3.48                   | 1.50        | 25%                |    23ms   |
// | expert  | 5.9           | 4.09                   | 2.46        | 14%                |    34ms   |
// | master  | 6.9           | 4.38                   | 2.81        | 13%                |    61ms   |
// | wizard  | 8.2           | 5.86                   | 3.97        | 10%                |   312ms   |
//
// Monotone on every column, and junior against expert — 25% and 14% — is the collapse §6.3 found, closed.
// **Master and wizard part on the headline percentage for the first time**, 13% against 10%, which is what
// the diagonal cut bought at wizard: they used to tie at 13% and the note here used to say a second shadow
// was the only way to separate them and cost twice the generation time. It is the other way round — the cut
// separates them and master's worst board got nearly four times faster to build, because a diagonal draft
// that fails fails early.
//
// **Expert and master are the close pair now**, 14% against 13%, and this measure cannot see what parts
// them: §6.3 counts the geometry of a wrong branch, and what master spends is a *rung* — `exitRun` fires on
// 39 expert boards in 40 and 19 master ones (§11.12). That is worth knowing before the difficulty-metric
// swap §6.3 asks for lands, because the replacement measure will read these two as one tier again.
//
// The ladder is built on the two things §6.3 measured separately, because they are not the same currency:
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
  // Everything.
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
    cutMirrors: 1,
    techniqueCap: "onlySurvivor",
    goals: ["crossedBeams", "longChain", "clearTheWay", "sortTheWheat", "blindAlleys", "orderOfOperations"],
    goalCount: 2,
  },
}
