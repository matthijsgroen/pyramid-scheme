import { z } from "zod"

// The trap mod owns the `consumable` reward payload. The claim effect `.parse()`s it for typed
// access; app/index.ts registers it in the reward-schema registry. The enum mirrors
// ConsumableType (game/consumableTypes.ts) — the one runtime-validated form of that vocabulary.
export const consumableRewardSchema = z.object({
  type: z.literal("consumable"),
  consumable: z.enum(["bandage", "oil", "trapTool"]),
})
