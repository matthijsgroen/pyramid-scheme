import { describe, expect, it } from "vitest"
import { isFreeOrderDifficulty } from "@/data/difficultyLevels"
import { journeys, type Journey } from "@/data/journeys"
import { TIER_UNLOCK_PERK_IDS } from "@/data/treasurePerks"
import {
  availablePyramidJourneyIds,
  comingSoonDifficulty,
  currentChapter,
  isTierUnlocked,
  nextPyramidJourneyId,
  tierKeyNeed,
} from "./journeyAvailability"

const noKeys: ReadonlySet<string> = new Set()
const keys = (...ids: string[]): ReadonlySet<string> => new Set(ids)
const completed =
  (...ids: string[]) =>
  (id: string) =>
    ids.includes(id)

const starterPyramids = journeys.filter(j => !j.entryLock && j.difficulty === "starter").map(j => j.id)
const juniorPyramids = journeys.filter(j => !j.entryLock && j.difficulty === "junior").map(j => j.id)

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

describe("unreleased tiers", () => {
  it("keeps master shut even with its unlock key held", () => {
    expect(isTierUnlocked("master", keys(...TIER_UNLOCK_PERK_IDS.master!))).toBe(false)
  })

  it("offers no master expedition to a player holding every key", () => {
    const allKeys = keys(...(Object.values(TIER_UNLOCK_PERK_IDS).flat() as string[]))
    const available = availablePyramidJourneyIds(journeys, allKeys, () => true)
    const tiers = new Set(journeys.filter(j => available.has(j.id)).map(j => j.difficulty))
    expect(tiers.has("master")).toBe(false)
    expect(tiers.has("wizard")).toBe(false)
    expect(tiers.has("expert")).toBe(true)
  })

  it("names master as coming soon once its key is held", () => {
    expect(comingSoonDifficulty(keys(TIER_UNLOCK_PERK_IDS.master![0]))).toBe("master")
  })

  it("names nothing coming soon while another need still shuts that tier", () => {
    const masterKey = keys(TIER_UNLOCK_PERK_IDS.master![0])
    expect(comingSoonDifficulty(masterKey, tier => tier !== "master")).toBeUndefined()
    expect(comingSoonDifficulty(masterKey, () => true)).toBe("master")
  })

  it("names nothing coming soon before the player reaches the cap", () => {
    expect(comingSoonDifficulty(keys(...TIER_UNLOCK_PERK_IDS.expert!))).toBeUndefined()
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

describe("a tier a need keeps shut", () => {
  const shut = (tier: string) => tier !== "junior"
  it("offers no journey of that tier and announces none, whatever keys are held", () => {
    const all = keys(...Object.values(TIER_UNLOCK_PERK_IDS).flatMap(ids => ids ?? []))
    const done = completed(...starterPyramids)
    expect(
      [...availablePyramidJourneyIds(journeys, all, done, undefined, shut)].filter(id => juniorPyramids.includes(id))
    ).toEqual([])
    expect(nextPyramidJourneyId(journeys, starterPyramids.at(-1)!, all, done, undefined, shut)).toBeUndefined()
    expect(isTierUnlocked("junior", all, shut)).toBe(false)
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

describe("free-order tier", () => {
  const made = (id: string, difficulty: Journey["difficulty"], entryLock?: boolean) =>
    ({ id, difficulty, ...(entryLock ? { entryLock: {} } : {}) }) as unknown as Journey
  const world = [
    made("s1", "starter"),
    made("s2", "starter"),
    made("j1", "junior"),
    made("j2", "junior"),
    made("j3", "junior"),
    made("j-tomb", "junior", true),
  ]
  const freeJunior = (d: string) => d === "junior"
  const juniorKey = keys(...TIER_UNLOCK_PERK_IDS.junior!)

  it("opens every journey of the tier with the tier key, nothing completed", () => {
    const available = availablePyramidJourneyIds(world, juniorKey, completed(), freeJunior)
    expect([...available].filter(id => id.startsWith("j"))).toEqual(["j1", "j2", "j3"])
  })

  it("keeps the tier shut without its key", () => {
    const available = availablePyramidJourneyIds(world, noKeys, completed(), freeJunior)
    expect([...available].some(id => id.startsWith("j"))).toBe(false)
  })

  it("keeps the previous-completed rule in a tier that is not free-order", () => {
    const available = availablePyramidJourneyIds(world, juniorKey, completed(), freeJunior)
    expect([...available].filter(id => id.startsWith("s"))).toEqual(["s1"])
  })

  it("offers the first open journey after this one, then any before it", () => {
    expect(nextPyramidJourneyId(world, "j1", juniorKey, completed(), freeJunior)).toBe("j2")
    expect(nextPyramidJourneyId(world, "j3", juniorKey, completed(), freeJunior)).toBe("j1")
  })

  it("never names a completed journey, nor the one just finished", () => {
    expect(nextPyramidJourneyId(world, "j1", juniorKey, completed("j2"), freeJunior)).toBe("j3")
    expect(nextPyramidJourneyId(world, "j1", juniorKey, completed("j2", "j3"), freeJunior)).toBeUndefined()
  })

  it("never names a journey of a closed tier", () => {
    expect(nextPyramidJourneyId(world, "j1", noKeys, completed(), freeJunior)).toBeUndefined()
  })

  it("marks wizard, and no other tier, free-order", () => {
    expect(isFreeOrderDifficulty("wizard")).toBe(true)
    expect(isFreeOrderDifficulty("expert")).toBe(false)
  })
})

describe(currentChapter, () => {
  it("is the first tier when no key is held", () => {
    expect(currentChapter(noKeys)).toBe("starter")
    expect(currentChapter(keys("not-a-tier-key"))).toBe("starter")
  })

  it("is the highest tier a held key opens", () => {
    expect(currentChapter(keys(TIER_UNLOCK_PERK_IDS.junior![0]))).toBe("junior")
    expect(currentChapter(keys(TIER_UNLOCK_PERK_IDS.junior![0], TIER_UNLOCK_PERK_IDS.expert![0]))).toBe("expert")
  })

  it("passes over a tier a need keeps shut", () => {
    const held = keys(TIER_UNLOCK_PERK_IDS.junior![0], TIER_UNLOCK_PERK_IDS.expert![0])
    expect(currentChapter(held, tier => tier !== "expert")).toBe("junior")
  })

  it("passes over a tier this release does not ship", () => {
    const all = Object.values(TIER_UNLOCK_PERK_IDS).flatMap(ids => ids ?? [])
    expect(currentChapter(keys(...all))).toBe("expert")
  })
})

describe(tierKeyNeed, () => {
  const display = (keyId: string) => ({ symbol: `sym-${keyId}` })

  it("has no need for a tier without unlock keys", () => {
    expect(tierKeyNeed("starter", noKeys, display, "Find")).toBeUndefined()
  })

  it("shows only the first floor's treasure, lit when held", () => {
    const [first, second] = TIER_UNLOCK_PERK_IDS.junior!
    expect(tierKeyNeed("junior", keys(second), display, "Find")!.symbols).toEqual([
      { symbol: `sym-${first}`, held: false },
    ])
    const need = tierKeyNeed("junior", keys(first), display, "Find")!
    expect(need.label).toBe("Find")
    expect(need.symbols).toEqual([{ symbol: `sym-${first}`, held: true }])
  })

  it("gives no symbol to a key without a display", () => {
    const [first] = TIER_UNLOCK_PERK_IDS.junior!
    const need = tierKeyNeed("junior", noKeys, id => (id === first ? undefined : display(id)), "Find")!
    expect(need.symbols).toEqual([])
  })
})
