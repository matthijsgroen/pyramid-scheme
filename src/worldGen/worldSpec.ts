import { rules } from "./dsl"
import { globalRules } from "./spec/global"
import { starterRules } from "./spec/starter"
import { juniorRules } from "./spec/junior"
import { expertRules } from "./spec/expert"
import { masterRules } from "./spec/master"
import { wizardRules } from "./spec/wizard"

// Expected reward counts — validated by configBuilder after generation.
// mosaicPieceRewards: 298 pyramid-side (number of unique journeyId:levelIndex steps in
//                    mosaicPieces.generated.ts, distributed as extra side paths, density
//                    controlled by mosaicPaths DSL field) + 1 tomb-authored
//                    (junior_treasure_tomb floor 3 side path — see docs/game-design/
//                    worldgen-builder-unification.md Phase 5).
// mapPieceRewards:    20 primary (1 per pyramid journey) + 16 secondary
//                    (4 journeys × 4 secondary tombs, each on last or last-1 pyramid)
export const WORLD_TARGETS = {
  mosaicPieceRewards: 299,
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
