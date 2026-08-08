import { describe, expect, it } from "vitest"
import { journeys } from "@/data/journeys"
import { TIER_UNLOCK_PERK_IDS } from "@/data/treasurePerks"
import { availablePyramidJourneyIds, isTierUnlocked, nextPyramidJourneyId } from "./journeyAvailability"

const noKeys: ReadonlySet<string> = new Set()
const keys = (...ids: string[]): ReadonlySet<string> => new Set(ids)
const completed =
  (...ids: string[]) =>
  (id: string) =>
    ids.includes(id)

const starterPyramids = journeys.filter(j => j.type === "pyramid" && j.difficulty === "starter").map(j => j.id)
const juniorPyramids = journeys.filter(j => j.type === "pyramid" && j.difficulty === "junior").map(j => j.id)

describe(isTierUnlocked, () => {
  it("lets the player start the game — the first tier has no entry key", () => {
    expect(isTierUnlocked("starter", noKeys)).toBe(true)
  })

  it("opens a tier on any one of its four unlock treasures, not a specific one", () => {
    for (const keyId of TIER_UNLOCK_PERK_IDS.junior!) {
      expect(isTierUnlocked("junior", keys(keyId))).toBe(true)
    }
  })

  it("stays shut for a key belonging to another tier", () => {
    expect(isTierUnlocked("junior", keys(...TIER_UNLOCK_PERK_IDS.expert!))).toBe(false)
  })
})

describe(availablePyramidJourneyIds, () => {
  it("offers the first expedition on a fresh game", () => {
    const available = availablePyramidJourneyIds(journeys, noKeys, completed())
    expect([...available]).toEqual([starterPyramids[0]])
  })

  it("opens the next expedition of a tier as the one before it is completed", () => {
    const available = availablePyramidJourneyIds(journeys, noKeys, completed(starterPyramids[0]))
    expect([...available]).toEqual(starterPyramids.slice(0, 2))
  })

  it("keeps the next tier shut until one of its unlock treasures is held, however much is completed", () => {
    const available = availablePyramidJourneyIds(journeys, noKeys, completed(...starterPyramids))
    expect(available.has(juniorPyramids[0])).toBe(false)
    expect([...available]).toEqual(starterPyramids)
  })

  it("admits the player to the tier's first expedition once the treasure is held", () => {
    const available = availablePyramidJourneyIds(journeys, keys("starter_a_1"), completed(...starterPyramids))
    expect(available.has(juniorPyramids[0])).toBe(true)
    // Entry only — the rest of the tier still opens one at a time.
    expect(available.has(juniorPyramids[1])).toBe(false)
  })

  it("does not need the tier's own expeditions completed first, only the previous one inside it", () => {
    const available = availablePyramidJourneyIds(
      journeys,
      keys("starter_a_1"),
      completed(...starterPyramids, juniorPyramids[0])
    )
    expect(available.has(juniorPyramids[1])).toBe(true)
    expect(available.has(juniorPyramids[2])).toBe(false)
  })
})

describe(nextPyramidJourneyId, () => {
  it("announces the next expedition inside the tier", () => {
    expect(nextPyramidJourneyId(journeys, juniorPyramids[0], keys("starter_a_1"))).toBe(juniorPyramids[1])
  })

  it("announces nothing at a tier's last expedition — a tomb comes next, not a pyramid", () => {
    expect(nextPyramidJourneyId(journeys, starterPyramids.at(-1)!, noKeys)).toBeUndefined()
  })

  it("announces nothing the player couldn't start", () => {
    expect(nextPyramidJourneyId(journeys, juniorPyramids[0], noKeys)).toBeUndefined()
  })
})
