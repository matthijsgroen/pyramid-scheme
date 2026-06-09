import { allTreasures } from "@/data/treasures"

export const getUnlockArtifactIds = (inventory: Record<string, number>): string[] =>
  allTreasures.filter(t => (inventory[t.id] ?? 0) > 0 && t.effects?.hieroglyphUnlock).map(t => t.id)

export const getUnlockArtifactId = (inventory: Record<string, number>, unlockedCount: number): string => {
  const owned = getUnlockArtifactIds(inventory)
  return owned[unlockedCount] ?? owned[0] ?? ""
}
