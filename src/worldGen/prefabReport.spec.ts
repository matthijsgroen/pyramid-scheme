import { describe, expect, it } from "vitest"
import type { FloorGrid } from "@/game/siteTypes"
import { describePrefabTally, prefabTallyByTier } from "./prefabReport"
import type { SiteConfig } from "./types"

const laid = { name: "hall" }
const room = (prefab: boolean, pinned = false) => ({
  type: "room",
  ...(prefab ? { prefabRoom: laid } : {}),
  ...(pinned ? { pinnedPrefab: "hall" } : {}),
})
const corridorEnd = { type: "corridor", prefabRoom: laid }
const gridOf = (...cells: object[]) => ({ cells: [cells] }) as unknown as FloorGrid
const floor = (difficulty: string) => ({ difficulty }) as unknown as SiteConfig[number]

describe(prefabTallyByTier, () => {
  it("counts the prefab rooms laid per tier, rooms and corridor ends alike, and the pinned among them", () => {
    const configs = { j: [[floor("junior"), floor("expert")], [floor("junior")]] }
    const grids = [
      gridOf(room(true), room(true, true), room(false), corridorEnd, { type: "empty" }),
      gridOf(room(false)),
      gridOf(room(true, true)),
    ]
    const tally = prefabTallyByTier(configs, (_journey, levelNr, floorIndex) => grids[levelNr === 1 ? floorIndex : 2])
    expect(tally.junior).toEqual({ placed: 4, pinned: 2 })
    expect(tally.expert).toEqual({ placed: 0, pinned: 0 })
    expect(tally.starter).toEqual({ placed: 0, pinned: 0 })
  })

  it("prints every tier on one line", () => {
    const none = { placed: 0, pinned: 0 }
    const line = describePrefabTally({
      starter: { placed: 3, pinned: 1 },
      junior: none,
      expert: none,
      master: none,
      wizard: none,
    })
    expect(line).toBe(
      "  Prefab rooms: starter 3 placed (1 pinned), junior 0 placed (0 pinned), expert 0 placed (0 pinned), " +
        "master 0 placed (0 pinned), wizard 0 placed (0 pinned)"
    )
  })
})
