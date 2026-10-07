import { journey, sidePath } from "../dsl"
import type { Rule } from "../dsl"
import type { Difficulty } from "../types"
import { DEV_JOURNEY_ID } from "../data"
import { freeRegions } from "@/game/lockAuthoring"
import { catalogueLock } from "./locks/catalogue"
import { doubleBackLock } from "./locks/doubleBack"
import { processionalLock } from "./locks/processional"
import { sluiceLock } from "./locks/sluice"

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
  // 2 — doubleBack. The designer's lock, placed whole: Y is a fork-switch operating its own fork on the
  // lock's seams, S1 and S2 are toggles, and two drops fall out of the off-route chain. The lock's regions
  // are all `free`: its puzzles/nothing/reward appetites carve 0 of 60 seeds on this layout, and what this
  // bench holds is the topology, not what sits in each region.
  //
  // The binding stands at the pyramid, the level that names this floor's mechanics together: a fork-switch
  // is a lightbeam switch, a toggle is a handle, a one-way is a zipline.
  journey(DEV_JOURNEY_ID)
    .pyramid(2, {
      difficulty: "expert",
      pathPuzzles: 0,
      realisations: { "fork-switch": "lightbeamSwitch", toggle: "handle", "one-way": "zipline" },
    })
    .floor(0, {
      locks: [{ lock: doubleBackLock() }],
      // Recorded from the bake's own carve search (searchCarvePair): at the default packing the floor's own
      // address seed carves on attempt 0, walks sound (71 states) and leaves no dead region, so no packing is
      // authored and the seed is stamped only so the carve does not move with the seed formula. A dev floor has
      // no baked output to carry the pin.
      seed: 111235356889667,
    }),
  // 3 — the one-way drop. The ledge's own way on is a fall into the sink, and the sink has no way
  // back up it: the passage is drawn from both sides today, which is why this stands here and on no
  // authored pyramid until it is drawn as a drop.
  journey(DEV_JOURNEY_ID).pyramid(3, {
    difficulty: "expert",
    pathPuzzles: 0,
    // Recorded from the bake's own carve search (searchCarvePair), not tuned by hand: the first pair
    // that carves on attempt 0, walks sound and leaves no dead region — the smallest packing any seed
    // carves at (0.38), at the seed 30 steps past this floor's address seed. The drop's launch, three
    // obstacle cells and landing need room the default packing does not give. Pinned here because a
    // dev floor has no baked output to carry it.
    packing: 0.38,
    seed: 4293857890,
    sideSections: [sidePath({ puzzles: 0, label: "ledge" }), sidePath({ puzzles: 0, label: "sink" })],
    forks: FORKS,
    switches: SWITCHES,
    oneWays: [{ from: "ledge", to: "sink" }],
    oneWayRealisation: "zipline",
  }),
  // 4 — the sluice. One lever floods the hall (and the annex behind it) while the vault is dry, and the vault
  // while the hall is dry: the cover fades in from the ways in, the blockage stands, what lies beyond is
  // concealed, and throwing the lever drains it. The lock's regions are all `free`; what this bench holds is
  // the cover, not what sits in each region.
  //
  // Bound at the pyramid like pyramid 2's: a toggle is a handle, a barred region is water.
  journey(DEV_JOURNEY_ID)
    .pyramid(4, {
      difficulty: "expert",
      pathPuzzles: 0,
      realisations: { toggle: "handle", "region-barrier": "water" },
    })
    .floor(0, {
      locks: [{ lock: sluiceLock() }],
      // Recorded from the bake's own carve search (searchCarvePair): at the default packing the floor's own
      // address seed carves on attempt 0, walks sound (16 states) and leaves no dead region, so no packing is
      // authored. A dev floor has no baked output to carry the pin.
      seed: 111235356889669,
    }),
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
  // 10 — the procession. Three tiles walked cellar, east, west, with the door onward showing the order and the
  // reset. The cellar is entered by a drop from the hall and also lies behind the east tile, so the walk has to be
  // thought through: crossing east first spoils the run, and only the drop steps on the cellar before it.
  //
  // Bound at the pyramid: a sequence is pressure plates, a one-way is a zipline.
  journey(DEV_JOURNEY_ID)
    .pyramid(10, {
      difficulty: "expert",
      pathPuzzles: 0,
      realisations: { sequence: "pressure-plate", "one-way": "zipline" },
    })
    .floor(0, {
      locks: [{ lock: processionalLock() }],
      // Recorded from the bake's own carve search (searchCarvePair): at the default packing the first seed that carves
      // on attempt 0, walks sound and leaves no dead region is 23 past the floor's address seed. A dev floor has
      // no baked output to carry the pin.
      seed: 4293857890,
    }),
  // 11 — twoStones, read from its .lock file. One stone holds the vault open while the other is fetched, then
  // both press the exit's two plates. Every region takes `free`, as on the other lock benches.
  //
  // Bound at the pyramid: the stones are stone plates.
  journey(DEV_JOURNEY_ID)
    .pyramid(11, {
      difficulty: "expert",
      pathPuzzles: 0,
      realisations: { weights: "stonePlate" },
    })
    .floor(0, {
      locks: [{ lock: freeRegions(catalogueLock("twoStones")) }],
      // Recorded from the bake's own carve search (searchCarvePair): at the default packing the floor's own
      // address seed carves on attempt 0, walks sound and leaves no dead region. A dev floor has no baked output
      // to carry the pin.
      seed: 111235356889676,
    }),
]
