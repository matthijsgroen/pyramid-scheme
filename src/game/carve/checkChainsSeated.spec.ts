import { describe, expect, it } from "vitest"
import { checkChainsSeated } from "./checkChainsSeated"
import { diamond, freshState, leverOpening, noLabels, plainFloor, prepOf } from "./carveFixtures"
import type { Cell, Chain } from "./state"

describe("checkChainsSeated", () => {
  const prep = prepOf(
    plainFloor({
      regionLayout: diamond,
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
      obstacles: [{ id: "bars", kind: "gate", at: { on: "connection", between: ["rightLower", "s1Chamber"] } }],
      controls: [leverOpening(["bars"], "lever", "entrance")],
    })
  )
  const chain: Chain = {
    section: prep.sections.sideSections[0],
    cells: Array.from({ length: 4 }, (_, i): Cell => [2 + 2 * i, 0]),
    attachedAt: [0, 0],
    positional: "s0",
    idx: 0,
    doors: [],
    hidden: false,
    keyHostColors: [],
  }
  const checked = (regions: string[], at: Map<string, { idx: number; cellIndex: number }>) => {
    const labels = noLabels()
    regions.forEach((region, i) => labels.region.set(`${i},0`, region))
    return checkChainsSeated(prep, {
      ...freshState(prep),
      lay: null,
      labels,
      chainGates: { at },
      keys: { chains: [chain], hostColors: new Map() },
      seamGates: new Map(),
      runGates: new Map(),
    })
  }
  const every = diamond.regions.map(r => r.name)

  it("holds where every region took a cell and every off-route gate stands short of its chain's end", () => {
    expect(checked(every, new Map([["bars", { idx: 0, cellIndex: 2 }]]))).toBeUndefined()
  })

  it("retries naming each declared region no cell took", () => {
    expect(checked(["entrance", "leftLower", "out"], new Map())).toEqual({
      retry: [{ type: "regionNotSeated", regions: ["rightLower", "s1Chamber"] }],
    })
  })

  it("retries naming an off-route gate its chain gave no seam, as one that yields to a short run", () => {
    expect(checked(every, new Map())).toEqual({
      retry: [{ type: "obstacleSeamNotCarved", ids: ["bars"], onChain: true }],
    })
  })

  it("retries, naming nothing, where a gate stands on its chain's end room", () => {
    expect(checked(every, new Map([["bars", { idx: 0, cellIndex: 3 }]]))).toEqual({ retry: [] })
  })
})
