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
// **Generation time is not a design constraint here.** It used to be, and twice it decided a design question:
// §11.13 dropped a decoy from wizard to get a board under 1400ms, and branch depth was held at one because two
// measured at 8.5 seconds. Neither was recorded as a design decision, which is the whole problem — the cost of
// an opportunity not taken leaves no measurement behind.
//
// The direction out is `docs/offline-puzzle-seeds.md`: verify seeds offline and ship the ones that work, so the
// compute happens on a build machine rather than on a phone. Until that lands the top tier is genuinely slow to
// build, and that is the honest trade — a tier that is expensive to generate rather than a tier that is smaller
// than the design wants. If a dial needs turning down, turn it down for a reason a player would recognise.
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
    modes: ["wallHeavy"],
    techniqueCap: "neverReached",
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
    modes: ["sliderHeavy"],
    techniqueCap: "neverReached",
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
    modes: ["sliderHeavy"],
    techniqueCap: "onlySurvivor",
  },
  // One addition: **a socket, and a trap** (§11.1). Two modes of three a board, so a grid has character rather
  // than every dial turned at once.
  //
  // The trap is what this tier is for, and it is what the authoring construction is for. The trap has to be the
  // only reason a wrong setting fails, so that setting must otherwise reach the shrine — and a generator that
  // derives wrong rays and walls them rejects exactly those. Authoring routes a wrong setting to the shrine on
  // purpose and then puts the socket on it.
  master: {
    size: 9,
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
