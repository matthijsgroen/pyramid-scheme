import type { Difficulty } from "@/data/difficultyLevels"
import type { LightbeamOptions } from "./generateLightbeam"

// Tier settings (design doc §6.4, measured in §11.19).
//
// **Each tier adds ONE thing to the vocabulary** (§6.4), rather than turning every dial a little further. A
// tier's character comes from its `modePool` (§11.18) and its difficulty from what stands in a wrong ray,
// which is `branchDepth`: a branch that turns needs a mirror, that mirror is off the winning beam's line by
// construction, and a piece standing in a wrong ray is what §6.1 measured as the only thing that makes the
// technique cap bite.
//
// Every tier gets a full configuration — this family is not gated to a debut tier, because a starter corridor
// can sit behind a ward gate deep inside a wizard pyramid. So starter must be *gentle*, not empty.
//
// Measured over 40 seeds a tier (§11.19):
//
// | tier    | pieces | on the route | configurations | attempts a board | worst gen |
// | starter | 3.0    | 3.0          | 8              | 1.00             | 10ms      |
// | junior  | 4.0    | 4.0          | 16             | 1.10             |  7ms      |
// | expert  | 5.5    | 4.0          | 80             | 3.30             | 20ms      |
// | master  | 7.0    | 5.0          | 228            | 2.10             | 19ms      |
// | wizard  | 9.8    | 6.8          | 1 741          | 2.70             | 616ms     |
//
// Configurations are **per board**. Stating that because the column this replaced was a total across all 40
// boards while reading as per-board, and it cost a tuning pass aimed at putting 37 350 configurations on one
// wizard grid before anyone noticed.
//
// | starter | right angles, branches that run straight out          |
// | junior  | a longer route, and stone to die in (wall-heavy)      |
// | expert  | branches that turn, and pieces that slide            |
// | master  | the diagonal cut                                     |
// | wizard  | doors, sockets and a trap — and two modes a board     |
//
// **Three constraints the measurements imposed on this table rather than the other way round** (§11.17,
// §11.18):
//
//  1. **`branchDepth` >= 1 needs a cap above `deadEnd`.** A branch mirror is a shadow, and a shadow defeats
//     `deadEnd` by design — the light disappears into a piece nobody has settled instead of visibly dying. So
//     starter and junior cannot carry one, and generation refuses rather than quietly building an easier
//     board. That is why their branches run straight, and it is also why their addition has to be something
//     else: length, and stone.
//  2. **Wall-heavy is not a difficulty dial.** It buys legibility and spends uncertainty — `onlySurvivor`
//     falls from 138 boards in 200 to 77 when it is on — so it belongs at junior, where being able to point
//     at where the light died is the whole lesson, and not at the top.
//  3. **Wall-heavy and traps fight.** With both on, decorative-trap rejections go from 6 in 60 boards to 58,
//     because wall-heavy's stone kills the trap corridor before the trap gets to. So wizard draws two modes
//     of three and the generator skips the trap on the boards that drew wall-heavy — recorded per board, so
//     a spec can assert the trap is not quietly disappearing.
//
// Grid size is capacity, not difficulty (§6.2): it is set by what has to fit — the route, the pieces, and the
// empty shoulders that keep two tappable pieces apart.
export const LIGHTBEAM_CONFIG: Record<Difficulty, { size: number } & LightbeamOptions> = {
  // Right angles, three bends, and every branch running straight out to the frame or a wall. Nothing stands
  // in a wrong ray, so every board settles on "the light visibly dies there" — which is what a `deadEnd` cap
  // means, and it is the tier that teaches rather than tests.
  //
  // Three bends rather than two is a floor, not a preference: two binary pieces make four configurations and
  // every dark one is a tap from done or solved by tapping both, so `openingIsHonest` refuses the lot.
  starter: {
    size: 7,
    turns: 3,
    interactive: 1,
    branchDepth: 0,
    techniqueCap: "deadEnd",
  },
  // One addition: a longer route, and **stone to die in**. §6.4 has always asked for walls here; wall-heavy is
  // what delivers them, because it closes a branch in stone even where the frame would have done it for
  // nothing. Measured at 2.98 walls a board, and "it hit that" is a stronger sentence for a tier still
  // learning to read the board than "it went away".
  junior: {
    size: 8,
    turns: 4,
    interactive: 1,
    branchDepth: 0,
    fiddleProof: true,
    modes: ["wallHeavy"],
    techniqueCap: "deadEnd",
  },
  // One addition: **something standing in the wrong ray.** Branches may turn, which puts a mirror off the
  // winning beam's line, and a golden bend may slide instead of turning. Both are the same purchase in §6.3's
  // currency — forks — and both need a cap that can prove a piece irrelevant, which is what `neverReached` is.
  expert: {
    size: 8,
    turns: 5,
    interactive: 0.85,
    branchDepth: 1,
    sliders: 1,
    slidingStops: 3,
    fiddleProof: true,
    modes: ["sliderHeavy"],
    techniqueCap: "neverReached",
  },
  // One addition: **the diagonal cut** (§11.8). The bend would have carried a mirror anyway; what changes is
  // that its answer is a half-step and its stop set reaches 67.5° the other way, so the ray leaves the rows
  // and columns the player can read. It is a swap rather than an extra piece, which is rule 8's cost model.
  master: {
    size: 8,
    turns: 5,
    cutMirrors: 1,
    interactive: 0.9,
    branchDepth: 1,
    sliders: 1,
    slidingStops: 3,
    fiddleProof: true,
    modes: ["sliderHeavy"],
    techniqueCap: "onlySurvivor",
  },
  // Everything, and its own addition: **a socket, and a trap** (§11.1). Two modes of three a board, so a
  // wizard grid has character rather than every dial turned at once — the shape §7's goal pool had and the
  // reason it existed.
  //
  // The trap is what this tier is for. §11.1 could not build one: the trap has to be the only reason a wrong
  // setting fails, so that setting must otherwise reach the shrine, and route-then-obstruct rejects exactly
  // those. Authoring routes a wrong setting to the shrine on purpose and then puts the socket on it.
  wizard: {
    size: 9,
    turns: 6,
    cutMirrors: 1,
    interactive: 1,
    branchDepth: 1,
    sliders: 1,
    slidingStops: 3,
    doors: 1,
    doorNodes: 1,
    traps: 1,
    fiddleProof: true,
    modePool: ["wallHeavy", "sliderHeavy", "switchHeavy"],
    modeCount: 2,
    techniqueCap: "onlySurvivor",
  },
}
