import { z } from "zod"

// The camp mod owns the `campFind` and `campPart` reward payloads, both by authoring name.
export const campFindRewardSchema = z.object({ type: z.literal("campFind"), step: z.string() })
export const campPartRewardSchema = z.object({
  type: z.literal("campPart"),
  structure: z.string(),
  part: z.string(),
})
