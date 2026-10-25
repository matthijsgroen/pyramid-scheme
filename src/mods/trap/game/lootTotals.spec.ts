import { describe, expect, it } from "vitest"
import { trapLootTotals } from "./lootTotals"
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

const found = (rows: { label: string; found: number }[], label: string) => rows.find(row => row.label === label)?.found

describe("trapLootTotals", () => {
  it("counts only waterskins, wherever they lie, with no demand", () => {
    const rows = trapLootTotals(world({ type: "waterskin" }))
    expect(rows.reduce((sum, row) => sum + (row.label.startsWith("Waterskins") ? row.found : 0), 0)).toBe(5)
    expect(rows.every(row => row.needed === undefined)).toBe(true)
  })

  it("traps and waterskins are counted per tier", () => {
    const rows = trapLootTotals({
      a: [
        [
          floor({
            difficulty: "expert",
            sideSections: [
              side({ difficulty: "expert", encounter: "trap", pathPuzzles: 4, rewards: [{ type: "waterskin" }] }),
              side({
                difficulty: "master",
                encounter: "arithmetic-reflex",
                pathPuzzles: 3,
                sideSections: [sub({ difficulty: "wizard", encounter: ["clock-reflex"], pathPuzzles: 2 })],
              }),
              side({ difficulty: "master", pathPuzzles: 5, rewards: [{ type: "waterskin" }, { type: "waterskin" }] }),
            ],
          }),
        ],
      ],
    })
    expect(found(rows, "Traps (expert)")).toBe(4)
    expect(found(rows, "Traps (master)")).toBe(3)
    expect(found(rows, "Traps (wizard)")).toBe(2)
    expect(found(rows, "Traps (junior)")).toBe(0)
    expect(found(rows, "Waterskins (expert)")).toBe(1)
    expect(found(rows, "Waterskins (master)")).toBe(2)
    expect(found(rows, "Waterskins (wizard)")).toBe(0)
  })
})
