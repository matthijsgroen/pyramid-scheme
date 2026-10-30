import { describe, expect, it } from "vitest"
import { drawnSketch } from "../carveFixtures"
import type { Cell } from "../state"
import { floorGraph, type EmbedRoom } from "./graph"
import { layoutFloor, needOf, type Layout } from "./layout"

const opts = { seed: 1, spread: 0.5, straightness: 0.3 }

// prettier-ignore
const FOUR_SIDES = [
  "    S   S",
  "    .   .",
  "E.S.F.S.F.S.T",
  "    .   .",
  "    S.S S",
]

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1)

const laid = (rows: string[], seed: number, extra: Partial<typeof opts> = {}): Layout => {
  const layout = layoutFloor(floorGraph(drawnSketch(rows), new Map()), { ...opts, seed, ...extra })
  if ("refused" in layout) throw new Error(layout.refused)
  return layout
}

/** The cells strictly between a polyline's first and last corner. */
const between = (corners: readonly Cell[]): number =>
  corners.slice(1).reduce((sum, [r, c], i) => sum + Math.abs(r - corners[i][0]) + Math.abs(c - corners[i][1]), 0) - 1

describe("layoutFloor", () => {
  it("compaction never leaves a string shorter than its nodes need", () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const layout = laid(FOUR_SIDES, seed, { spread: 1 })
      layout.graph.strings.forEach((s, i) => {
        const rings = (key: string) => (layout.graph.pieces.get(key)!.kind === "room" ? 1 : 0)
        expect(between(layout.strings[i].corners) + rings(s.a) + rings(s.b)).toBeGreaterThanOrEqual(needOf(s, 0, 0))
      })
    }
  })

  it("the same seed lays out the same; another seed moves pieces, not the graph", () => {
    const graph = floorGraph(drawnSketch(FOUR_SIDES), new Map())
    const one = layoutFloor(graph, { ...opts, seed: 7 })
    expect(layoutFloor(graph, { ...opts, seed: 7 })).toEqual(one)
    const other = layoutFloor(graph, { ...opts, seed: 8 }) as Layout
    expect(other.strings).not.toEqual((one as Layout).strings)
    expect(other.graph).toBe(graph)
  })

  it("a floor that cannot be laid out is refused, naming the node", () => {
    // A designed room whose only door place lies in no line with its node: no way out of it is ever free.
    const room: EmbedRoom = { rows: 4, cols: 4, node: [1, 1], doors: { w: [0, 0] } }
    const layout = layoutFloor(floorGraph(drawnSketch(["E.R"]), new Map([["0,2", room]])), opts)
    expect(layout).toEqual({ refused: "no room for the piece at 0,2" })
  })
})
