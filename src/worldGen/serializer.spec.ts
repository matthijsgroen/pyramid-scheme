import { describe, expect, it } from "vitest"
import { generateFile } from "./serializer"
import type { SiteConfig } from "./types"

// Regression test for a real bug: serializeSideSection hand-enumerates fields and silently
// dropped `shopPrice` (added for the Fez shop) and nested `sideSections` — round-tripping a
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
      sideSections: [
        {
          pathPuzzles: 1,
          difficulty: "junior",
          end: "treasure",
          endReward: { type: "mosaicPiece" },
          shopPrice: 500,
          sealed: true,
          sideSections: [{ pathPuzzles: 0, difficulty: "junior", end: "treasure", endReward: { type: "mosaicPiece" } }],
        },
      ],
    },
  ]

  const output = generateFile({ test_journey: [config] })

  it("keeps shopPrice on a serialized side section", () => {
    expect(output).toContain("shopPrice: 500")
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
})
