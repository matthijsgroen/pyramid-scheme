import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { continueJourney, newToDiscoverCount, type ContinueInput } from "./continueJourney"

const journey = (id: string, difficulty: Difficulty, entryLock?: { count: number }) => ({
  id,
  difficulty,
  levelCount: 3,
  entryLock,
})

const journeys = [
  journey("a1", "starter"),
  journey("a2", "starter"),
  journey("b1", "junior"),
  journey("b2", "junior"),
  journey("tomb", "junior", { count: 2 }),
]

const input = (over: Partial<ContinueInput> = {}): ContinueInput => ({
  journeys,
  isInProgress: () => false,
  completionCount: () => 0,
  levelNr: () => 1,
  available: new Set(["a1", "a2", "b1", "b2"]),
  lockOpen: () => false,
  hidden: () => false,
  ...over,
})

describe("continueJourney", () => {
  it("continues the journey in progress over everything", () => {
    expect(
      continueJourney(input({ activeJourneyId: "a2", isInProgress: id => id === "a2", levelNr: () => 2 }))
    ).toEqual({ journeyId: "a2", mode: "continue", levelNr: 2, levelCount: 3 })
  })

  it("starts nothing new while the active id is not in progress", () => {
    expect(continueJourney(input({ activeJourneyId: "a2" }))?.mode).toBe("start")
  })

  it("prefers the higher tier's first open journey", () => {
    expect(continueJourney(input())).toEqual({ journeyId: "b1", mode: "start", levelCount: 3 })
  })

  it("skips a locked tomb and offers an opened one", () => {
    const only = { available: new Set<string>() }
    expect(continueJourney(input(only))).toBeUndefined()
    expect(continueJourney(input({ ...only, lockOpen: id => id === "tomb" }))?.journeyId).toBe("tomb")
  })

  it("skips a hidden journey", () => {
    expect(continueJourney(input({ hidden: id => id === "b1" }))?.journeyId).toBe("b2")
  })

  it("skips a completed journey and falls back to a lower tier", () => {
    const done = new Set(["b1", "b2"])
    expect(continueJourney(input({ completionCount: id => (done.has(id) ? 1 : 0) }))?.journeyId).toBe("a1")
  })

  it("offers nothing when everything is done", () => {
    expect(continueJourney(input({ completionCount: () => 1 }))).toBeUndefined()
  })
})

describe("newToDiscoverCount", () => {
  it("counts only finished journeys with unexplored levels", () => {
    const finished = new Set(["a1", "a2", "b1"])
    const unexplored = new Map([
      ["a1", new Set([2])],
      ["b1", new Set<number>()],
      ["b2", new Set([1])],
    ])
    expect(
      newToDiscoverCount({
        journeys,
        completionCount: id => (finished.has(id) ? 1 : 0),
        unexploredLevels: id => unexplored.get(id) ?? new Set(),
      })
    ).toBe(1)
  })
})
