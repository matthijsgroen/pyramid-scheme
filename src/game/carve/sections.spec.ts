import { describe, expect, it } from "vitest"
import { plainFloor } from "./carveFixtures"
import { assembleFloor } from "../siteAssembler"
import type { FloorGrid, SideSection, TreasureReward } from "../siteTypes"

const coin: TreasureReward = { type: "money", amount: 1 }

const side = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})

// A floor with one loot end and one floor-key gate, the loot end as placement leaves it.
const floorWithLootEnd = (lootEnd: Partial<SideSection>) =>
  plainFloor({
    mainEndReward: coin,
    sideSections: [side(lootEnd), side({ end: "staircase", gate: { type: "floor-key" } })],
  })

const carved = (lootEnd: Partial<SideSection>): FloorGrid => {
  const result = assembleFloor("loot-end-hosts", floorWithLootEnd(lootEnd), 7)
  if (!result.success) throw new Error(JSON.stringify(result.reasons))
  return result.grid
}

// Every cell's kind and open ways, and where each key lies: the walls and keys a player sees.
const shape = (grid: FloorGrid) =>
  grid.cells.map(row =>
    row.map(cell =>
      cell.type === "room" || cell.type === "corridor"
        ? `${cell.type}:${[...cell.dirs].sort().join("")}:${cell.type === "room" ? (cell.keyColor ?? "") : ""}`
        : cell.type
    )
  )

describe("which ends host a floor key", () => {
  it("carves a loot end placement left empty exactly as the same end with its loot in", () => {
    expect(shape(carved({ lootEnd: true }))).toEqual(shape(carved({ endReward: coin })))
  })

  it("puts the key in an end that is no loot end, which the loot end never gets", () => {
    const keyIn = (grid: FloorGrid) =>
      grid.cells.flat().filter(c => c.type === "room" && c.sectionAddress === "s0" && !!c.keyColor).length
    expect(keyIn(carved({}))).toBe(1)
    expect(keyIn(carved({ lootEnd: true }))).toBe(0)
  })
})
