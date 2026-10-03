import { rules } from "./dsl"
import { globalRules } from "./spec/global"
import { starterRules } from "./spec/starter"
import { juniorRules } from "./spec/junior"
import { expertRules } from "./spec/expert"
import { masterRules } from "./spec/master"
import { wizardRules } from "./spec/wizard"
import { devRules } from "./spec/dev"

// Expected reward counts — validated by configBuilder after generation.
// mapPieceRewards: the sum of every tomb's own piecesRequired (the keys-and-locks solver's
// map-piece currency places exactly this many, no surplus) — 31 across the 9 tombs.
//
// Mosaic is NOT here — it's a mod-owned capped currency (src/mods/mosaic/game/mosaicCurrency.ts's
// MOSAIC_TOTAL); core holds no per-mod target (docs/mods/TARGET.md rule 2). It's placed by
// placeFragments' phase-3 pass, which hard-fails if it can't fully place, so no post-hoc count
// check is needed here.
export const WORLD_TARGETS = {
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

/**
 * The dev journey's own constraints, resolved separately from `worldSpec` above.
 *
 * Two lists rather than one, so neither can reach the other: a playtest floor is not dressed by a
 * real tier's rules (a wizard pyramid's two main floors and ward paths have nothing to do with
 * walking a switch), and a rule written for the dev journey cannot move a real pyramid. The global
 * defaults are shared, because those are the builder's own baseline rather than anyone's authoring.
 */
export const devSpec = rules([...globalRules, ...devRules])
