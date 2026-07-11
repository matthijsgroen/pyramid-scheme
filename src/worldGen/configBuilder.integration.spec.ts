import { describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { WORLD_TARGETS } from "./worldSpec"
import type { FloorConfig, SiteConfig, TreasureReward } from "./types"

// Golden guard for the world-builder refactor: buildConfigs() must keep
// producing the same reward counts and the same output on every run.

const countRewards = (configs: Record<string, SiteConfig[]>) => {
  let mapPieces = 0
  let mosaicPieces = 0

  const count = (r: TreasureReward | undefined) => {
    if (!r) return
    if (r.type === "mapPiece") mapPieces++
    if (r.type === "mosaicPiece") mosaicPieces++
  }

  const countFloor = (floor: FloorConfig) => {
    count(floor.mainEndReward)
    for (const s of floor.sideSections) {
      count(s.endReward)
      for (const sub of s.sideSections ?? []) count(sub.endReward)
    }
  }

  for (const siteConfigs of Object.values(configs)) {
    for (const floors of siteConfigs) {
      for (const floor of floors) countFloor(floor)
    }
  }

  return { mapPieces, mosaicPieces }
}

describe("buildConfigs golden guard", () => {
  it("hits WORLD_TARGETS exactly", () => {
    const configs = buildConfigs()
    expect(countRewards(configs)).toEqual({
      mapPieces: WORLD_TARGETS.mapPieceRewards,
      mosaicPieces: WORLD_TARGETS.mosaicPieceRewards,
    })
  }, 20000)

  it("is deterministic across runs", () => {
    const first = buildConfigs()
    const second = buildConfigs()
    expect(second).toEqual(first)
  }, 20000)
})

describe("tomb floor linking — ward-path shortcuts", () => {
  const configs = buildConfigs()
  const floors = configs.junior_treasure_tomb[0]

  it("every floor's main path ends in a real exit, not an auto-chained stairhead", () => {
    for (const floor of floors) expect(floor.exitOrStaircase).toBe("exit")
  })

  it("every non-last floor has a ward-path shortcut gated by that floor's own key", () => {
    for (let i = 0; i < floors.length - 1; i++) {
      const shortcut = floors[i].sideSections.find(s => s.gate?.type === "tomb-key")
      expect(shortcut).toBeDefined()
      expect(shortcut!.gate).toEqual({
        type: "tomb-key",
        wardKeyId: (floors[i].mainEndReward as { keyId: string }).keyId,
      })
      expect(typeof shortcut!.end).toBe("object")
    }
  })

  it("the last floor has no ward-path shortcut", () => {
    const last = floors[floors.length - 1]
    expect(last.sideSections.some(s => s.gate?.type === "tomb-key")).toBe(false)
  })

  it("wires each floor's entrance to the previous floor's shortcut stairId", () => {
    for (let i = 0; i < floors.length - 1; i++) {
      const shortcut = floors[i].sideSections.find(s => s.gate?.type === "tomb-key")!
      expect(floors[i + 1].entrance).toEqual(shortcut.end)
    }
  })
})
