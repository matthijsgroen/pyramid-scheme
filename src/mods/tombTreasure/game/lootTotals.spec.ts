import { describe, expect, it } from "vitest"
import { tombTreasureLootTotals } from "./lootTotals"
import { allTreasures, keyIdByTreasureId } from "./treasures"
import { WORLD_TARGETS } from "@/worldGen/worldSpec"
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

describe("tombTreasureLootTotals", () => {
  const keyA = keyIdByTreasureId[allTreasures[0].id]
  const keyB = keyIdByTreasureId[allTreasures[1].id]
  const row = (rows: ReturnType<typeof tombTreasureLootTotals>, label: string) => rows.find(r => r.label === label)!

  it("counts map pieces wherever they lie against the world's target", () => {
    const rows = tombTreasureLootTotals(world({ type: "mapPiece", tombId: "t" }))
    expect(row(rows, "Map pieces")).toEqual({ label: "Map pieces", found: 5, needed: WORLD_TARGETS.mapPieceRewards })
    expect(row(rows, "Tomb treasures").found).toBe(0)
  })

  it("counts distinct placed tomb treasures against the catalogue", () => {
    const rows = tombTreasureLootTotals(world({ type: "tombKey", keyId: keyA }))
    expect(row(rows, "Tomb treasures")).toEqual({ label: "Tomb treasures", found: 1, needed: allTreasures.length })
    expect(row(rows, "Map pieces").found).toBe(0)
  })

  it("counts the ward gates whose key a placed treasure grants against all ward gates", () => {
    const rows = tombTreasureLootTotals({
      a: [
        [
          floor({
            mainEndReward: { type: "tombKey", keyId: keyA },
            sideSections: [
              side({ gate: { type: "tomb-key", wardKeyId: keyA } }),
              side({
                gate: { type: "tomb-key", wardKeyId: keyB },
                sideSections: [sub({ gate: { type: "tomb-key", wardKeyId: keyA } })],
              }),
              side({ gate: { type: "floor-key" } }),
            ],
          }),
        ],
      ],
    })
    expect(row(rows, "Ward gates with their key")).toEqual({ label: "Ward gates with their key", found: 2, needed: 3 })
  })
})
