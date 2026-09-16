import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig, FloorGrid, SideSection } from "@/game/siteTypes"
import { useAssembledFloor } from "./useAssembledFloor"
import { cellKey, cellSlot } from "./cellIdentity"
import "@/mods/registerModApps"

/**
 * WHAT AN AUTHORING CHANGE COSTS A PLAYER, asserted rather than claimed.
 *
 * The table in docs/game-design/world-spec-stability.md says which settings a floor's author can
 * change freely and which take progress away. Every row of it is a promise about this code, and prose
 * cannot hold a promise — so each row is a case below: author a floor, walk all of it, re-author it,
 * and ask which rooms come back explored.
 *
 * A room coming back explored is also a room coming back LOOTED — a chest is remembered by nothing but
 * its explored entry — so these cases are the loot contract as much as the exploration one.
 */

const SEED = 8110
const JOURNEY = "authoring-cost"

const side = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 2,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})

const floorWith = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 4,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [side()],
  ...overrides,
})

const assemble = (config: FloorConfig): FloorGrid => {
  const result = assembleFloor(JOURNEY, config, SEED)
  if (!result.success) throw new Error(`did not assemble: ${JSON.stringify(result.reasons)}`)
  return result.grid
}

/** The save of a player who has walked every cell of this floor. */
const walkedItAll = (config: FloorConfig): Record<string, string[]> => {
  const grid = assemble(config)
  const save: Record<string, string[]> = {}
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      const key = cellKey(grid, 0, r, c)
      if (cell.type === "empty" || !key) return
      const section = cell.sectionAddress ?? ""
      save[section] = [...(save[section] ?? []), key]
    })
  )
  return save
}

/** Every room of `config` as `${sectionAddress}/${slot}`, split by whether that save restores it. */
const roomsAfter = (config: FloorConfig, save: Record<string, string[]>) => {
  const { result } = renderHook(() => useAssembledFloor(JOURNEY, config, SEED, 0, save, null, 0, new Set()))
  const grid = result.current.grid
  if (!grid) throw new Error("no grid")

  const explored: string[] = []
  const unexplored: string[] = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      const slot = cellSlot(grid, r, c)
      if (cell.type === "empty" || !slot) return
      const name = `${cell.sectionAddress}/${slot}`
      ;(cell.state === "completed" ? explored : unexplored).push(name)
    })
  )
  return { explored: explored.sort(), unexplored: unexplored.sort() }
}

/** Re-author a floor and report what the walk-it-all save gets back. */
const cost = (before: FloorConfig, after: FloorConfig) => roomsAfter(after, walkedItAll(before))

describe("what re-authoring a floor costs a player", () => {
  it("proves the premise: walking it all leaves nothing unexplored", () => {
    const config = floorWith()

    expect(cost(config, config).unexplored).toEqual([])
  })

  // The row this whole change exists for. These two re-carve the floor end to end.
  it("costs nothing when the carve knobs are retuned", () => {
    const { unexplored } = cost(floorWith(), floorWith({ packing: 1.6, corridorStraightness: 0.2 }))

    expect(unexplored).toEqual([])
  })

  it("costs nothing when a difficulty is retuned", () => {
    const { unexplored } = cost(floorWith(), floorWith({ difficulty: "expert" }))

    expect(unexplored).toEqual([])
  })

  it("costs only the rooms added when a chain grows", () => {
    const { explored, unexplored } = cost(floorWith({ pathPuzzles: 4 }), floorWith({ pathPuzzles: 6 }))

    expect(unexplored).toEqual(["main/p4", "main/p5"])
    expect(explored).toContain("main/p0")
    expect(explored).toContain("main/p3")
  })

  it("costs nothing when a chain shrinks — the rooms that remain are the rooms that were walked", () => {
    const { unexplored } = cost(floorWith({ pathPuzzles: 6 }), floorWith({ pathPuzzles: 4 }))

    expect(unexplored).toEqual([])
  })

  it("costs only the gate room when a ward gate is added", () => {
    const { explored, unexplored } = cost(
      floorWith(),
      floorWith({ sideSections: [side({ gate: { type: "tomb-key", wardKeyId: "ward-1" } })] })
    )

    expect(unexplored).toEqual(["s0/xkey-gate"])
    // The rooms behind the gate are still the player's — they do not have to re-solve the pocket.
    expect(explored).toContain("s0/p0")
    expect(explored).toContain("s0/p1")
  })

  /**
   * A FLOOR-key gate costs more than its own room, and not for a reason the authoring makes obvious: it
   * needs its key somewhere on this same floor, so the assembler grows a section to host one. That
   * section is new ground, and its chest is a chest the player has not opened.
   */
  it("costs the gate room AND the key host a floor-key gate conjures", () => {
    const { explored, unexplored } = cost(
      floorWith(),
      floorWith({ sideSections: [side({ gate: { type: "floor-key" } })] })
    )

    expect(unexplored).toEqual(["s0/xkey-gate", "s1/xtreasure-chest"])
    expect(explored).toContain("s0/p0")
  })

  it("costs only its own rooms when a section is added", () => {
    const { explored, unexplored } = cost(floorWith(), floorWith({ sideSections: [side(), side()] }))

    expect(unexplored.every(room => room.startsWith("s1/"))).toBe(true)
    expect(unexplored.length).toBeGreaterThan(0)
    expect(explored).toContain("s0/p0")
  })

  it("costs nothing when a section is removed — its entries simply go stale", () => {
    const { unexplored } = cost(floorWith({ sideSections: [side(), side()] }), floorWith({ sideSections: [side()] }))

    expect(unexplored).toEqual([])
  })

  /**
   * The hazard a label buys off, stated as a cost rather than as a warning. Inserting a sidepath ahead
   * of an unlabelled one hands the newcomer the old one's address — so the NEW section reads as already
   * explored, and its chest as already emptied, which is the one direction that actually loses loot.
   */
  it("hands an inserted sidepath its neighbour's progress, while the unlabelled ones are positional", () => {
    const { explored } = cost(floorWith({ sideSections: [side()] }), floorWith({ sideSections: [side(), side()] }))

    // `s0` is now the section that was just added, and it came back explored.
    expect(explored).toContain("s0/p0")
  })

  it("keeps a labelled sidepath's progress with the path when one is inserted ahead of it", () => {
    const labelled = side({ label: "burial-antechamber" })
    const { explored, unexplored } = cost(
      floorWith({ sideSections: [labelled] }),
      floorWith({ sideSections: [side(), labelled] })
    )

    // The labelled path kept what was walked; only the genuinely new path is unexplored.
    expect(explored).toContain("burial-antechamber/p0")
    expect(unexplored.every(room => room.startsWith("s0/"))).toBe(true)
    expect(unexplored.length).toBeGreaterThan(0)
  })
})
