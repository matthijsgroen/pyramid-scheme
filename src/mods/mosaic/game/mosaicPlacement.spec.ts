import { describe, it, expect } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { FloorConfig, SubSection, TreasureReward } from "@/worldGen/types"
import { MOSAIC_STEPS_BY_TIER, MOSAIC_TIERS, type MosaicTier } from "./mosaicCurrency"

// The five pools, checked over the SHIPPED world rather than in the abstract: a mosaic piece
// found on a floor of difficulty X belongs to register X, so the starter panel is the record of
// the starter paths. If placement ever hands a pool a node of another tier, a player's find would
// light up the wrong scene.

type Found = { tier: string; difficulty: string; where: string }

const isMosaic = (r: TreasureReward | undefined): r is TreasureReward & { tier: string } => r?.type === "mosaicPiece"

const collect = (): Found[] => {
  const found: Found[] = []
  const take = (rewards: (TreasureReward | undefined)[] | undefined, difficulty: string, where: string) => {
    for (const r of rewards ?? []) if (isMosaic(r)) found.push({ tier: r.tier, difficulty, where })
  }
  const walkSection = (s: SubSection, where: string) => {
    take([s.endReward], s.difficulty, where)
    take(s.rewards, s.difficulty, where)
  }

  for (const [siteId, siteConfigs] of Object.entries(generatedWorldConfigs)) {
    for (const floors of siteConfigs) {
      floors.forEach((floor: FloorConfig, fi: number) => {
        const where = `${siteId}#${fi}`
        take([floor.mainEndReward], floor.difficulty, where)
        take(floor.rewards, floor.difficulty, where)
        for (const s of floor.sideSections) {
          walkSection(s, `${where} side`)
          for (const sub of s.sideSections ?? []) walkSection(sub, `${where} sub`)
        }
      })
    }
  }
  return found
}

describe("mosaic placement (over the generated world)", () => {
  const found = collect()

  it("puts every piece on a path of its own difficulty", () => {
    const wrong = found.filter(f => f.tier !== f.difficulty)
    expect(
      wrong,
      `${wrong.length} mosaic piece(s) on the wrong difficulty. First few: ` +
        wrong
          .slice(0, 5)
          .map(w => `${w.where} holds ${w.tier} glass on a ${w.difficulty} path`)
          .join("; ")
    ).toEqual([])
  })

  it("places exactly each register's worth of glass", () => {
    const counted = Object.fromEntries(MOSAIC_TIERS.map(t => [t, found.filter(f => f.tier === t).length])) as Record<
      MosaicTier,
      number
    >
    expect(counted).toEqual(MOSAIC_STEPS_BY_TIER)
  })
})
