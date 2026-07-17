import { z } from "zod"

// The tomb-treasure mod owns the `mapPiece` and `tombKey` reward payloads. Their claim effects,
// display, and (for map pieces) the found-in-pyramid marker all `.parse()` these for typed
// access; app/index.ts registers them in the reward-schema registry. Core names neither type.
export const mapPieceSchema = z.object({ type: z.literal("mapPiece"), tombId: z.string() })
export const tombKeySchema = z.object({ type: z.literal("tombKey"), keyId: z.string() })
