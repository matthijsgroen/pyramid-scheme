import { describe, expect, it } from "vitest"
import { findEmptyChests } from "./validate"
import type { SiteConfig } from "./types"
import { plainFloor } from "@/game/carve/carveFixtures"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig, SideSection, TreasureReward } from "@/game/siteTypes"

// Every loot end the carve builds, assembled on made-up floors, and what the bake's guard says of it.
const coin: TreasureReward = { type: "money", amount: 1 }

const assembled = (config: FloorConfig) => {
  const result = assembleFloor("loot-ends", config, 3)
  if (!result.success) throw new Error(JSON.stringify(result.reasons))
  return result.grid
}

const emptyPlaces = (config: FloorConfig) =>
  findEmptyChests({ "made-up": [[config] as unknown as SiteConfig] }, () => assembled(config))
    .map(c => c.place)
    .sort()

const keyHosts = (config: FloorConfig) =>
  assembled(config)
    .cells.flat()
    .filter(c => c.type === "room" && !!c.tags?.includes("treasure") && !!(c.keyColor || c.keyColors?.length)).length

const side = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})

const everyEnd = (reward?: TreasureReward): FloorConfig =>
  plainFloor({
    mainEndReward: reward,
    sideSections: [
      side({ endReward: reward, sideSections: [side({ endReward: reward })] }),
      side({ hidden: true, endReward: reward }),
    ],
  })

describe("the bake's guard over every kind of loot end", () => {
  it("names the main chest, a side end, a sub end and a hidden end when none holds a reward", () => {
    expect(emptyPlaces(everyEnd())).toEqual(["main", "side 1", "side 1.1", "side 2"])
  })

  it("names nothing when every end holds a reward", () => {
    expect(emptyPlaces(everyEnd(coin))).toEqual([])
  })

  it("leaves alone a free treasure end the carve turns into a floor-key host", () => {
    const config = plainFloor({
      mainEndReward: coin,
      sideSections: [side({ pathPuzzles: 0 }), side({ end: "staircase", gate: { type: "floor-key" } })],
    })
    expect(keyHosts(config)).toBe(1)
    expect(emptyPlaces(config)).toEqual([])
  })

  it("leaves alone the key host the carve grows where no free end can take the key", () => {
    const config = plainFloor({
      mainEndReward: coin,
      sideSections: [side({ end: "staircase", gate: { type: "floor-key" } })],
    })
    expect(keyHosts(config)).toBe(1)
    expect(emptyPlaces(config)).toEqual([])
  })

  it("still names a free end the key went past, and a hidden end, which never hosts a key", () => {
    const config = plainFloor({
      mainEndReward: coin,
      sideSections: [
        side({ pathPuzzles: 0 }),
        side({ pathPuzzles: 0 }),
        side({ hidden: true }),
        side({ end: "staircase", gate: { type: "floor-key" } }),
      ],
    })
    expect(keyHosts(config)).toBe(1)
    const named = emptyPlaces(config)
    expect(named).toHaveLength(2)
    expect(named).toContain("side 3")
  })

  it("names a shop whose stock is all empty, and leaves a stocked one alone", () => {
    const shop = (rewards: (TreasureReward | undefined)[]) =>
      plainFloor({
        mainEndReward: coin,
        sideSections: [side({ pathPuzzles: 0, encounter: "fez-shop", rewards })],
      })
    expect(emptyPlaces(shop([undefined, undefined]))).toEqual(["side 1"])
    expect(emptyPlaces(shop([coin, undefined]))).toEqual([])
  })

  it("leaves puzzle rooms without loot alone", () => {
    const config = plainFloor({
      pathPuzzles: 2,
      mainEndReward: coin,
      sideSections: [side({ pathPuzzles: 2, endReward: coin })],
    })
    expect(emptyPlaces(config)).toEqual([])
  })
})
