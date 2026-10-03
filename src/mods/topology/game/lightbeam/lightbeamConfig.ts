import type { FamilyGenerationCtx } from "@/game/families/familyMeta"
import type { Difficulty } from "@/data/difficultyLevels"
import type { LightbeamDials, LightbeamOptions } from "./generateLightbeam"

// Tier settings, per docs/game-design/puzzles/lightbeam.md. Each tier adds one thing to the vocabulary;
// difficulty comes from what stands in a wrong ray (`branchDepth`), and grid size is capacity, not
// difficulty. A tier holds a pool of `flavours` and draws one a board, so the ladder is a ceiling rather
// than a debut. What the ramp and this table have to respect is asserted in `lightbeamConfig.spec.ts`.
export const LIGHTBEAM_CONFIG: Record<Difficulty, { size: number } & LightbeamOptions> = {
  // The smallest board that is still a puzzle: a piece stands off the winning beam's line, so it cannot be
  // solved by following the light and turning whatever it hits. Three bends is the floor.
  starter: {
    size: 7,
    turns: 3,
    interactive: 1,
    branchDepth: 1,
    fiddleProof: true,
    techniqueCap: "neverReached",
    // Six flavours, one a board: every piece in the family may turn up, on a board built around it.
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
  // One addition: a piece that slides. "Which cell" is a different question from "which way round".
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
  // One addition: the diagonal cut — a swap, not an extra piece. Its ray leaves the rows and columns the
  // player can read, which is the first thing shrine-side elimination cannot follow. A wider grid, not
  // another bend: six bends on an 8x8 gives fewer pieces than five, as the route eats the branches' room.
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
    // Every flavour carries the cut and the crossing; what varies is what stands in the way.
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
  // One addition: the trap — the socket the light must be kept *away* from. Two modes of three a board, so a
  // grid has character rather than every dial turned at once.
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
  // Everything, and three additions of its own: a mirror's fork is three stops rather than two, branches turn
  // twice, and the door needs two sockets — an and-wiring, which moves the work to the exhaustive rungs.
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

/** What a lab variant forces on top of the tier's dials, so a developer can look at one shape at a time. */
const VARIANT_DIALS: Record<string, Partial<LightbeamDials>> = {
  "wall-heavy": { modes: ["wallHeavy"] },
  "slider-heavy": { modes: ["sliderHeavy"] },
  "switch-heavy": { modes: ["switchHeavy"] },
  "sliding-wall": { modes: ["wallHeavy"], slidingWalls: 1 },
}

/**
 * The options one encounter builds its board from. A forced variant hashes to its own bucket, which no room
 * is ever authored with, so a lab board is always built live rather than served from a cached answer.
 */
export const resolveLightbeamOptions = ({ difficulty, variant }: FamilyGenerationCtx) => {
  const config = LIGHTBEAM_CONFIG[difficulty ?? "starter"]
  const forced = variant ? VARIANT_DIALS[variant] : undefined
  // A forced shape replaces both pools rather than adding to them, or the board draws its own modes anyway.
  return forced ? { ...config, modePool: undefined, flavours: undefined, ...forced } : config
}
