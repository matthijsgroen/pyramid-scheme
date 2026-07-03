import type { CombinedJourneyState } from "@/app/state/useJourneys"

// ponytail: expedition bonus removed with TreasureEffects; kept as stub for API compatibility
export const determineExpeditionBonus = (_activeJourney: CombinedJourneyState): string[] => []
