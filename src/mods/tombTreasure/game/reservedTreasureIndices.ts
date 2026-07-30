import { TOMB_PERK_IDS, TIER_UNLOCK_PERK_IDS } from "@/data/treasurePerks"
import { TREASURE_PERKS } from "./treasurePerks"

// The tomb-treasure mod owns which floor slots of a tomb are "spoken for" — a tier-unlock or
// location-key treasure, whose ward key is wired by the tier/discovery machinery, not handed to a
// pyramid's ward wings. buildSite calls this (injected via the descriptor) so core world-gen reads
// no perk types; with the mod off it isn't injected and nothing is reserved.
//
// Also reserves every index TIER_UNLOCK_PERK_IDS references directly — a tier now draws one key
// per journey from its previous tier's tomb (not just that tomb's single `tier-unlock`-tagged
// floor), so those extra indices need the same protection from freeWardIndices' auto-draw, even
// though their own TREASURE_PERKS tag is something else entirely (a compass, armor, etc.).
export const reservedTreasureIndices = (tombId: string): number[] => {
  const perkIds = TOMB_PERK_IDS[tombId] ?? []
  const reserved = new Set<number>()
  perkIds.forEach((keyId, idx) => {
    const perk = TREASURE_PERKS[keyId]
    if (perk?.type === "tier-unlock" || perk?.type === "location-key") reserved.add(idx)
  })
  for (const keys of Object.values(TIER_UNLOCK_PERK_IDS)) {
    keys?.forEach(keyId => {
      const idx = perkIds.indexOf(keyId)
      if (idx !== -1) reserved.add(idx)
    })
  }
  return [...reserved]
}
