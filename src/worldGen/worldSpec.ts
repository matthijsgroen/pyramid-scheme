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
// mapPieceRewards: the sum of every tomb's own piecesRequired (the keys-and-locks solver's
// map-piece currency places exactly this many, no surplus) — 31 across the 9 tombs. The
// older "20 primary + 16 secondary" surplus-loot split this comment used to describe was
// redesigned away; this is the current, correct total.
export const WORLD_TARGETS = {
  mosaicPieceRewards: 298,
  mapPieceRewards: 31,
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
