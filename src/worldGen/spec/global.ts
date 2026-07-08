import { global } from "../dsl"
import type { Rule } from "../dsl"

/**
 * World-builder defaults, in one place. Every field here cascades onto every pyramid
 * (global is the lowest-specificity scope, so a tier/journey/pyramid rule overrides it),
 * and the config builder reads these same values for the few spots that have no constraint
 * in hand. Change a default here and both the DSL cascade and the builder follow.
 */
export const GLOBAL_DEFAULTS = {
  /** Floors per pyramid before any ward wings. */
  floorDepth: 1,
  /** Plain main-path floors before the pyramid's side content. */
  mainFloors: 1,
  /** Auto ward-gated bonus floors branching off the last main floor. */
  wardWings: 0,
  /** corridorStraightness applied on a windyChance hit. */
  windyStraightness: 0.35,
  /** packing applied on a packingChance hit. */
  packingWhenHit: 1.6,
  /** Integer weights for consumable-type selection in chest rewards. */
  consumableRates: { bandage: 3, oil: 1, trapTool: 1 },
}

export const globalRules: Rule[] = [global({ ...GLOBAL_DEFAULTS })]
