import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Reaction } from "@/app/reactions/reactionContributions"
import { beatFor } from "./beatFor"

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
    expect(beatFor({ kind: "siteLeft", journeyId: "starter_treasure_tomb" })).toBe("bond.starterTomb")
    expect(beatFor({ kind: "siteLeft", journeyId: "wizard_treasure_tomb_c" })).toBe("bond.wizard")
  })

  it("has nothing to say about leaving anywhere else", () => {
    expect(beatFor({ kind: "siteLeft", journeyId: "expert_2" })).toBeUndefined()
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
    beatFor({ kind: "siteLeft", journeyId: "starter_treasure_tomb" }),
    beatFor({ kind: "siteLeft", journeyId: "wizard_treasure_tomb_c" }),
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
