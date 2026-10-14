import { describe, expect, it } from "vitest"
import type { SideSection } from "../siteTypes"
import { chainRooms } from "./chainRooms"
import { firstCarved, freshState, noLabels, plainFloor, prepOf, straightWalk } from "./carveFixtures"
import { keyOf } from "./derive"
import type { Cell, Chain } from "./state"

const section = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})

describe("chainRooms", () => {
  it("opens a gated chain on its gate, spreads its puzzles in order and ends on its chest", () => {
    const prep = prepOf(
      plainFloor({ sideSections: [section(), section({ pathPuzzles: 2, gate: { type: "floor-key" } })] })
    )
    const state = firstCarved(prep)
    const gated = state.keys!.chains.find(chain => chain.idx === 1)!
    const rooms = gated.cells.map(cell => state.chainRooms!.get(keyOf(cell)))
    expect(rooms[0]).toMatchObject({ gateVariant: "floor-key", requiredKeyId: gated.keyNodeId })
    expect(rooms.flatMap(room => (room?.pathIndex === undefined ? [] : [room.pathIndex]))).toEqual([0, 1])
    expect(rooms[rooms.length - 1]?.family).toBe("treasure-chest")
  })

  it("retries where a chain has fewer free cells than puzzles", () => {
    const prep = prepOf(plainFloor({ sideSections: [section({ pathPuzzles: 2 })] }))
    const chain: Chain = {
      section: prep.sections.sideSections[0],
      cells: [
        [2, 0],
        [4, 0],
      ] as Cell[],
      attachedAt: [0, 0],
      positional: "s0",
      idx: 0,
      doors: [],
      hidden: false,
      keyHostColors: [],
    }
    const state = {
      ...freshState(prep),
      lay: null,
      maze: straightWalk(3),
      labels: noLabels(),
      keys: { chains: [chain], hostColors: new Map() },
      chainGates: { at: new Map() },
      mainBarrierDoors: new Map(),
    }
    expect(chainRooms(prep, state)).toEqual({ retry: [] })
    expect(state.chainRooms).toBeUndefined()
  })
})
