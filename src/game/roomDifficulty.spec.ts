import { describe, expect, it } from "vitest"
import { roomDifficulty } from "./roomDifficulty"

describe("roomDifficulty", () => {
  it("a node's difficulty wins for that room only", () => {
    const section = { difficulty: "starter" as const, difficultiesByIndex: { 1: "junior" as const } }
    expect([0, 1, 2].map(i => roomDifficulty(section, i))).toEqual(["starter", "junior", "starter"])
  })

  it("is the section's difficulty where no node names one", () => {
    expect(roomDifficulty({ difficulty: "expert" }, 3)).toBe("expert")
  })
})
