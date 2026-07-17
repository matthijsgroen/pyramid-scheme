import { z } from "zod"
import { registerRewardSchema } from "./rewardSchemas"

// Core owns NO reward vocabulary anymore — every reward type's effect, display, schema and state
// belongs to the mod that defines it (registered from that mod's own app entrypoint): the claim
// EFFECT is a reward contribution (rewardContributions.ts), the SYNCHRONOUS text/emoji is a
// rewardHandler, and the rich popup content is a display registration (rewardDisplayRegistry.tsx).
// mapPiece/tombKey moved to the tomb-treasure mod (src/mods/tombTreasure/app); mosaicPiece,
// hieroglyphFragment, money, sellable, consumable each live in their own mod.
//
// The one exception below is `fragmentSlot`: it's the world-gen placement SENTINEL, not a mod
// reward — it never survives serialization into the app (placeFragments clears any leftover), so
// it won't appear in the generated data, but its schema is registered for completeness/validation.
registerRewardSchema("fragmentSlot", z.object({ type: z.literal("fragmentSlot"), prefers: z.string().optional() }))
