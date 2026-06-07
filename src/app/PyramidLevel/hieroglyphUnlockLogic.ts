import { allTreasures } from "@/data/treasures"

export const getUnlockArtifactId = (inventory: Record<string, number>, unlockedCount: number): string => {
  const owned = allTreasures.filter(t => (inventory[t.id] ?? 0) > 0 && t.effects?.hieroglyphUnlock)
  return (owned[unlockedCount] ?? owned[0])?.id ?? ""
}
