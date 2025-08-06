import { journeys } from "@/data/journeys"

export function getNextUnlockedPyramidJourneyId(
  journeyId: string
): string | undefined {
  const idx = journeys.findIndex((j) => j.id === journeyId)
  if (idx === -1) return undefined
  const journey = journeys[idx + 1]
  if (!journey || journey.type !== "pyramid") return undefined
  return journey.id
}
