import { describe, it, expect } from "vitest"
import { determineMapPieceLoot } from "./mapPieceLogic"
import type { CombinedJourneyState } from "@/app/state/useJourneys"
import type { TranslatedJourney } from "@/data/useJourneyTranslations"

const makeJourney = (type: "pyramid" | "treasure_tomb", startChance = 0.5, chanceIncrease = 0.1) =>
  ({
    type,
    rewards: { mapPiece: { startChance, chanceIncrease } },
  }) as unknown as TranslatedJourney

const makeState = (
  overrides: Partial<CombinedJourneyState> & { journey?: TranslatedJourney }
): CombinedJourneyState =>
  ({
    journeyId: "test_journey",
    randomSeed: 12345,
    levelNr: 1,
    completionCount: 0,
    foundMapPiece: false,
    journey: makeJourney("pyramid"),
    ...overrides,
  }) as unknown as CombinedJourneyState

const noJourneyInfo = () => undefined

describe("determineMapPieceLoot", () => {
  it("mapPieceChance is 0 when foundMapPiece is true", () => {
    const state = makeState({ foundMapPiece: true })
    const getJourney = () => state
    const result = determineMapPieceLoot(state, getJourney)
    expect(result.mapPieceChance).toBe(0)
    expect(result.shouldAwardMapPiece).toBe(false)
  })

  it("mapPieceChance is 0 for non-pyramid journeys", () => {
    const state = makeState({ journey: makeJourney("treasure_tomb") })
    const result = determineMapPieceLoot(state, noJourneyInfo)
    expect(result.mapPieceChance).toBe(0)
  })

  it("mapPieceChance = startChance when completionCount is 0", () => {
    const state = makeState({ journey: makeJourney("pyramid", 0.4, 0.2) })
    const getJourney = () => ({ ...state, completionCount: 0, foundMapPiece: false })
    const result = determineMapPieceLoot(state, getJourney)
    expect(result.mapPieceChance).toBeCloseTo(0.4)
  })

  it("mapPieceChance increases with completionCount", () => {
    const state = makeState({ journey: makeJourney("pyramid", 0.4, 0.2) })
    const getJourney = (n: number) => () => ({ ...state, completionCount: n, foundMapPiece: false })
    const r0 = determineMapPieceLoot(state, getJourney(0))
    const r2 = determineMapPieceLoot(state, getJourney(2))
    expect(r2.mapPieceChance).toBeCloseTo(r0.mapPieceChance + 2 * 0.2)
  })

  it("bonusMapFragmentChance is added to base chance", () => {
    const state = makeState({ journey: makeJourney("pyramid", 0.4, 0.0) })
    const getJourney = () => ({ ...state, completionCount: 0, foundMapPiece: false })
    const base = determineMapPieceLoot(state, getJourney)
    const bonus = determineMapPieceLoot(state, getJourney, 0.15)
    expect(bonus.mapPieceChance).toBeCloseTo(base.mapPieceChance + 0.15)
  })

  it("result is deterministic for the same seed", () => {
    const state = makeState({ journey: makeJourney("pyramid", 0.5, 0.1) })
    const getJourney = () => ({ ...state, completionCount: 1, foundMapPiece: false })
    const r1 = determineMapPieceLoot(state, getJourney)
    const r2 = determineMapPieceLoot(state, getJourney)
    expect(r1.shouldAwardMapPiece).toBe(r2.shouldAwardMapPiece)
  })

  it("falls back to completionCount=0 when getJourney returns undefined", () => {
    const state = makeState({ journey: makeJourney("pyramid", 0.4, 0.2) })
    const result = determineMapPieceLoot(state, noJourneyInfo)
    expect(result.mapPieceChance).toBeCloseTo(0.4)
  })
})
