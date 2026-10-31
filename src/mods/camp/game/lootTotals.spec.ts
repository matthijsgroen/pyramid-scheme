import { describe, expect, it } from "vitest"
import type { FloorConfig, SideSection, SiteConfig, SubSection, TreasureReward } from "@/worldGen/types"
import type { CampStepTable } from "./campSteps"
import { campDemand } from "./campSteps"
import { makeCampLootTotals } from "./lootTotals"

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

const table: CampStepTable = [
  { id: "cup", spot: "fire", tier: "starter", source: "found" },
  { id: "bowl", spot: "fire", tier: "master", source: "found" },
  { id: "ring", spot: "fire", tier: "starter", source: "structure", parts: ["stones", "sand"] },
  { id: "flag", spot: "fire", tier: "master", source: "bought" },
]

const find: TreasureReward = { type: "campFind", step: "cup" }
const part: TreasureReward = { type: "campPart", structure: "ring", part: "sand" }
const other: TreasureReward = { type: "somethingElse" }

// A find and a part on a puzzle, a chest, a path end, a sub-section and shop stock, plus rewards to ignore.
const world: Record<string, SiteConfig[]> = {
  a: [
    [
      floor({
        rewards: [find, part, other],
        mainEndReward: find,
        sideSections: [
          side({ rewards: [other], endReward: part, sideSections: [sub({ rewards: [find], endReward: part })] }),
          side({ encounter: "fez-shop", rewards: [find, undefined, part] }),
        ],
      }),
    ],
  ],
}

describe("makeCampLootTotals", () => {
  it("counts camp finds and parts wherever they lie, against the table's demand", () => {
    const demand = campDemand(table)
    expect(makeCampLootTotals(table)(world)).toEqual([
      { label: "Camp finds", found: 4, needed: demand.starter.finds + demand.master.finds },
      { label: "Structure parts", found: 4, needed: demand.starter.parts + demand.master.parts },
    ])
  })

  it("counts nothing in a world without camp loot", () => {
    const [finds, parts] = makeCampLootTotals(table)({ a: [[floor({ rewards: [other] })]] })
    expect([finds.found, parts.found]).toEqual([0, 0])
  })
})
