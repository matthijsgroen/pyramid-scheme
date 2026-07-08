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
    for (const r of floor.chestRewards ?? []) count(r)
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
  })

  it("is deterministic across runs", () => {
    const first = buildConfigs()
    const second = buildConfigs()
    expect(second).toEqual(first)
  })
})
