import { describe, expect, it } from "vitest"
import { generateFile } from "./serializer"
import type { SiteConfig } from "./types"

// Regression test for a real bug: serializeSideSection hand-enumerates fields and silently
// dropped `rewards` (a shop's stock array) and nested `sideSections` — round-tripping a
// config through generateFile lost both, even though every other stage of the pipeline
// (constraint resolution, buildSideSections, the economy guard) operates on the in-memory
// config and never caught it.
describe("generateFile — serializeSideSection field coverage", () => {
  const config: SiteConfig = [
    {
      pathPuzzles: 1,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sealed: true,
      theme: "night",
      sideSections: [
        {
          pathPuzzles: 1,
          difficulty: "junior",
          end: "treasure",
          theme: "day",
          endReward: { type: "mosaicPiece" },
          rewards: [{ type: "mosaicPiece" }, { type: "consumable", consumable: "oil" }],
          sealed: true,
          encounter: "tableau",
          sideSections: [{ pathPuzzles: 0, difficulty: "junior", end: "treasure", endReward: { type: "mosaicPiece" } }],
        },
      ],
    },
  ]

  const output = generateFile({ test_journey: [config] })

  it("keeps a rewards (shop stock) array on a serialized side section", () => {
    expect(output).toContain("rewards: [")
    expect(output).toContain('consumable: "oil"')
  })

  it("keeps a nested sideSections array", () => {
    expect(output).toMatch(/sideSections: \[\{ pathPuzzles: 0/)
  })

  it("keeps sealed on a serialized side section", () => {
    expect(output).toContain("sealed: true")
  })

  it("keeps sealed on a serialized floor (main path)", () => {
    expect(output.match(/sealed: true/g)?.length).toBe(2) // one on the floor, one on its side section
  })

  it("keeps encounter on a serialized side section", () => {
    expect(output).toContain('encounter: "tableau"')
  })

  // The same hand-enumeration hazard, and a skin is the field most likely to fall down it: a dropped skin
  // does not fail — every family just quietly draws its default, everywhere, forever.
  it("keeps the skin on both a serialized floor and a serialized side section", () => {
    expect(output).toContain('theme: "night"')
    expect(output).toContain('theme: "day"')
  })
})
