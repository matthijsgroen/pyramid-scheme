import { describe, expect, it } from "vitest"
import { hieroglyphLootTotals } from "./lootTotals"
import { HIEROGLYPH_REQUIRED } from "./hieroglyphData"
import type { FloorConfig, SideSection, SiteConfig, SubSection, TreasureReward } from "@/worldGen/types"

const floor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})
const side = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 1,
  difficulty: "expert",
  end: "treasure",
  ...overrides,
})
const sub = (overrides: Partial<SubSection> = {}): SubSection => side(overrides)
const other: TreasureReward = { type: "somethingElse" }

// One reward of the mod on a puzzle, a chest, a path end, a sub-section end and shop stock, plus one it must ignore.
const world = (reward: TreasureReward): Record<string, SiteConfig[]> => ({
  a: [
    [
      floor({
        rewards: [reward],
        mainEndReward: reward,
        sideSections: [
          side({ rewards: [other], endReward: reward, sideSections: [sub({ rewards: [reward], endReward: other })] }),
          side({ encounter: "fez-shop", rewards: [reward, undefined, other] }),
        ],
      }),
    ],
  ],
})

describe("hieroglyphLootTotals", () => {
  const [sign] = Object.keys(HIEROGLYPH_REQUIRED)

  it("counts only the fragments of required signs, wherever they lie, against what every sign needs", () => {
    const needed = Object.values(HIEROGLYPH_REQUIRED).reduce((sum, n) => sum + n, 0)
    expect(hieroglyphLootTotals(world({ type: "hieroglyphFragment", hieroglyphId: sign }))).toEqual([
      { label: "Hieroglyph fragments", found: 5, needed },
    ])
  })

  it("ignores a fragment of a sign nothing requires", () => {
    const [row] = hieroglyphLootTotals(world({ type: "hieroglyphFragment", hieroglyphId: "not-a-sign" }))
    expect(row.found).toBe(0)
  })
})
