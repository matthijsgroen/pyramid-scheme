import { z } from "zod"

// The camp mod owns the `campFind` and `campPart` reward payloads, both by authoring name.
export const campFindRewardSchema = z.object({ type: z.literal("campFind"), step: z.string() })
export const campPartRewardSchema = z.object({
  type: z.literal("campPart"),
  structure: z.string(),
  part: z.string(),
})

// What the haul carries to say a purchase has come to stand in the camp: the purchase fact, as a plain string.
export const campArrivalRewardSchema = z.object({ type: z.literal("campArrival"), purchase: z.string() })
