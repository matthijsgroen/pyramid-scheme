import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { PYRAMID_JOURNEYS } from "./data"
import type { SiteConfig, SideSection } from "./types"

// Guards against a hieroglyph tier's fragments front-loading onto its first one or two
// pyramid journeys again (junior_1+junior_2 used to hold 74% of junior's 39 fragments — see
// hieroglyphCurrency.ts's rank tie-break + this tier's own PathEntry `ramp`, sideSections.ts).
// Walks the real generated world rather than re-deriving counts, so it catches a regression in
// either mechanism (the rank tie-break OR the authored ramp) however it happens.

const countFragments = (siteConfigs: SiteConfig[]): number => {
  let count = 0
  const walk = (s: SideSection) => {
    if (s.endReward?.type === "hieroglyphFragment") count++
    for (const r of s.rewards ?? []) if (r?.type === "hieroglyphFragment") count++
    for (const sub of s.sideSections ?? []) walk(sub)
  }
  for (const floors of siteConfigs) {
    for (const floor of floors) {
      if (floor.mainEndReward?.type === "hieroglyphFragment") count++
      for (const r of floor.rewards ?? []) if (r?.type === "hieroglyphFragment") count++
      for (const s of floor.sideSections) walk(s)
    }
  }
  return count
}

const journeysByTier = new Map<string, string[]>()
for (const j of PYRAMID_JOURNEYS) {
  const ids = journeysByTier.get(j.tier) ?? []
  ids.push(j.id)
  journeysByTier.set(j.tier, ids)
}

describe("hieroglyph fragments ramp up within a tier instead of front-loading", () => {
  for (const [tier, journeyIds] of journeysByTier) {
    const counts = journeyIds.map(id => countFragments(generatedWorldConfigs[id]))
    const total = counts.reduce((a, b) => a + b, 0)
    const thirdSize = Math.max(1, Math.floor(journeyIds.length / 3))
    const firstThird = counts.slice(0, thirdSize).reduce((a, b) => a + b, 0)
    const lastThird = counts.slice(-thirdSize).reduce((a, b) => a + b, 0)

    it(`${tier}: its later journeys hold at least as many fragments as its earliest ones`, () => {
      expect(
        lastThird,
        `${tier} journeys/counts: ${JSON.stringify(journeyIds.map((id, i) => [id, counts[i]]))}`
      ).toBeGreaterThanOrEqual(firstThird)
    })

    it(`${tier}: no single journey hoards more than half its tier's fragments`, () => {
      const max = Math.max(...counts)
      expect(
        max / total,
        `${tier} journeys/counts: ${JSON.stringify(journeyIds.map((id, i) => [id, counts[i]]))}`
      ).toBeLessThanOrEqual(0.5)
    })
  }
})
