import { describe, expect, it } from "vitest"
import { hieroglyphCoverageValidator } from "./fragmentFinalize"
import type { FloorConfig, SiteConfig } from "@/worldGen/types"

const configWithFragments = (counts: Record<string, number>): Record<string, SiteConfig[]> => ({
  site: [
    [
      {
        difficulty: "starter",
        sideSections: Object.entries(counts).flatMap(([hieroglyphId, count]) =>
          Array.from({ length: count }, () => ({
            difficulty: "starter" as const,
            endReward: { type: "hieroglyphFragment" as const, hieroglyphId },
          }))
        ),
      } as unknown as FloorConfig,
    ],
  ],
})

describe("hieroglyphCoverageValidator", () => {
  it("passes when every symbol's placed count meets its requirement", () => {
    const validate = hieroglyphCoverageValidator({ ra: 2, bee: 1 })
    expect(() => validate(configWithFragments({ ra: 2, bee: 1 }), [])).not.toThrow()
  })

  it("throws naming the under-placed symbol and its shortfall", () => {
    const validate = hieroglyphCoverageValidator({ ra: 3, bee: 1 })
    expect(() => validate(configWithFragments({ ra: 2, bee: 1 }), [])).toThrow(/ra: 2\/3/)
  })
})
