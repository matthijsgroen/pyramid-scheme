import { describe, expect, it } from "vitest"
import type { StoredJourneyStateV3 } from "@/app/state/useJourneys"
import { standsInRelaidPyramid, type RelaidPyramid } from "./relaidPyramids"

const RELAID: readonly RelaidPyramid[] = [{ journeyId: "made_up", levelNr: 2 }]

const save = (overrides: Partial<StoredJourneyStateV3> = {}): StoredJourneyStateV3 => ({
  journeyId: "made_up",
  levelNr: 2,
  completionCount: 0,
  active: true,
  exploredSections: {},
  position: "0:3,4",
  positionKey: "main#0/p3",
  standingKey: "main#0/~12",
  interiorLevelNr: 2,
  ...overrides,
})

describe("standsInRelaidPyramid", () => {
  it("holds for a save standing on the re-laid pyramid's main floor", () => {
    expect(standsInRelaidPyramid(save(), RELAID)).toBe(true)
  })

  it("holds for a save standing up the re-laid pyramid's ward wing, which comes down onto the re-laid floor", () => {
    expect(standsInRelaidPyramid(save({ positionKey: "s7#1/p0", standingKey: "s7#1/p0" }), RELAID)).toBe(true)
  })

  it("holds for a save carrying only the coordinate archive, which the re-key turns into a place", () => {
    expect(standsInRelaidPyramid(save({ positionKey: undefined, standingKey: undefined }), RELAID)).toBe(true)
  })

  it("does not hold for another pyramid of the same journey", () => {
    expect(standsInRelaidPyramid(save({ levelNr: 3 }), RELAID)).toBe(false)
  })

  it("does not hold for the same pyramid number in another journey", () => {
    expect(standsInRelaidPyramid(save({ journeyId: "other" }), RELAID)).toBe(false)
  })

  it("does not hold for a save standing nowhere yet, which has no place to forget", () => {
    expect(standsInRelaidPyramid(save({ position: null, positionKey: null, standingKey: null }), RELAID)).toBe(false)
  })
})
