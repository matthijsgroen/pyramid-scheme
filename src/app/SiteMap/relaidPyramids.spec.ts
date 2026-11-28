import { describe, expect, it } from "vitest"
import type { StoredJourneyStateV3 } from "@/app/state/useJourneys"
import { relaidExploredCells, standsInRelaidPyramid, type RelaidPyramid } from "./relaidPyramids"

const RELAID: readonly RelaidPyramid[] = [{ journeyId: "made_up", levelNr: 2, since: 1 }]

const save = (overrides: Partial<StoredJourneyStateV3> = {}): StoredJourneyStateV3 => ({
  journeyId: "made_up",
  levelNr: 2,
  completionCount: 0,
  active: true,
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

  it("does not hold for another pyramid of the same journey", () => {
    expect(standsInRelaidPyramid(save({ levelNr: 3 }), RELAID)).toBe(false)
  })

  it("does not hold for the same pyramid number in another journey", () => {
    expect(standsInRelaidPyramid(save({ journeyId: "other" }), RELAID)).toBe(false)
  })

  it("does not hold for a save standing nowhere yet, which has no place to forget", () => {
    expect(standsInRelaidPyramid(save({ positionKey: null, standingKey: null }), RELAID)).toBe(false)
  })

  it("does not hold for a save already stamped with the version that re-laid the pyramid", () => {
    expect(standsInRelaidPyramid(save({ relaidFloorsVersion: 1 }), RELAID)).toBe(false)
  })

  it("holds for a save stamped before the version that re-laid the pyramid", () => {
    const later: readonly RelaidPyramid[] = [{ journeyId: "made_up", levelNr: 2, since: 2 }]
    expect(standsInRelaidPyramid(save({ relaidFloorsVersion: 1 }), later)).toBe(true)
  })
})

describe("relaidExploredCells", () => {
  const MOVED: readonly RelaidPyramid[] = [
    { journeyId: "made_up", levelNr: 2, since: 1, alsoExplored: [{ from: "main#0/p0", to: "main#0/p1" }] },
  ]

  it("marks the moved room explored where a save got past it before", () => {
    const explored = relaidExploredCells(save({ exploredCells: { "2:main": ["0/p0", "0/end"] } }), MOVED)
    expect(explored).toEqual({ "2:main": ["0/p0", "0/end", "0/p1"] })
  })

  it("leaves a save that never got past it as it is", () => {
    const exploredCells = { "2:main": ["0/entrance"] }
    expect(relaidExploredCells(save({ exploredCells }), MOVED)).toBe(exploredCells)
  })

  it("leaves the same room of another pyramid alone", () => {
    const exploredCells = { "3:main": ["0/p0"] }
    expect(relaidExploredCells(save({ exploredCells }), MOVED)).toBe(exploredCells)
  })

  it("leaves a save already stamped with the version that moved it alone", () => {
    const exploredCells = { "2:main": ["0/p0"] }
    expect(relaidExploredCells(save({ exploredCells, relaidFloorsVersion: 1 }), MOVED)).toBe(exploredCells)
  })
})
