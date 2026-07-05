import { describe, it, expect } from "vitest"
import { determineMapPieceLoot } from "./mapPieceLogic"
import type { CombinedJourneyState } from "@/app/state/useJourneys"
import type { TranslatedJourney } from "@/data/useJourneyTranslations"

const makeJourney = (type: "pyramid" | "treasure_tomb", startChance = 0.5, chanceIncrease = 0.1) =>
  ({
    type,
    rewards: { mapPiece: { startChance, chanceIncrease } },
  }) as unknown as TranslatedJourney

const makeState = (overrides: Partial<CombinedJourneyState> & { journey?: TranslatedJourney }): CombinedJourneyState =>
  ({
    journeyId: "test_journey",
    randomSeed: 12345,
    levelNr: 1,
    completionCount: 0,
    journey: makeJourney("pyramid"),
    ...overrides,
  }) as unknown as CombinedJourneyState

const noJourneyInfo = () => undefined

describe("determineMapPieceLoot", () => {
  it("mapPieceChance is 0 when hasMapPiece is true", () => {
    const state = makeState({})
    const getJourney = () => state
    const result = determineMapPieceLoot(state, getJourney, true)
    expect(result.mapPieceChance).toBe(0)
    expect(result.shouldAwardMapPiece).toBe(false)
  })

  it("mapPieceChance is 0 for non-pyramid journeys", () => {
    const state = makeState({ journey: makeJourney("treasure_tomb") })
    const result = determineMapPieceLoot(state, noJourneyInfo, false)
    expect(result.mapPieceChance).toBe(0)
  })

  it("mapPieceChance = startChance when completionCount is 0", () => {
    const state = makeState({ journey: makeJourney("pyramid", 0.4, 0.2) })
    const getJourney = () => ({ ...state, completionCount: 0 })
    const result = determineMapPieceLoot(state, getJourney, false)
    expect(result.mapPieceChance).toBeCloseTo(0.4)
  })

  it("mapPieceChance increases with completionCount", () => {
    const state = makeState({ journey: makeJourney("pyramid", 0.4, 0.2) })
    const getJourney = (n: number) => () => ({ ...state, completionCount: n })
    const r0 = determineMapPieceLoot(state, getJourney(0), false)
    const r2 = determineMapPieceLoot(state, getJourney(2), false)
    expect(r2.mapPieceChance).toBeCloseTo(r0.mapPieceChance + 2 * 0.2)
  })

  it("bonusMapFragmentChance is added to base chance", () => {
    const state = makeState({ journey: makeJourney("pyramid", 0.4, 0.0) })
    const getJourney = () => ({ ...state, completionCount: 0 })
    const base = determineMapPieceLoot(state, getJourney, false)
    const bonus = determineMapPieceLoot(state, getJourney, false, 0.15)
    expect(bonus.mapPieceChance).toBeCloseTo(base.mapPieceChance + 0.15)
  })

  it("result is deterministic for the same seed", () => {
    const state = makeState({ journey: makeJourney("pyramid", 0.5, 0.1) })
    const getJourney = () => ({ ...state, completionCount: 1 })
    const r1 = determineMapPieceLoot(state, getJourney, false)
    const r2 = determineMapPieceLoot(state, getJourney, false)
    expect(r1.shouldAwardMapPiece).toBe(r2.shouldAwardMapPiece)
  })

  it("falls back to completionCount=0 when getJourney returns undefined", () => {
    const state = makeState({ journey: makeJourney("pyramid", 0.4, 0.2) })
    const result = determineMapPieceLoot(state, noJourneyInfo, false)
    expect(result.mapPieceChance).toBeCloseTo(0.4)
  })
})
