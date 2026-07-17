import type { TombTreasureResolver } from "@/worldGen/configBuilder"
import { TOMB_PERK_IDS } from "@/data/treasurePerks"

// The tomb-treasure mod's tomb-content authoring: floor `index` of a tomb yields that tomb's
// ordered perk id as a `tombKey` reward — the perk stream, "the treasure IS the key"
// (pyramid-interior-design.md §8). Injected into buildConfigs (via the mod descriptor) so core
// world-gen names no reward type. Beyond the tomb's own perk-id list → no reward (undefined).
export const resolveTombTreasure: TombTreasureResolver = (tombId, index) => {
  const keyId = TOMB_PERK_IDS[tombId]?.[index]
  return keyId ? { type: "tombKey", keyId } : undefined
}
