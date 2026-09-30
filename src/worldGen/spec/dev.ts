import { journey, sidePath } from "../dsl"
import type { Rule } from "../dsl"
import type { Difficulty } from "../types"
import { DEV_JOURNEY_ID } from "../data"

/**
 * The dev journey's world spec — one site per floor-topology feature, so each mechanic can be
 * entered straight off the travel map under develop mode.
 *
 * Resolved against its OWN rule list (worldSpec.ts's devSpec), never the real world's: a tier rule
 * written for wizard pyramids has no business dressing a playtest floor, and a rule written here
 * must not be able to reach a real one.
 *
 * NOTHING HERE AUTHORS A REWARD. No chest, no end reward, no shop, no ward chest, no side-section
 * reward — the journey's capability preset (capabilities.ts's DEV_CAPABILITIES) keeps its path ends
 * out of the loot solver entirely, and the generated world's per-currency and per-tier counts are
 * identical with it and without it. Authoring loot here would move real counts; don't.
 *
 * PUZZLES DEFAULT TO ZERO — a default, not a rule like the reward line above. Every path here
 * carries zero of them, main path and branches alike, so the mechanic is the first room past the
 * entrance rather than something a playtester solves their way to: a puzzle in front of it is a toll
 * paid on every run that teaches nothing about the feature being walked. These floors are a bench for
 * TOPOLOGY, and puzzles have their own test tools.
 *
 * So raise a `puzzles` or `pathPuzzles` here when the thing under test is a puzzle standing inside a
 * topology feature, and put it back when you are done. Nothing enforces the zero and nothing breaks
 * when you raise it — unlike loot, which moves real counts.
 */

// What the carve must hold open on every floor. Two ways out is the junction a carve nearly always
// offers; three is rare and four is never carved at all (game/forkShape.spec.ts), so asking for more
// would be asking for floors that fail to build.
const FORKS = [{ exits: 2, count: 1 }]

// The switch board itself: it draws the fork's own ways out and leaves open the one it routes its beam
// to. Re-enterable, which a switch has to be — a room that closed behind the player would leave them at
// a door nothing can ever open again.
const SWITCHES = { encounter: "lightbeamSwitch", min: 1, max: 1 }

// Two ungated branches, so the junction has ways out worth closing and the switch decides something.
// Bare ones: each is a corridor to an end that stays empty, because what a playtester walks down a
// branch to see is whether the door opened, not what waits at the bottom of it.
const branches = () => [sidePath({ puzzles: 0 }), sidePath({ puzzles: 0 })]

// A switch stands on every floor devSite builds, so the one mechanic that is actually built is felt at
// each of those difficulties rather than at a single one.
const devSite = (pyramid: number, difficulty: Difficulty): Rule =>
  journey(DEV_JOURNEY_ID).pyramid(pyramid, {
    difficulty,
    pathPuzzles: 0,
    sideSections: branches(),
    forks: FORKS,
    switches: SWITCHES,
  })

export const devRules: Rule[] = [
  // 1 — the switch. The only built feature: a board in the fork decides which way out opens.
  journey(DEV_JOURNEY_ID).pyramid(1, {
    difficulty: "junior",
    pathPuzzles: 0,
    sideSections: branches(),
    forks: FORKS,
    switches: SWITCHES,
    // The first authored region layout. It proves a layout survives authoring, serialization, the
    // builder's refusals and the carve — a bench for TOPOLOGY, not for content. Every region is `free`
    // rather than pinned to what this carve happens to put where: the switch's fork and both bare
    // branches sit in `mouth`, and the goal chest lands in `hall`, none of which this bench asserts
    // anything about. An appetite pinned to that would break every time the carve moved, which would
    // make the bench a liability rather than a proof — the appetite checking itself is pinned by unit
    // tests against hand-built floors, where the content is known exactly.
    regionLayout: {
      regions: [
        { name: "mouth", appetite: "free" },
        { name: "hall", appetite: "free" },
        { name: "vault", appetite: "free" },
      ],
      connections: [
        ["mouth", "hall"],
        ["hall", "vault"],
      ],
      in: "mouth",
      out: "vault",
    },
  }),
  // 2 — doubleBack. The design doc's worked example (lockWalk.spec.ts's `doubleBack()`), assembled:
  // Y is a fork board in `entrance` whose two ways out (`forkLeft`, `forkRight`) are both shut at
  // first and genuinely three-state (unset/left/right, `returnsToInitial: false` — turning it does
  // not hand back the branch just left). Right leads to S1 in `s1Chamber`; throwing it shuts the way
  // back (`greenRight`) and opens `leftLower`'s own gate (`greenLeft`) — S1's `start` opens nothing of
  // its own. A drop out of `s1Chamber` lands in `leftLower` BETWEEN `forkLeft` (still shut — Y never
  // said "left") and `greenLeft` (now open), which is the whole trick: reaching `s2Chamber` without
  // ever solving Y left. A second drop off `leftLower` is what saves a player who takes the first one
  // before throwing S1 at all — see the playtest instructions in the Task 8 report for what that
  // strands without it. S2's `start` likewise opens nothing; only `thrown` opens `endDoor`.
  //
  // `packing: 5` is not decorative and is tied to THIS floor's own seed, not to the shape being
  // carved — a floor at this position in the journey resolves to a different production seed than
  // the same shape would at any other position, and the packing value that carves it sound does not
  // transfer. A sweep of small-integer `packing` values at this floor's seed: every value from 1
  // through 30 carves (no structural failure at this seed, unlike pyramid 9's own), but `walkLock`
  // finds most of them unsound (`unsolvable`, occasionally `strands`) — only 5, 9, 12 and 14 come out
  // sound. `5` is picked because the early-drop hazard below still reproduces as a `strands` failure
  // at that value (9 and 14 carve sound but degrade the ablation to a bare `unsolvable`, which would
  // not prove the hazard).
  journey(DEV_JOURNEY_ID).pyramid(2, {
    difficulty: "starter",
    pathPuzzles: 0,
    packing: 5,
    sideSections: [sidePath({ puzzles: 0 })],
    regionLayout: {
      regions: [
        { name: "entrance", appetite: "free" },
        { name: "rightLower", appetite: "free" },
        { name: "s1Chamber", appetite: "free" },
        { name: "leftLower", appetite: "free" },
        { name: "s2Chamber", appetite: "free" },
        { name: "wayOut", appetite: "free" },
      ],
      connections: [
        ["entrance", "leftLower"],
        ["entrance", "rightLower"],
        ["rightLower", "s1Chamber"],
        ["leftLower", "s2Chamber"],
        ["s2Chamber", "wayOut"],
      ],
      in: "entrance",
      out: "wayOut",
    },
    obstacles: [
      { id: "forkLeft", kind: "gate", at: { on: "connection", between: ["entrance", "leftLower"] } },
      { id: "forkRight", kind: "gate", at: { on: "connection", between: ["entrance", "rightLower"] } },
      { id: "greenRight", kind: "gate", at: { on: "connection", between: ["rightLower", "s1Chamber"] } },
      { id: "greenLeft", kind: "gate", at: { on: "connection", between: ["leftLower", "s2Chamber"] } },
      { id: "endDoor", kind: "gate", at: { on: "connection", between: ["s2Chamber", "wayOut"] } },
      { id: "dropToLeft", kind: "oneWay", at: { on: "connection", between: ["s1Chamber", "leftLower"] } },
      { id: "dropToEntrance", kind: "oneWay", at: { on: "connection", between: ["leftLower", "entrance"] } },
    ],
    controls: [
      {
        id: "Y",
        in: "entrance",
        states: ["unset", "left", "right"],
        initial: "unset",
        returnsToInitial: false,
        opens: { unset: [], left: ["forkLeft"], right: ["forkRight"] },
      },
      {
        id: "S1",
        in: "s1Chamber",
        states: ["start", "thrown"],
        initial: "start",
        returnsToInitial: false,
        opens: { start: ["greenRight"], thrown: ["greenLeft"] },
      },
      {
        id: "S2",
        in: "s2Chamber",
        states: ["start", "thrown"],
        initial: "start",
        returnsToInitial: false,
        opens: { start: [], thrown: ["endDoor"] },
      },
    ],
  }),
  // 3 — the one-way drop. The ledge's own way on is a fall into the sink, and the sink has no way
  // back up it: the passage is drawn from both sides today, which is why this stands here and on no
  // authored pyramid until it is drawn as a drop.
  journey(DEV_JOURNEY_ID).pyramid(3, {
    difficulty: "expert",
    pathPuzzles: 0,
    sideSections: [sidePath({ puzzles: 0, label: "ledge" }), sidePath({ puzzles: 0, label: "sink" })],
    forks: FORKS,
    switches: SWITCHES,
    oneWays: [{ from: "ledge", to: "sink" }],
  }),
  // 4 — waterline. Waiting for the level that closes the floor's lower rooms until it is dropped.
  devSite(4, "expert"),
  // 5 — cosmicDust. Waiting for the drift that re-lays which rooms a corridor connects.
  devSite(5, "master"),
  // 6 — hourglass. Waiting for the run the floor has to be crossed inside before it re-seals.
  devSite(6, "wizard"),
  // 7 — the handle. A lever on its own side path, with a door on each side: thrown left the vault
  // stands open and the cellar shut, thrown right they swap. The first mechanism whose doors are not
  // the doors of the room it stands in — so it needs no junction, and authors no fork or switch.
  // Nothing waits behind either door: this journey contributes no loot (see the file header).
  journey(DEV_JOURNEY_ID).pyramid(7, {
    difficulty: "expert",
    pathPuzzles: 0,
    sideSections: [
      sidePath({ puzzles: 0, label: "lever" }),
      sidePath({ puzzles: 0, label: "vault" }),
      sidePath({ puzzles: 0, label: "cellar" }),
    ],
    handles: [{ in: "lever", left: ["vault"], right: ["cellar"] }],
  }),
  // 8 — a gate on a connection. A lever in `mouth` opens the door between `hall` and `vault`; thrown
  // the other way it shuts again with the player on either side of it. The first obstacle that is not
  // a section's own entrance — it stands between two REGIONS, which is what a container's boundary is.
  journey(DEV_JOURNEY_ID).pyramid(8, {
    difficulty: "expert",
    pathPuzzles: 0,
    sideSections: [sidePath({ puzzles: 0 })],
    regionLayout: {
      regions: [
        { name: "mouth", appetite: "free" },
        { name: "hall", appetite: "free" },
        { name: "vault", appetite: "free" },
      ],
      connections: [
        ["mouth", "hall"],
        ["hall", "vault"],
      ],
      in: "mouth",
      out: "vault",
    },
    obstacles: [{ id: "vaultDoor", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } }],
    controls: [
      {
        id: "s1",
        in: "mouth",
        states: ["left", "right"],
        initial: "right",
        returnsToInitial: true,
        opens: { right: ["vaultDoor"] },
      },
    ],
  }),
  // 9 — sequenceLock. Waiting for the family that only opens once its rooms are met in order.
  devSite(9, "junior"),
]
