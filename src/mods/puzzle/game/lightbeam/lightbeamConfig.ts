import type { FamilyGenerationCtx } from "@/game/families/familyMeta"
import type { Difficulty } from "@/data/difficultyLevels"
import type { LightbeamDials, LightbeamOptions } from "./generateLightbeam"

// Tier settings (design doc §6.4, measured in §11.19).
//
// **Each tier adds ONE thing to the vocabulary** (§6.4), rather than turning every dial a little further. A
// tier's character comes from its `modePool` (§11.18) and its difficulty from what stands in a wrong ray,
// which is `branchDepth`: a branch that turns needs a mirror, that mirror is off the winning beam's line by
// construction, and a piece standing in a wrong ray is what §6.1 measured as the only thing that makes the
// technique cap bite.
//
// **What a tier adds is a ceiling, not a debut** (§6.4, §7.4). The three lower tiers hold a pool of `flavours`
// and draw one a board, so the piece list varies board to board: the ladder says how far a piece may be pushed
// here — a two-cell track at starter, three cells at junior, a third mirror angle from expert — and the flavour
// says which one this board is about. That correction came from playtesting, and the measurement behind it is
// blunt: on 12 junior seeds the old single set of dials built 12 boards carrying six or seven turn mirrors and
// exactly one three-stop slider. One puzzle, twelve times.
//
// Every tier gets a full configuration — this family is not gated to a debut tier, because a starter corridor
// can sit behind a ward gate deep inside a wizard pyramid. So starter must be *gentle*, not empty.
//
// Measured over 40 seeds a tier (§11.19):
//
// | tier    | pieces | on the route | configurations | rejections a board | mean gen |
// | starter | 4.8    | 3.3          | 35             | 2.3                |  20ms    |
// | junior  | 7.8    | 5.3          | 425            | 6.8                |  33ms    |
// | expert  | 8.3    | 5.4          | 816            | 3.8                |  12ms    |
// | master  | 10.5   | 6.8          | 2 731          | 2.4                |  77ms    |
// | wizard  | 12.9   | 6.8          | 65 494         | 5.5                | 1 222ms  |
//
// Configurations are **per board**. Stating that because the column this replaced was a total across all 40
// boards while reading as per-board, and it cost a tuning pass aimed at putting 37 350 configurations on one
// wizard grid before anyone noticed.
//
// | starter | right angles, branches that run straight out, two-cell tracks |
// | junior  | a longer route, three-cell tracks, stone to die in            |
// | expert  | the diagonal cut, the crossing, a third mirror angle          |
// | master  | a trap, and two modes a board                                 |
// | wizard  | three angles everywhere, branches that turn twice, an and-door |
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
// **Generation time is not a design constraint here.** It used to be, and twice it decided a design question:
// §11.13 dropped a decoy from wizard to get a board under 1400ms, and branch depth was held at one because two
// measured at 8.5 seconds. Neither was recorded as a design decision, which is the whole problem — the cost of
// an opportunity not taken leaves no measurement behind.
//
// The search now happens on a build machine (`docs/instructions/puzzle-screens.md` §6.1): a room builds from a
// seed already proven to work, so a dial is only ever turned down for a reason a player would recognise. Note
// what that does and does not buy here — the gates run inside `attemptAuthored`, so one attempt still pays
// them, and a wizard board costs about half of what searching for one did rather than a fortieth. The families
// that reject almost every draw are the ones the lists rescued.
export const LIGHTBEAM_CONFIG: Record<Difficulty, { size: number } & LightbeamOptions> = {
  // The smallest board that is still a puzzle.
  //
  // A short route and a small grid, but **a piece off the winning beam's line** — so the board cannot be solved
  // by following the light and turning whatever it hits. Measured: not one board in 40 settles on `deadEnd`
  // alone, where the trail-following version settled on all 40.
  //
  // That means starter's first skill is the family's own: *"this piece does not matter"* (§4.2), which is the
  // only conclusion in any family that reads that way. It arrives here rather than being saved, because without
  // it there is no decision on the board at all.
  //
  // §6 asks starter to be **gentle rather than empty**, and gentleness is now the three-bend route and the 7×7
  // grid rather than the absence of anything to work out. Wall-heavy for the same reason: a branch that dies in
  // stone is one the player can point at.
  //
  // Three bends is a floor rather than a preference: two binary pieces make four configurations and every dark
  // one is a tap from done or solved by tapping both, so `openingIsHonest` refuses the lot.
  starter: {
    size: 7,
    turns: 3,
    interactive: 1,
    branchDepth: 1,
    fiddleProof: true,
    techniqueCap: "neverReached",
    // Six flavours, one a board (§7.4). Every piece §2 lists may turn up here — one at a time, on a board built
    // around it, which is how a mechanic gets learned rather than averaged in. The tier is still gentle: the
    // configuration space runs 16 to 87 across the pool, against the 34 the single recipe gave.
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
  // One addition: **a piece that slides**, and the route length to hide it on. "Is it in the way, and which cell"
  // is a different question from "which way round", and a slider is the cheapest fork in the family — its wrong
  // setting is *"as if the piece were not there"*, so the branch is the beam's own line carrying on.
  //
  // Five bends rather than four because four played as barely more than starter: the extra bend is what makes the
  // two tiers feel different, and it roughly triples the configuration space (82 to 274) because each bend brings
  // its own branch and its own decoy.
  junior: {
    size: 8,
    turns: 5,
    interactive: 1,
    branchDepth: 1,
    sliders: 1,
    slidingStops: 3,
    fiddleProof: true,
    techniqueCap: "neverReached",
    // The same six questions as starter, asked over five bends and with the sliding pieces on three-cell tracks:
    // *which* stop rather than in-or-out. Measured 92 to 768 configurations across the pool, averaging 425.
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
  // One addition: **the diagonal cut** (§11.8). The bend would have carried a mirror anyway; what changes is
  // that its answer is a half-step and its stop set reaches 67.5° the other way, so the ray leaves the rows and
  // columns the player can read. A swap rather than an extra piece, which is rule 8's cost model.
  //
  // This is also where the cap reaches the exhaustive pair, because a diagonal ray is the first thing the
  // shrine-side elimination cannot follow (§11.12 measured what that costs: `exitRun` falls and `onlySurvivor`
  // does the work instead).
  //
  // A grid wider than junior's, for capacity rather than difficulty (§6.2): the diagonal needs somewhere to run,
  // and a branch that turns needs somewhere to put its mirror. Note it is **not** another bend — measured, six
  // bends on an 8×8 gives *fewer* pieces than five, because the route eats the room the branches needed.
  //
  // The route also folds through its own line from here up (§5.2). A crossed square is the one square on the
  // board that is provably empty — anything standing there would have turned the first pass — and it costs no
  // piece at all: it buys route length on the same grid. A character dial rather than a difficulty one, which is
  // why it arrives beside the cut rather than instead of it.
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
    // The cut and the crossing are the tier's, so every flavour carries them; what varies is what stands in the
    // way. The three-stop mirror appears here as a flavour rather than as wizard's blanket rule — sparingly, on
    // the boards built for it. Measured 400 to 2 106 configurations, averaging 816.
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
  // Everything, and one addition of its own: **a mirror's fork is three stops rather than two** (§11.8 rule 1,
  // measured in §11.13). Every tier below authors the pair the geometry demands; here the extra stop is drawn
  // per piece, so the same mirrors offer many more distinct forks on the same piece count. Rule 8's "one piece
  // doing more", the same trade the diagonal cut makes at expert.
  //
  // Branches turn **twice** here, which nothing but a generation-time budget was stopping.
  //
  // And the door needs **two** sockets rather than one — an and-wiring, where the piece does not budge until
  // the light has been through both. §11.2 predicted that would be the genuinely different shape and §11.18
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
