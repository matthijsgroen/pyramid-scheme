import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { registerHeldKeysProvider } from "@/app/SiteMap/keyProviders"
import { isModEnabled } from "@/mods/registeredMods"
import { useTombTreasureProgress } from "./useTombTreasureProgress"
import { registerTombTreasureRewardDisplay } from "./rewardDisplay"
import { mapPieceSchema, tombKeySchema } from "./rewardSchemas"

// tomb-treasure's app entrypoint (side-effect): the reward display handlers, reward schemas, the
// claim effects (map piece → count + mark the pyramid journey's chest opened; tomb key → grant the
// key + the no-op perk hook), and the held-keys provider (ward keys the site-map runtime reads for
// gate satisfaction). All read/write the mod's OWN state (useTombTreasureProgress), so core names
// neither `mapPiece` nor `tombKey`. Self-gated on the mod being enabled.
if (isModEnabled("tomb-treasure")) {
  registerTombTreasureRewardDisplay()
  registerRewardSchema("mapPiece", mapPieceSchema)
  registerRewardSchema("tombKey", tombKeySchema)
  registerRewardContribution(() => {
    const tomb = useTombTreasureProgress()
    return {
      effects: {
        mapPiece: (reward, { journeyId }) => {
          const { tombId } = mapPieceSchema.parse(reward)
          tomb.collectMapPiece(tombId)
          tomb.markMapPieceFound(journeyId)
        },
        tombKey: reward => {
          const { keyId } = tombKeySchema.parse(reward)
          tomb.addTombKey(keyId)
          tomb.applyTreasurePerk(keyId)
        },
      },
    }
  })
  registerHeldKeysProvider(() => useTombTreasureProgress().tombKeyIds)
}
