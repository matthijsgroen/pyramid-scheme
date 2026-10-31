import { rules } from "./dsl"
import { globalRules } from "./spec/global"
import { starterRules } from "./spec/starter"
import { juniorRules } from "./spec/junior"
import { expertRules } from "./spec/expert"
import { masterRules } from "./spec/master"
import { wizardRules } from "./spec/wizard"

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
