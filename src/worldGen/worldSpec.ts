import { rules } from "./dsl"
import { globalRules } from "./spec/global"
import { starterRules } from "./spec/starter"
import { juniorRules } from "./spec/junior"
import { expertRules } from "./spec/expert"
import { masterRules } from "./spec/master"
import { wizardRules } from "./spec/wizard"

// Expected reward counts — validated by configBuilder after generation.
// mosaicPieceRewards: 298 — must equal LEVEL_STEPS.length (mosaicRevealOrder.ts), the number
//                    of reveal steps the player actually sees. Mosaic reveal is count-based
//                    (MosaicPage clamps to Math.min(collected, LEVEL_STEPS.length)), so any
//                    extra reward beyond 298 reveals nothing. Distributed as side paths across
//                    pyramids, minus the 1 tomb-authored piece (junior_treasure_tomb floor 3).
// mapPieceRewards:    20 primary (1 per pyramid journey) + 16 secondary
//                    (4 journeys × 4 secondary tombs, each on last or last-1 pyramid)
export const WORLD_TARGETS = {
  mosaicPieceRewards: 298,
  mapPieceRewards: 36,
}

/**
 * Declarative world-builder constraints.
 * Rules cascade: global → tier → journey → pyramid → floor.
 * Within the same specificity level, later rules win.
 * Missing fields = builder decides.
 */
export const worldSpec = rules([
  ...globalRules,
  ...starterRules,
  ...juniorRules,
  ...expertRules,
  ...masterRules,
  ...wizardRules,
])
