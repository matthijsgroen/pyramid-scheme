import { describe, expect, it } from "vitest"
import { startedGlyphs } from "./startedGlyphs"

describe("startedGlyphs", () => {
  const progress = { begun: [1, 3], untouched: [0, 3], done: [3, 3], granted: [1, 2] }
  const glyphs = startedGlyphs(
    { begun: "B", untouched: "U", done: "D", granted: "G" },
    id => ({ found: progress[id as keyof typeof progress][0], required: progress[id as keyof typeof progress][1] }),
    id => id === "granted"
  )

  it("offers only signs with a piece found that are not complete", () => {
    expect(glyphs).toEqual([{ id: "begun", symbol: "B", progress: "1/3" }])
  })
})
