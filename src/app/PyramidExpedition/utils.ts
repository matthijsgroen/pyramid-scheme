import { journeys } from "@/data/journeys"
import { nextPyramidJourneyId } from "@/app/pages/journeyAvailability"

// The expedition the completion screen offers next. Gated on the same rule the Travel screen picks
// from (journeyAvailability), so it never announces one the player can't start: crossing into a
// tier needs that tier's unlock treasure, which the next tomb — not this pyramid — holds.
export function getNextUnlockedPyramidJourneyId(journeyId: string, heldKeys: ReadonlySet<string>): string | undefined {
  return nextPyramidJourneyId(journeys, journeyId, heldKeys)
}
