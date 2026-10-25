import { z } from "zod"

// The shop mod owns its reward payloads. Defined here in the game layer (not app/index.ts) so
// the economy guard — a world-gen-time, game-layer check — can `.parse()` for typed access
// without dragging in app-side registration side effects. shop/app/index.ts imports these to
// register them in the reward-schema registry; core names none of these types.
export const moneyRewardSchema = z.object({ type: z.literal("money"), amount: z.number() })
export const sellableRewardSchema = z.object({ type: z.literal("sellable"), itemId: z.string() })
// A purchase in Fez's stock: an animal or cart for the caravan, a key to the gate it opens (purchases.ts).
export const purchaseRewardSchema = z.object({ type: z.literal("purchase"), id: z.string() })
