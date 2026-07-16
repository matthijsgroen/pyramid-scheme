import { TOMB_PERK_IDS, TREASURE_PERKS } from "@/data/treasurePerks"

// The tomb-treasure mod owns which floor slots of a tomb are "spoken for" — a tier-unlock or
// location-key treasure, whose ward key is wired by the tier/discovery machinery, not handed to a
// pyramid's ward wings. buildSite calls this (injected via the descriptor) so core world-gen reads
// no perk types; with the mod off it isn't injected and nothing is reserved.
export const reservedTreasureIndices = (tombId: string): number[] => {
  const perkIds = TOMB_PERK_IDS[tombId] ?? []
  const reserved: number[] = []
  perkIds.forEach((keyId, idx) => {
    const perk = TREASURE_PERKS[keyId]
    if (perk?.type === "tier-unlock" || perk?.type === "location-key") reserved.push(idx)
  })
  return reserved
}
