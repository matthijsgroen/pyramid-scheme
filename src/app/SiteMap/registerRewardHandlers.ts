import { z } from "zod"
import { registerRewardHandler } from "./rewardHandlerRegistry"
import { registerRewardSchema } from "./rewardSchemas"

// Core owns only the tomb-treasure reward handlers (mapPiece / tombKey) — those write core state
// and aren't a toggleable mod's mechanic. Every other reward type's effect + display is owned by
// its mod: the claim EFFECT is a reward contribution (rewardContributions.ts), the SYNCHRONOUS
// text/emoji is a rewardHandler the mod registers from its own app entrypoint, and the rich popup
// content is a display registration (rewardDisplayRegistry.tsx). So core here names no mod reward
// type. "fragmentSlot" has no handler — it never survives serialization into the app.

registerRewardHandler({
  type: "mapPiece",
  apply: (reward, { progression, journeyId }) => {
    progression.collectMapPiece(reward.tombId)
    progression.markMapPieceFound(journeyId)
  },
  emoji: "📜",
  text: t => ({ itemName: t("chest.mapPiece"), itemDescription: t("chest.mapPieceDescription"), icon: "📜" }),
})

registerRewardHandler({
  type: "tombKey",
  apply: (reward, { progression }) => {
    progression.addTombKey(reward.keyId)
    progression.applyTreasurePerk(reward.keyId)
  },
  emoji: "🗝",
  text: t => ({ itemName: t("chest.tombKey"), icon: "🗝" }),
})

// Core owns the schemas for its own reward shapes (siteTypes.ts). `fragmentSlot` is the world-gen
// placement sentinel — it never survives serialization into the app, so it won't appear in the
// generated data, but it's registered for completeness. `mapPiece`/`tombKey` are tomb-treasure,
// core until that mod is extracted. Mods register their own reward schemas from their app
// entrypoints (rewardSchemas.ts).
registerRewardSchema("fragmentSlot", z.object({ type: z.literal("fragmentSlot"), prefers: z.string().optional() }))
registerRewardSchema("mapPiece", z.object({ type: z.literal("mapPiece"), tombId: z.string() }))
registerRewardSchema("tombKey", z.object({ type: z.literal("tombKey"), keyId: z.string() }))
