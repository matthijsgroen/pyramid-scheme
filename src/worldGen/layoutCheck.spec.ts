import { describe, expect, it } from "vitest"
import { assembleFloor } from "../game/siteAssembler"
import type { FloorConfig as GameFloorConfig, FloorGrid } from "../game/siteTypes"
import { gridShape, layoutKey, layoutMoved } from "./layoutCheck"
import type { SiteConfig } from "./types"

const SEEDS = Array.from({ length: 40 }, (_, n) => (n + 1) * 7919)

const carveAt = (config: GameFloorConfig): FloorGrid | null => {
  const result = assembleFloor("made_up", config, 1)
  return result.success ? result.grid : null
}

/** The floor pinned at the first seed that carves it. */
const pinned = (config: GameFloorConfig): GameFloorConfig => {
  const seed = SEEDS.find(s => carveAt({ ...config, seed: s }) !== null)
  if (seed === undefined) throw new Error("no seed carves the made-up floor")
  return { ...config, seed }
}

const withPlaceholders = (): GameFloorConfig => ({
  pathPuzzles: 3,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  mainEndReward: { type: "fragmentSlot" },
  sideSections: [
    { pathPuzzles: 1, difficulty: "starter", end: "treasure", endReward: { type: "fragmentSlot" } },
    {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      gate: { type: "floor-key" },
      endReward: { type: "fragmentSlot" },
    },
  ],
})

const withRewards = (floor: GameFloorConfig): GameFloorConfig => ({
  ...floor,
  mainEndReward: { type: "mosaicPiece", tier: "starter" },
  sideSections: floor.sideSections.map(s => ({ ...s, endReward: { type: "mosaicPiece", tier: "starter" } })),
})

const worldOf = (floor: GameFloorConfig): Record<string, SiteConfig[]> => ({ made_up: [[floor]] })
const carveFloor = (_j: string, _l: number, _f: number, config: GameFloorConfig) => carveAt(config)

describe(gridShape, () => {
  it("a placed reward moves no wall", () => {
    const floor = pinned(withPlaceholders())
    expect(gridShape(carveAt(withRewards(floor))!)).toBe(gridShape(carveAt(floor)!))
  })

  it("differs between two seeds that carve the floor differently", () => {
    const shapes = new Set(
      SEEDS.map(seed => carveAt({ ...withPlaceholders(), seed }))
        .filter((grid): grid is FloorGrid => grid !== null)
        .map(gridShape)
    )
    expect(shapes.size).toBeGreaterThan(1)
  })
})

describe(layoutMoved, () => {
  const pickedFor = (floor: GameFloorConfig) => new Map([[layoutKey("made_up", 1, 0), gridShape(carveAt(floor)!)]])

  it("names nothing when the loot placed after the pick moves no wall", () => {
    const floor = pinned(withPlaceholders())
    expect(layoutMoved(pickedFor(floor), worldOf(withRewards(floor)), carveFloor)).toEqual([])
  })

  it("an end that loses its reward after the pick is named", () => {
    const floor = pinned(withPlaceholders())
    const emptied = {
      ...floor,
      sideSections: [{ ...floor.sideSections[0], endReward: undefined }, floor.sideSections[1]],
    }
    expect(layoutMoved(pickedFor(floor), worldOf(emptied), carveFloor)).toEqual([
      "made_up level 1 floor 0: the loot placed after the layout moved a wall",
    ])
  })

  it("layoutMoved carves afresh", () => {
    const floor = pinned(withPlaceholders())
    const other = SEEDS.map(seed => carveAt({ ...floor, seed })).find(
      grid => grid !== null && gridShape(grid) !== gridShape(carveAt(floor)!)
    )!
    let carves = 0
    const moved = layoutMoved(pickedFor(floor), worldOf(floor), () => {
      carves++
      return other
    })
    expect(carves).toBe(1)
    expect(moved).toEqual(["made_up level 1 floor 0: the loot placed after the layout moved a wall"])
  })

  it("names a floor that has no picked layout, and one that no longer carves", () => {
    const floor = pinned(withPlaceholders())
    expect(layoutMoved(new Map(), worldOf(floor), carveFloor)).toEqual([
      "made_up level 1 floor 0: no layout was picked",
    ])
    expect(layoutMoved(pickedFor(floor), worldOf(floor), () => null)).toEqual([
      "made_up level 1 floor 0: no longer carves after the loot was placed",
    ])
  })
})
