import { journeys } from "@/data/journeys"

export function getNextUnlockedPyramidJourneyId(
  journeyId: string
): string | undefined {
  const idx = journeys.findIndex((j) => j.id === journeyId)
  if (idx === -1) return undefined
  for (let i = idx + 1; i < journeys.length; i++) {
    if (journeys[i].type === "pyramid") {
      return journeys[i].id
    }
  }
  return undefined
}
