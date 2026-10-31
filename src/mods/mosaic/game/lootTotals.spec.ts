import { describe, expect, it } from "vitest"
import { mosaicLootTotals } from "./lootTotals"
import { MOSAIC_TOTAL } from "./mosaicCurrency"
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

describe("mosaicLootTotals", () => {
  it("counts only mosaic pieces, wherever they lie, against the registers' steps", () => {
    expect(mosaicLootTotals(world({ type: "mosaicPiece", tier: "expert" }))).toEqual([
      { label: "Mosaic pieces", found: 5, needed: MOSAIC_TOTAL },
    ])
  })

  it("reports none for an empty world", () => {
    expect(mosaicLootTotals({})).toEqual([{ label: "Mosaic pieces", found: 0, needed: MOSAIC_TOTAL }])
  })
})
