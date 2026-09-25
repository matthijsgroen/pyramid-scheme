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
 */

// What the carve must hold open on every floor. Two ways out is the junction a carve nearly always
// offers; three is rare and four is never carved at all (game/forkShape.spec.ts), so asking for more
// would be asking for floors that fail to build.
const FORKS = [{ exits: 2, count: 1 }]

// witnessDoor is the registered family that keeps its room open to a player who walks back, which is
// exactly what a switch needs — a room that closes behind you leaves the player at a door they can
// never open. This becomes `lightbeamSwitch` once that family is registered.
const SWITCHES = { encounter: "witnessDoor", min: 1, max: 1 }

// Two ungated branches, so the junction has ways out worth closing and the switch decides something.
// Their treasure ends stay empty: this journey contributes no loot.
const branches = () => [sidePath({ puzzles: 1 }), sidePath({ puzzles: 1 })]

// A switch stands on every floor, so the one mechanic that is actually built is felt at each of the
// difficulties below rather than at a single one.
const devSite = (pyramid: number, difficulty: Difficulty): Rule =>
  journey(DEV_JOURNEY_ID).pyramid(pyramid, {
    difficulty,
    pathPuzzles: 2,
    sideSections: branches(),
    forks: FORKS,
    switches: SWITCHES,
  })

export const devRules: Rule[] = [
  // 1 — the switch. The only built feature: a board in the fork decides which way out opens.
  devSite(1, "junior"),
  // 2 — sequenceLock. Waiting for the family that only opens once its rooms are met in order.
  devSite(2, "junior"),
  // 3 — sandSlide. Waiting for the one-way drop that makes a walked corridor unwalkable back.
  devSite(3, "expert"),
  // 4 — waterline. Waiting for the level that closes the floor's lower rooms until it is dropped.
  devSite(4, "expert"),
  // 5 — cosmicDust. Waiting for the drift that re-lays which rooms a corridor connects.
  devSite(5, "master"),
  // 6 — hourglass. Waiting for the run the floor has to be crossed inside before it re-seals.
  devSite(6, "wizard"),
]
