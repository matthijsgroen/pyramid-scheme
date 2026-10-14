import { describe, expect, it } from "vitest"
import { diamond, freshState, leverOpening, noLabels, plainFloor, prepOf, straightWalk } from "./carveFixtures"
import { makePkey } from "./grid"
import { gateKeyOf } from "./ids"
import { isolate } from "./isolate"
import type { Chain, FloorPrep } from "./state"

const chainOf = (prep: FloorPrep, positional: string, doors: string[], cells: Chain["cells"]): Chain => ({
  section: prep.sections.sideSections[0],
  cells,
  attachedAt: [0, 2],
  positional,
  idx: 0,
  doors,
  hidden: false,
  keyHostColors: [],
})

describe("isolate", () => {
  const prep = prepOf(
    plainFloor({
      regionLayout: diamond,
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
      obstacles: [{ id: "bars", kind: "gate", at: { on: "connection", between: ["rightLower", "s1Chamber"] } }],
      controls: [leverOpening(["bars"], "lever", "entrance")],
    })
  )
  const isolated = (chains: Chain[], regions: [string, string][] = []) => {
    const labels = noLabels()
    for (const [cell, region] of regions) labels.region.set(cell, region)
    const state = {
      ...freshState(prep),
      lay: null,
      maze: straightWalk(3),
      labels,
      keys: { chains, hostColors: new Map() },
    }
    isolate(prep, state)
    return state.doors!
  }
  const pkey = makePkey(7)

  it("holds the main path's steps and every chain's walk as intended edges", () => {
    const { intended } = isolated([
      chainOf(
        prep,
        "s0",
        [],
        [
          [2, 2],
          [4, 2],
        ]
      ),
    ])
    expect(intended).toEqual(new Set([pkey(0, 0, 0, 2), pkey(0, 2, 0, 4), pkey(0, 2, 2, 2), pkey(2, 2, 4, 2)]))
  })

  it("stands a chain's cells behind its own door and every ancestor's, and leaves an open chain ungated", () => {
    const { gated, behind } = isolated([
      chainOf(prep, "s0", [], [[2, 2]]),
      chainOf(prep, "s0.0", ["s0", "s0.0"], [[4, 2]]),
    ])
    expect(gated).toEqual(new Set(["4,2"]))
    expect(behind.get("4,2")).toEqual(new Set(["s0", "s0.0"]))
  })

  it("stands a cell of a gated region behind the gate bounding it, and every region behind its seams", () => {
    const { behind, seamBehind } = isolated(
      [],
      [
        ["2,2", "rightLower"],
        ["4,2", "s1Chamber"],
      ]
    )
    expect(behind.get("4,2")).toEqual(new Set([gateKeyOf(prep.input.floorRef, "bars")]))
    expect(behind.has("2,2")).toBe(false)
    expect(seamBehind.get("4,2")?.size).toBe(2)
  })
})
