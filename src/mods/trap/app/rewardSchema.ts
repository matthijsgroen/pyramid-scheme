import { z } from "zod"

// The trap mod owns the `waterskin` reward payload: no fields, it is drunk on pickup.
export const waterskinRewardSchema = z.object({ type: z.literal("waterskin") })
