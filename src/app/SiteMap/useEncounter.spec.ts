// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { registerFamily } from "@/app/families/familyRegistry"
import { useEncounter } from "./useEncounter"

// No mod app entrypoints are imported here on purpose: with an empty family registry every room
// reads as "family missing", which is the pass-through path this spec pins down. A room's own puzzle
// belongs to its family's plugin, not to core.
const gridOf = (cells: GridCell[]): FloorGrid => ({
  cells: [cells],
  rows: 1,
  cols: cells.length,
  entrancePos: [0, 0],
  exitPos: [0, cells.length - 1],
  siteId: "test-site",
  staircases: {},
})

const setup = (cells: GridCell[], floorDifficulty: Difficulty = "starter") => {
  const journeys = { markCellExplored: vi.fn() } as unknown as JourneyAPI
  const onReward = vi.fn()
  const hook = renderHook(() =>
    useEncounter({
      journeys,
      journeyId: "j1",
      levelNr: 1,
      currentFloor: 0,
      difficulty: floorDifficulty,
      grid: gridOf(cells),
      ownedKeys: new Set<string>(),
      onReward,
    })
  )
  return { hook, journeys, onReward }
}

// The section and the walk step the assembler gives every cell, because a write is filed under
// `${sectionHash}#${floor}/${slot}` now (cellIdentity.ts) — without them this would test the fallback.
const SECTION = "sec"
const emptyRoom: GridCell = {
  type: "room",
  roomType: "encounter",
  dirs: new Set(["e"]),
  state: "reachable",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "0",
  pathIndex: 0,
}
const ROOM_ADDRESS = `${SECTION}#0/p0`

// The one exception to the empty-registry rule above: a room whose family IS registered stays open,
// which is the only way to read the context core hands that family.
const STUB_FAMILY = "stub"
registerFamily({
  meta: { id: STUB_FAMILY, ownerMod: "test", tags: ["puzzle"], icon: "", color: "", rewardPriority: 0 },
  generate: () => null,
  Component: () => null,
})
const stubRoom: GridCell = { ...emptyRoom, family: STUB_FAMILY }

// A family whose generator cannot build its board. There is one in the wild — see the crash this spec
// was written for — and no reproduction of it, which is the whole reason the room has to be named.
const BROKEN_FAMILY = "broken"
registerFamily({
  meta: { id: BROKEN_FAMILY, ownerMod: "test", tags: ["puzzle"], icon: "", color: "", rewardPriority: 0 },
  generate: () => {
    throw new Error("star battle: no board for size 8 at regionLine")
  },
  Component: () => null,
})
const brokenRoom: GridCell = { ...emptyRoom, family: BROKEN_FAMILY, difficulty: "expert", boardIndex: 4 }

describe("useEncounter", () => {
  it("names the room when a board cannot be built, since the message alone names no room", () => {
    // The generator says which CONFIGURATION failed. A configuration that builds everywhere it is swept
    // is a dead end — what is needed is the cell, so the next report is a coordinate.
    const { hook } = setup([brokenRoom])

    expect(() => act(() => hook.result.current.open([0, 0], true))).toThrow(
      /no board for size 8 at regionLine — journey=j1 edge=0:0,0 family=broken tier=expert board=4/
    )
  })

  it("resolves a room whose family isn't registered, so a toggled-off mod can't strand the player", () => {
    const { hook, journeys } = setup([emptyRoom])

    act(() => hook.result.current.open([0, 0], true))

    expect(journeys.markCellExplored).toHaveBeenCalledWith(SECTION, "0:0,0", ROOM_ADDRESS)
    expect(hook.result.current.isOpen).toBe(false)
  })

  it("hands a solved room's loot on for offering, keyed to the room it came from", () => {
    const { hook, onReward } = setup([{ ...emptyRoom, reward: { type: "consumable", itemId: "bandage" } }])

    act(() => hook.result.current.open([0, 0], true))

    expect(onReward).toHaveBeenCalledWith({ type: "consumable", itemId: "bandage" }, ROOM_ADDRESS, undefined)
  })

  it("says which key a coloured chest held, so the reveal names the door it opens", () => {
    const { hook, onReward } = setup([{ ...emptyRoom, reward: { type: "tombKey", keyId: "k1" }, keyColor: "blue" }])

    act(() => hook.result.current.open([0, 0], true))

    expect(onReward.mock.calls[0][2]).toEqual(["blue"])
  })

  it("doesn't announce a key for a coloured chest holding something else", () => {
    const { hook, onReward } = setup([
      { ...emptyRoom, reward: { type: "consumable", itemId: "bandage" }, keyColor: "blue" },
    ])

    act(() => hook.result.current.open([0, 0], true))

    expect(onReward.mock.calls[0][2]).toBeUndefined()
  })

  // A section authored at its own tier is the point of authoring it: a starter pocket on a wizard
  // floor has to hand its family a starter board, or the pocket is only gentle on paper.
  it("builds a room at its own section's tier where the cell carries one", () => {
    const { hook } = setup([{ ...stubRoom, difficulty: "starter" }], "wizard")

    act(() => hook.result.current.open([0, 0], true))

    expect(hook.result.current.ctx?.difficulty).toBe("starter")
  })

  it("falls back to the floor's tier for a room that carries none", () => {
    const { hook } = setup([stubRoom], "wizard")

    act(() => hook.result.current.open([0, 0], true))

    expect(hook.result.current.ctx?.difficulty).toBe("wizard")
  })

  // A room its family keeps re-enterable is solved again on every visit, and the loot it held was
  // handed over on the visit that finished it.
  it("offers no second helping of loot in a room already finished", () => {
    const { hook, onReward } = setup([
      { ...emptyRoom, state: "completed", reward: { type: "consumable", itemId: "bandage" } },
    ])

    act(() => hook.result.current.open([0, 0], true))

    expect(onReward).not.toHaveBeenCalled()
  })

  it("offers nothing for an empty room, while still marking it explored", () => {
    const { hook, journeys, onReward } = setup([emptyRoom])

    act(() => hook.result.current.open([0, 0], true))

    expect(journeys.markCellExplored).toHaveBeenCalled()
    expect(onReward).not.toHaveBeenCalled()
  })
})
