import type { FamilyGenerationCtx } from "@/game/families/familyMeta"
import type { Difficulty } from "@/data/difficultyLevels"
import type { LightbeamDials, LightbeamOptions } from "./generateLightbeam"

// Tier settings. Each tier adds one thing to the vocabulary (design doc §6.4); difficulty comes from
// what stands in a wrong ray (`branchDepth`), and grid size is capacity, not difficulty (§6.2). A tier
// holds a pool of `flavours` and draws one a board, so the ladder is a ceiling rather than a debut.
//
// Measured over 40 seeds a tier. Configurations are PER BOARD:
//
// | tier    | pieces | on the route | configurations | rejections a board | mean gen |
// | starter | 4.8    | 3.3          | 35             | 2.3                |  20ms    |
// | junior  | 7.8    | 5.3          | 425            | 6.8                |  33ms    |
// | expert  | 8.3    | 5.4          | 816            | 3.8                |  12ms    |
// | master  | 10.5   | 6.8          | 2 731          | 2.4                |  77ms    |
// | wizard  | 12.9   | 6.8          | 65 494         | 5.5                | 1 222ms  |
//
// Three constraints the measurements impose on this table:
//
//  1. `branchDepth` >= 1 needs a cap above `deadEnd` — a branch mirror is a shadow, and a shadow
//     defeats `deadEnd`. Starter and junior cannot carry one; generation refuses rather than quietly
//     building an easier board.
//  2. Wall-heavy buys legibility and spends uncertainty: `onlySurvivor` holds 77 boards in 200 with it
//     on. It belongs at junior, where pointing at where the light died is the lesson, not at the top.
//  3. Wall-heavy and traps fight — with both on, decorative-trap rejections run 58 in 60 boards. Wizard
//     draws two modes of three and skips the trap on boards that drew wall-heavy, recorded per board.
//
// Generation time is not a design constraint: the search runs on a build machine
// (docs/instructions/puzzle-screens.md §6.1), so a room builds from a seed already proven to work.
export const LIGHTBEAM_CONFIG: Record<Difficulty, { size: number } & LightbeamOptions> = {
  // The smallest board that is still a puzzle: a piece stands off the winning beam's line, so it cannot
  // be solved by following the light and turning whatever it hits — not one board in 40 settles on
  // `deadEnd` alone. Starter's skill is the family's own, "this piece does not matter" (§4.2). Gentle
  // rather than empty (§6). Three bends is a floor: two binary pieces make four configurations, and
  // `openingIsHonest` refuses every one.
  starter: {
    size: 7,
    turns: 3,
    interactive: 1,
    branchDepth: 1,
    fiddleProof: true,
    techniqueCap: "neverReached",
    // Six flavours, one a board (§7.4): every piece §2 lists may turn up, one at a time, on a board built
    // around it. 16 to 87 configurations across the pool.
    flavours: [
      // Where the light died: stone closes the branches, and the mirrors all turn.
      { modes: ["wallHeavy"] },
      // Is it in the way: stone standing on the beam's own line, one cell from where it belongs.
      { modes: ["wallHeavy"], slidingWalls: 1 },
      // In the way or out: one mirror slides, and its track is two cells.
      { modes: ["sliderHeavy"], sliders: 1, slidingStops: 2 },
      // Not every mirror is yours: a share of the bends are givens to read around.
      { modes: ["wallHeavy"], interactive: 0.7 },
      // What opens that door: one door, one socket, and the order rung that comes with them.
      { modes: ["switchHeavy"], doors: 1, doorNodes: 1 },
      // A third angle: a mirror with three stops rather than two, and stone enough to read the wrong ones by.
      { modes: ["wallHeavy"], forkSize: 3 },
    ],
  },
  // One addition: a piece that slides. "Which cell" is a different question from "which way round", and a
  // slider is the cheapest fork here — its wrong setting reads as if the piece were not there. Five bends,
  // not four: each bend brings its own branch and decoy, roughly tripling the configuration space.
  junior: {
    size: 8,
    turns: 5,
    interactive: 1,
    branchDepth: 1,
    sliders: 1,
    slidingStops: 3,
    fiddleProof: true,
    techniqueCap: "neverReached",
    // Starter's six questions over five bends, sliders on three-cell tracks: which stop, not in-or-out.
    // 92 to 768 configurations, averaging 425.
    flavours: [
      // Which cell: the slider that gives this tier its name.
      { modes: ["sliderHeavy"], sliders: 1, slidingStops: 3 },
      // Stone to slide, and stone to die in.
      { modes: ["wallHeavy"], slidingWalls: 1 },
      // Two sliders, so "which cell" is asked twice on one beam.
      { modes: ["sliderHeavy"], sliders: 2, slidingStops: 3 },
      // A door, its socket, and a longer route to hide the order in.
      { modes: ["switchHeavy"], doors: 1, doorNodes: 1 },
      // Givens among the bends, and stone around them.
      { modes: ["wallHeavy"], interactive: 0.8 },
      // A bend more than the tier's own five, so a wrong turn runs further before it dies.
      { modes: ["wallHeavy"], turns: 6 },
    ],
  },
  // One addition: the diagonal cut — a swap, not an extra piece. Its answer is a half-step and its stops
  // reach 67.5° the other way, so the ray leaves the rows and columns the player can read, which is the
  // first thing shrine-side elimination cannot follow; the cap reaches `onlySurvivor` here.
  //
  // A wider grid for capacity, not difficulty (§6.2) — NOT another bend: six bends on an 8×8 gives fewer
  // pieces than five, because the route eats the room the branches need. The route also folds through its
  // own line from here up (§5.2); a crossed square is provably empty and buys route length for no piece.
  expert: {
    size: 9,
    turns: 5,
    cutMirrors: 1,
    crossings: 1,
    interactive: 1,
    branchDepth: 1,
    sliders: 1,
    slidingStops: 3,
    fiddleProof: true,
    techniqueCap: "onlySurvivor",
    // Every flavour carries the cut and the crossing; what varies is what stands in the way. 400 to 2 106
    // configurations, averaging 816.
    flavours: [
      { modes: ["sliderHeavy"], sliders: 1, slidingStops: 3 },
      // Mirrors with a third angle, and stone enough to read the wrong ones by.
      { modes: ["wallHeavy"], forkSize: 3 },
      { modes: ["wallHeavy"], slidingWalls: 1 },
      { modes: ["switchHeavy"], doors: 1, doorNodes: 1 },
      // The pool's top end: two sliders and three-angle mirrors on the same grid.
      { modes: ["sliderHeavy"], sliders: 2, forkSize: 3 },
    ],
  },
  // One addition: **the trap** (§11.1). Two modes of three a board, so a grid has character rather than every
  // dial turned at once. The door and its socket are met below, as one flavour of a lower tier's pool; what
  // arrives here is the socket the light must be kept *away* from, and it is the whole reason this tier's cap
  // reaches `wiringDead`.
  //
  // The trap is what this tier is for, and it is what the authoring construction is for. The trap has to be the
  // only reason a wrong setting fails, so that setting must otherwise reach the shrine — and a generator that
  // derives wrong rays and walls them rejects exactly those. Authoring routes a wrong setting to the shrine on
  // purpose and then puts the socket on it.
  master: {
    size: 9,
    decoys: true,
    turns: 6,
    cutMirrors: 1,
    crossings: 1,
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
  // Everything, and one addition of its own: **a mirror's fork is three stops rather than two** (rule 1,
  // measured in). Every tier below authors the pair the geometry demands; here the extra stop is drawn
  // per piece, so the same mirrors offer many more distinct forks on the same piece count. Rule 8's "one piece
  // doing more", the same trade the diagonal cut makes at expert.
  //
  // Branches turn **twice** here, which nothing but a generation-time budget was stopping.
  //
  // And the door needs **two** sockets rather than one — an and-wiring, where the piece does not budge until
  // the light has been through both. §11.2 predicted that would be the genuinely different shape and
  // measured it: `wiringFires` settles it on 7 boards in 200 where one socket settles 56, so the work moves to
  // the exhaustive rungs.
  wizard: {
    size: 9,
    decoys: true,
    turns: 6,
    cutMirrors: 1,
    crossings: 1,
    interactive: 1,
    branchDepth: 2,
    forkSize: 3,
    sliders: 1,
    slidingStops: 3,
    doors: 1,
    doorNodes: 2,
    traps: 1,
    fiddleProof: true,
    modePool: ["wallHeavy", "sliderHeavy", "switchHeavy"],
    modeCount: 2,
    techniqueCap: "onlySurvivor",
  },
}

/**
 * What a lab variant forces on top of the tier's own dials, for playtesting one shape at a time
 * (docs/instructions/puzzle-screens.md §6). A tier draws its own flavour a board; this is how a developer
 * looks at just one of them across a run of seeds.
 */
const VARIANT_DIALS: Record<string, Partial<LightbeamDials>> = {
  "wall-heavy": { modes: ["wallHeavy"] },
  "slider-heavy": { modes: ["sliderHeavy"] },
  "switch-heavy": { modes: ["switchHeavy"] },
  "sliding-wall": { modes: ["wallHeavy"], slidingWalls: 1 },
}

/**
 * The options one encounter builds its board from (`docs/instructions/puzzle-screens.md` §6.1).
 *
 * A forced variant changes the options, so it hashes to its own bucket — and since no room is ever
 * authored with a variant, that bucket is never listed and a lab board is always built live. Which is
 * what a developer comparing two generators wants: no cached answer standing in the way.
 */
export const resolveLightbeamOptions = ({ difficulty, variant }: FamilyGenerationCtx) => {
  const config = LIGHTBEAM_CONFIG[difficulty ?? "starter"]
  const forced = variant ? VARIANT_DIALS[variant] : undefined
  // A forced shape replaces both pools rather than adding to them, or the board would still draw its own two
  // modes — and a flavour naming its own would overwrite the very thing the lab is asking to see.
  return forced ? { ...config, modePool: undefined, flavours: undefined, ...forced } : config
}
