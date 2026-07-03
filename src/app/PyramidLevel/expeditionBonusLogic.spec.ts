import { describe, it, expect } from "vitest"
import { determineExpeditionBonus } from "./expeditionBonusLogic"
import type { CombinedJourneyState } from "@/app/state/useJourneys"

const makeJourney = (levelNr: number): CombinedJourneyState =>
  ({
    journeyId: "test",
    levelNr,
    randomSeed: 12345,
    completionCount: 0,
    journey: { difficulty: "starter", levelCount: 5, type: "pyramid" },
  }) as unknown as CombinedJourneyState

describe("determineExpeditionBonus", () => {
  it("always returns [] (expedition bonus removed with TreasureEffects)", () => {
    expect(determineExpeditionBonus(makeJourney(5))).toEqual([])
    expect(determineExpeditionBonus(makeJourney(1))).toEqual([])
  })
})
