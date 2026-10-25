import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import type { Journey } from "@/data/journeys"
import { allJourneys, type AllJourneysInput, type JourneyNeed } from "./allJourneys"

const journey = (id: string, difficulty: Difficulty, entryLock?: { count: number }): Journey =>
  ({ id, difficulty, levelCount: 3, entryLock }) as unknown as Journey

const made = [
  journey("s1", "starter"),
  journey("s2", "starter"),
  journey("j1", "junior"),
  journey("j2", "junior"),
  journey("jt", "junior", { count: 3 }),
  journey("e1", "expert"),
  journey("m1", "master"),
]

const base = (over: Partial<AllJourneysInput> = {}): AllJourneysInput => ({
  journeys: made,
  isInProgress: () => false,
  completionCount: () => 0,
  levelNr: () => 1,
  available: new Set(["s1", "s2"]),
  hidden: () => false,
  lock: () => undefined,
  news: () => false,
  tierOpen: tier => tier === "starter",
  tierNeeds: tier => [{ key: `need-${tier}`, label: "keys" }],
  tierKeyHeld: () => true,
  ...over,
})

const tiers = (input: AllJourneysInput) => allJourneys(input).groups.map(g => g.tier)

describe(allJourneys, () => {
  it("lists tiers newest first with the next shut tier on top and no further", () => {
    const groups = allJourneys(
      base({ tierOpen: t => t === "starter" || t === "junior", available: new Set(["s1", "j1"]) })
    ).groups
    expect(groups.map(g => g.tier)).toEqual(["expert", "junior", "starter"])
    expect(groups[0]).toMatchObject({ locked: true, rows: [], needs: [{ key: "need-expert" }] })
  })

  it("shows no shut tier while its treasure is not held", () => {
    const input = base({ tierOpen: t => t === "starter" || t === "junior", available: new Set(["s1", "j1"]) })
    expect(tiers({ ...input, tierKeyHeld: () => false })).toEqual(["junior", "starter"])
  })

  it("opens a tier when one of its journeys is available", () => {
    expect(tiers(base({ available: new Set(["s1", "j1"]) }))).toEqual(["expert", "junior", "starter"])
  })

  it("counts a not-yet-available pyramid journey in total without a row; a hidden one in neither", () => {
    const [group] = allJourneys(base({ available: new Set(["s1"]), hidden: id => id === "zz" })).groups.slice(-1)
    expect(group.rows.map(r => r.journeyId)).toEqual(["s1"])
    expect(group.total).toBe(2)
    const [hidden] = allJourneys(base({ available: new Set(["s1"]), hidden: id => id === "s2" })).groups.slice(-1)
    expect(hidden.total).toBe(1)
  })

  it("marks the active in-progress journey current, a completed one finished, others open", () => {
    const [group] = allJourneys(
      base({
        activeJourneyId: "s1",
        isInProgress: id => id === "s1",
        completionCount: id => (id === "s2" ? 1 : 0),
      })
    ).groups.slice(-1)
    expect(group.rows.map(r => r.status)).toEqual(["current", "finished"])
    expect(group.done).toBe(1)
    const open = allJourneys(base({ activeJourneyId: "s1" })).groups.slice(-1)[0]
    expect(open.rows.map(r => r.status)).toEqual(["open", "open"])
  })

  it("locks a tomb on its unmet lock and opens it when met", () => {
    const lock = (found: number) => () => ({
      found,
      required: 3,
      labels: { title: "t", requires: "r", unit: "pieces", howToUnlock: "h" },
    })
    const rows = (found: number) =>
      allJourneys(base({ tierOpen: t => t !== "master" && t !== "wizard", lock: lock(found) })).groups.find(
        g => g.tier === "junior"
      )!.rows
    const locked = rows(2).find(r => r.journeyId === "jt")!
    expect(locked.status).toBe("locked")
    expect(locked.needs).toEqual([{ key: "lock:jt", label: "pieces", progress: { found: 2, required: 3 } }])
    expect(rows(3).find(r => r.journeyId === "jt")!.status).toBe("open")
  })

  it("lets extraNeeds lock a journey and add to a tier's needs; nothing without it", () => {
    const extra: JourneyNeed = { key: "x", label: "extra" }
    const extraNeeds = (gate: { tier: Difficulty } | { journeyId: string }) =>
      "journeyId" in gate ? (gate.journeyId === "s2" ? [extra] : []) : [extra]
    const groups = allJourneys(base({ extraNeeds })).groups
    expect(groups[0].needs).toEqual([{ key: "need-junior", label: "keys" }, extra])
    expect(groups.at(-1)!.rows.map(r => [r.journeyId, r.status])).toEqual([
      ["s1", "open"],
      ["s2", "locked"],
    ])
    expect(groups.at(-1)!.rows[1].needs).toEqual([extra])
    expect(allJourneys(base()).groups[0].needs).toEqual([{ key: "need-junior", label: "keys" }])
  })

  it("collapses a finished older tier with its news; the newest open tier stays open", () => {
    const input = base({
      tierOpen: t => t === "starter" || t === "junior",
      available: new Set(["s1", "s2", "j1", "j2"]),
      completionCount: () => 1,
      news: id => id === "s2",
    })
    const groups = allJourneys(input).groups
    const byTier = (t: Difficulty) => groups.find(g => g.tier === t)!
    expect(byTier("starter")).toMatchObject({ finished: true, collapsed: true, news: true })
    expect(byTier("junior")).toMatchObject({ collapsed: false })
  })

  it("leaves out a listed tier with no journey to show, instead of calling it finished", () => {
    const input = base({
      journeys: made.filter(j => j.difficulty !== "starter"),
      tierOpen: t => t === "starter" || t === "junior",
      available: new Set(["j1"]),
    })
    expect(tiers(input)).toEqual(["expert", "junior"])
    expect(allJourneys({ ...input, hidden: () => true }).groups.every(g => g.tier !== "starter")).toBe(true)
  })

  it("makes the coming-soon tier no locked group, and any other next tier still one", () => {
    const input = base({ tierOpen: t => t === "starter" || t === "junior", available: new Set(["s1", "j1"]) })
    expect(allJourneys({ ...input, comingSoon: "expert" }).groups.map(g => g.tier)).toEqual(["junior", "starter"])
    expect(allJourneys({ ...input, comingSoon: "master" }).groups.map(g => g.tier)).toEqual([
      "expert",
      "junior",
      "starter",
    ])
  })

  it("passes comingSoon through", () => {
    expect(allJourneys(base({ comingSoon: "master" })).comingSoon).toBe("master")
  })
})
