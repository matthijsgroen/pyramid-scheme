import { z } from "zod"

// The hieroglyph mod owns the `hieroglyphFragment` reward payload. Its display, compass scanner,
// and claim effect all `.parse()` this for typed access; app/index.ts registers it in the
// reward-schema registry. Core names the type nowhere.
export const hieroglyphFragmentSchema = z.object({
  type: z.literal("hieroglyphFragment"),
  hieroglyphId: z.string(),
  pieceIndex: z.number(),
})
