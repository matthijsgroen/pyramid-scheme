import { global } from "../dsl"
import type { Rule } from "../dsl"

export const globalRules: Rule[] = [
  global({ floorDepth: 1, consumableRates: { bandage: 3, oil: 1, trapTool: 1 } }),
]
