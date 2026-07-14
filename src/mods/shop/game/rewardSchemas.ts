import { z } from "zod"

// The shop mod owns its two reward payloads. Defined here in the game layer (not app/index.ts) so
// the economy guard — a world-gen-time, game-layer check — can `.parse()` for typed access
// without dragging in app-side registration side effects. shop/app/index.ts imports these to
// register them in the reward-schema registry; core names neither type.
export const moneyRewardSchema = z.object({ type: z.literal("money"), amount: z.number() })
export const sellableRewardSchema = z.object({ type: z.literal("sellable"), itemId: z.string() })
