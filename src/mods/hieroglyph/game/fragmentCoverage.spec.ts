import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { HIEROGLYPH_REQUIRED } from "./hieroglyphData"
import { placedFragmentCounts, hieroglyphCoverageValidator } from "./fragmentFinalize"
import type { SiteConfig } from "@/worldGen/types"

// Per-symbol placement guarantee: only a world-wide total was ever checked before
// (validateRewardCounts), so a symbol whose lock the reachability walk never discovered could
// silently end up under-placed — masked by a since-removed cap (cappedHieroglyphRequired) that
// quietly lowered its requirement to however many happened to land. placeFragments.ts's
// completion pass (`allBuckets`) is the fix; this is the per-symbol assertion that would catch a
// regression in it.
describe("every hieroglyph's full fragment count is placed (over the generated world)", () => {
  const placed = placedFragmentCounts(generatedWorldConfigs)

  it("has no symbol under-placed", () => {
    const under = Object.keys(HIEROGLYPH_REQUIRED).filter(id => (placed.get(id) ?? 0) < HIEROGLYPH_REQUIRED[id])
    expect(
      under,
      `under-placed: ${under.map(id => `${id}: ${placed.get(id) ?? 0}/${HIEROGLYPH_REQUIRED[id]}`)}`
    ).toEqual([])
  })

  it("places every symbol referenced anywhere (none sit at 0)", () => {
    const missing = Object.keys(HIEROGLYPH_REQUIRED).filter(id => !placed.has(id))
    expect(missing).toEqual([])
  })
})

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
      } as unknown as SiteConfig,
    ],
  ],
})

describe("hieroglyphCoverageValidator", () => {
  it("passes when every symbol's placed count meets its requirement", () => {
    const validate = hieroglyphCoverageValidator({ ra: 2, bee: 1 })
    expect(() => validate(configWithFragments({ ra: 2, bee: 1 }))).not.toThrow()
  })

  it("throws naming the under-placed symbol and its shortfall", () => {
    const validate = hieroglyphCoverageValidator({ ra: 3, bee: 1 })
    expect(() => validate(configWithFragments({ ra: 2, bee: 1 }))).toThrow(/ra: 2\/3/)
  })
})
