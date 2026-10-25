import type { SiteConfig } from "@/worldGen/types"
import type { LootTotal } from "@/worldGen/lootReport"
import { forEachConfigReward, forEachConfigSection } from "@/worldGen/configRewards"
import { WORLD_TARGETS } from "@/worldGen/worldTargets"
import { allTreasures, treasureByKeyId } from "./treasures"

// The tomb-treasure mod's rows of the loot report: map pieces against the world's target, tomb
// treasures against the catalogue, and the ward gates whose key a placed treasure grants against
// every ward gate. Drops with the mod.
export const tombTreasureLootTotals = (configs: Record<string, SiteConfig[]>): LootTotal[] => {
  let mapPieces = 0
  const placedKeys = new Set<string>()
  forEachConfigReward(configs, reward => {
    if (reward.type === "mapPiece") mapPieces++
    if (reward.type === "tombKey" && typeof reward.keyId === "string" && reward.keyId in treasureByKeyId)
      placedKeys.add(reward.keyId)
  })
  let gates = 0
  let gatesWithKey = 0
  forEachConfigSection(configs, section => {
    if (section.gate?.type !== "tomb-key") return
    gates++
    if (placedKeys.has(section.gate.wardKeyId)) gatesWithKey++
  })
  return [
    { label: "Map pieces", found: mapPieces, needed: WORLD_TARGETS.mapPieceRewards },
    { label: "Tomb treasures", found: placedKeys.size, needed: allTreasures.length },
    { label: "Ward gates with their key", found: gatesWithKey, needed: gates },
  ]
}
