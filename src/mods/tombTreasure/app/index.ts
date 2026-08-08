import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { registerHeldKeysProvider, registerKeyDisplay } from "@/app/SiteMap/keyProviders"
import { useMergedPerkContributions } from "@/app/SiteMap/perkContributions"
import { registerCollectionSection } from "@/app/pages/collectionSectionRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { TREASURE_PERKS } from "../game/treasurePerks"
import { treasureDisplayByKeyId } from "../game/treasures"
import { useTombTreasureProgress } from "./useTombTreasureProgress"
import { registerTombTreasureRewardDisplay } from "./rewardDisplay"
import { TombTreasureCollectionSection } from "./TombTreasureCollectionSection"
import { mapPieceSchema, tombKeySchema } from "./rewardSchemas"

// tomb-treasure's app entrypoint (side-effect): the reward display handlers, reward schemas, the
// claim effects (map piece → count + mark the pyramid journey's chest opened; tomb key → grant the
// key + dispatch its perk to the owning mod), and the held-keys provider (ward keys the site-map
// runtime reads for gate satisfaction). The key/map-piece state is the mod's OWN
// (useTombTreasureProgress); the perk goes to whichever mod owns it via the merged perk seam, so
// core names neither `mapPiece` nor `tombKey` nor any perk. Self-gated on the mod being enabled.
if (isModEnabled("tomb-treasure")) {
  registerTombTreasureRewardDisplay()
  registerRewardSchema("mapPiece", mapPieceSchema)
  registerRewardSchema("tombKey", tombKeySchema)
  registerRewardContribution(() => {
    const tomb = useTombTreasureProgress()
    const { grant } = useMergedPerkContributions()
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
          // The perk (if any) lands in the owning mod's state; tier-unlock/location-key/none match no
          // handler → no-op (addTombKey already handled the key). See §7.4/§8.1.
          const perk = TREASURE_PERKS[keyId]
          if (perk) grant(perk)
        },
      },
    }
  })
  registerHeldKeysProvider(() => useTombTreasureProgress().tombKeyIds)
  // A ward key IS a treasure, so a door sealed with one carries that treasure's sign — the same
  // glyph its Collection slot shows, which is how the player recognizes what they're missing.
  registerKeyDisplay(() => keyId => {
    const treasure = treasureDisplayByKeyId[keyId]
    return treasure ? { symbol: treasure.symbol } : undefined
  })
  // The 5 per-difficulty treasure groups. Ordered first (before hieroglyph=20 / shop=30) — ward
  // treasures are the most valuable collectibles (ward keys + their perks). "Collected" = own the
  // tombKey; drops out of the Collection screen when the mod is off.
  registerCollectionSection({ id: "tomb-treasure", order: 10, Component: TombTreasureCollectionSection })
}
