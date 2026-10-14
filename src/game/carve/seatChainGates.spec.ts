import { describe, expect, it } from "vitest"
import { diamond, freshState, leverOpening, plainFloor, prepOf } from "./carveFixtures"
import { seatChainGates } from "./seatChainGates"
import type { Cell, Chain } from "./state"

const gate = (id: string) => ({
  id,
  kind: "gate" as const,
  at: { on: "connection" as const, between: ["rightLower", "s1Chamber"] as [string, string] },
})
const diamondWith = (ids: string[]) =>
  prepOf(
    plainFloor({
      regionLayout: diamond,
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
      obstacles: ids.map(gate),
      barrierOrder: ids.length > 1 ? [{ between: ["rightLower", "s1Chamber"], barriers: ids }] : [],
      controls: [leverOpening(ids, "lever", "entrance")],
    })
  )

describe("seatChainGates", () => {
  const seated = (ids: string[], length: number) => {
    const prep = diamondWith(ids)
    const chain: Chain = {
      section: prep.sections.sideSections[0],
      cells: Array.from({ length }, (_, i): Cell => [2 + 2 * i, 0]),
      attachedAt: [0, 0],
      positional: "s0",
      idx: 0,
      doors: [],
      hidden: false,
      keyHostColors: [],
    }
    const state = { ...freshState(prep), lay: null, keys: { chains: [chain], hostColors: new Map() } }
    seatChainGates(prep, state)
    return state.chainGates!
  }

  it("stands an off-route gate on the chain's first cell of the far region", () => {
    expect(seated(["bars"], 4)).toEqual({ at: new Map([["bars", { idx: 0, cellIndex: 2 }]]) })
  })

  it("notes a run short where its chain leaves no later cell of the far region before the end room", () => {
    expect(seated(["bars", "grille"], 4)).toEqual({
      at: new Map(),
      runShort: { between: ["rightLower", "s1Chamber"], barriers: ["bars", "grille"] },
    })
  })
})
