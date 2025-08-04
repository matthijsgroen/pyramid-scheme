import type { JourneyState } from "@/app/state/useJourneys"

export type Loot = {
  itemName: string
  itemDescription?: string
  itemComponent: React.ReactNode
  rarity?: "common" | "rare" | "epic" | "legendary"
}

export const useLootDetermination = (
  _activeJourney: JourneyState
): Loot | null => {
  // TODO: Implement loot determination logic based on journey properties
  // For now, return null
  return null
}
