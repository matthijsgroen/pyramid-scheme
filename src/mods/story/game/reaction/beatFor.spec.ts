import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Reaction } from "@/app/reactions/reactionContributions"
import { beatsFor } from "./beatFor"

const beatFor = (reaction: Reaction) => beatsFor(reaction)[0]

const solved = (over: Partial<Extract<Reaction, { kind: "solved" }>> = {}): Reaction => ({
  kind: "solved",
  tags: ["puzzle"],
  journeyId: "starter_1",
  tier: "starter",
  ...over,
})

describe("what Fez is willing to remark on", () => {
  it("says nothing at all about an ordinary solve", () => {
    expect(beatFor(solved({ unaided: false }))).toBeUndefined()
    expect(beatFor(solved())).toBeUndefined()
  })

  it("notices the first board finished without a hint", () => {
    expect(beatFor(solved({ unaided: true }))).toBe("bond.starter")
  })

  it("notices again a tier later, and never after that", () => {
    expect(beatFor(solved({ unaided: true, tier: "junior", journeyId: "junior_2" }))).toBe("bond.junior")
    for (const tier of ["expert", "master", "wizard"] as const)
      expect(beatFor(solved({ unaided: true, tier }))).toBeUndefined()
  })

  it("keeps a trap out of the beats that are about solving", () => {
    expect(beatFor(solved({ tags: ["trap"], unaided: true, tier: "starter" }))).toBeUndefined()
  })

  it("remarks on a trap only when it was close", () => {
    expect(beatFor(solved({ tags: ["trap"], close: true }))).toBe("bond.expert")
    expect(beatFor(solved({ tags: ["trap"], close: false }))).toBeUndefined()
  })

  it("waits until the tomb is behind them for the two that answer a tomb", () => {
    expect(beatFor({ kind: "siteLeft", journeyId: "starter_treasure_tomb", lastLevel: true })).toBe("bond.starterTomb")
    expect(beatFor({ kind: "siteLeft", journeyId: "wizard_treasure_tomb_c", lastLevel: true })).toBe("bond.wizard")
  })

  it("keeps the tomb's afterword for its last level, not the cave on the way in", () => {
    expect(beatFor({ kind: "siteLeft", journeyId: "starter_treasure_tomb", lastLevel: false })).toBeUndefined()
  })

  it("has nothing to say about leaving anywhere else", () => {
    expect(beatFor({ kind: "siteLeft", journeyId: "expert_2", lastLevel: true })).toBeUndefined()
  })
})

describe("the beats a moment can play", () => {
  const declared = new Set(["cave.t1", "pillar.t1", "cavern.t1", "bond.starterTomb"])
  const site = (kind: "siteArrived" | "exitReached", exterior?: string): Reaction => ({
    kind,
    journeyId: "t1",
    levelNr: 1,
    exterior,
  })

  it("offers the cave beat at a cave mouth and the cavern beat at a cavern, only when declared", () => {
    expect(beatsFor(site("siteArrived", "caveMouth"), declared)).toEqual(["cave.t1"])
    expect(beatsFor(site("siteArrived", "cavern"), declared)).toEqual(["cavern.t1"])
    expect(beatsFor(site("siteArrived", "caveMouth"), new Set())).toEqual([])
  })

  it("has no arrival beat at a plain pyramid", () => {
    expect(beatsFor(site("siteArrived"), declared)).toEqual([])
    expect(beatsFor(site("siteArrived", "other"), declared)).toEqual([])
  })

  it("offers the pillar beat at a cave's exit and nowhere else", () => {
    expect(beatsFor(site("exitReached", "caveMouth"), declared)).toEqual(["pillar.t1"])
    expect(beatsFor(site("exitReached", "cavern"), declared)).toEqual([])
    expect(beatsFor(site("exitReached"), declared)).toEqual([])
  })

  const home = (tags: string[], arrived?: { haul: boolean }): Reaction => ({ kind: "homeShown", tags, arrived })
  const all = new Set([
    "camp.firstHome",
    "camp.rested",
    "camp.structureDone",
    "camp.firstFind",
    "camp.homeHaul",
    "camp.homeEmpty",
  ])

  it("offers only the first-home beat to a bare home", () => {
    expect(beatsFor(home([]), all)).toEqual(["camp.firstHome"])
  })

  it("lists the home's beats in order, the haul line last", () => {
    expect(beatsFor(home(["camp.found", "camp.structureDone", "trap.mended"], { haul: true }), all)).toEqual([
      "camp.firstHome",
      "camp.rested",
      "camp.structureDone",
      "camp.firstFind",
      "camp.homeHaul",
    ])
  })

  it("picks the empty-haul beat when the coming-home screen showed no line", () => {
    expect(beatsFor(home([], { haul: false }), all)).toEqual(["camp.firstHome", "camp.homeEmpty"])
  })

  it("offers the tier's chapter beat", () => {
    expect(beatsFor({ kind: "chapterOpened", tier: "expert" }, new Set(["camp.chapterExpert"]))).toEqual([
      "camp.chapterExpert",
    ])
  })

  it("never returns an id that is not declared", () => {
    expect(beatsFor(home(["trap.mended"], { haul: true }), new Set(["camp.rested"]))).toEqual(["camp.rested"])
  })
})

// A beat id is a translation key, so a typo in one is a rail that fires into nothing: the trigger
// works, the conversation is empty, and the player sees no beat and no error. These are the ids
// beatFor can actually produce, checked against the script as authored.
describe("the beats the rail can reach", () => {
  const authored = (locale: string) =>
    JSON.parse(readFileSync(join("public/locales", locale, "fez.json"), "utf8")).bond as Record<string, unknown>

  const reachable = [
    beatFor(solved({ unaided: true, tier: "starter" })),
    beatFor(solved({ unaided: true, tier: "junior" })),
    beatFor(solved({ tags: ["trap"], close: true })),
    beatFor({ kind: "siteLeft", journeyId: "starter_treasure_tomb", lastLevel: true }),
    beatFor({ kind: "siteLeft", journeyId: "wizard_treasure_tomb_c", lastLevel: true }),
  ]

  it("are all written, in both languages", () => {
    for (const locale of ["en", "nl"]) {
      const bond = authored(locale)
      expect(reachable.filter(beat => !beat || !bond[beat.replace("bond.", "")])).toEqual([])
    }
  })

  it("leaves bond.master unreached, because the arc that triggers it is not built", () => {
    expect(reachable).not.toContain("bond.master")
    // Still authored, so building the offering arc is wiring rather than writing.
    expect(authored("en").master).toBeTruthy()
  })
})
