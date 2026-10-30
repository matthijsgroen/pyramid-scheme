import { describe, expect, it } from "vitest"
import { drawnSketch } from "../carveFixtures"
import type { Cell } from "../state"
import { cellOfKey, floorGraph, type EmbedRoom } from "./graph"
import { layoutFloor, needOf, type Layout } from "./layout"

const opts = { seed: 1, spread: 0.5 }

// prettier-ignore
const FOUR_SIDES = [
  "    S   S",
  "    .   .",
  "E.S.F.S.F.S.T",
  "    .   .",
  "    S.S S",
]
// prettier-ignore
const LOOPED = [
  "E.F.S.S.F.T",
  "  .     .",
  "  S.....S",
]
// prettier-ignore
const STOPS_ONLY = [
  "E.S.S.S",
  "      .",
  "  S.S.S",
]

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1)

const laid = (
  rows: string[],
  extra: Partial<typeof opts> = {},
  rooms: ReadonlyMap<string, EmbedRoom> = new Map()
): Layout => {
  const layout = layoutFloor(floorGraph(drawnSketch(rows), rooms), { ...opts, ...extra })
  if ("refused" in layout) throw new Error(layout.refused)
  return layout
}

/** The cells strictly between a polyline's first and last corner. */
const between = (corners: readonly Cell[]): number =>
  corners.slice(1).reduce((sum, [r, c], i) => sum + Math.abs(r - corners[i][0]) + Math.abs(c - corners[i][1]), 0) - 1

/** Where each piece's node and each string's stops stand, by sketch node. */
const standing = (layout: Layout): Map<string, Cell> => {
  const at = new Map<string, Cell>()
  for (const [key, piece] of layout.graph.pieces) {
    const top = layout.blocks.get(key)!
    const off: Cell = piece.kind === "node" ? [0, 0] : piece.kind === "room" ? [1, 1] : piece.room.node
    at.set(key, [top[0] + off[0], top[1] + off[1]])
  }
  layout.graph.strings.forEach((s, i) => s.nodes.forEach((node, k) => at.set(node, layout.strings[i].stops[k])))
  return at
}

describe("layoutFloor", () => {
  it("a sketch whose rooms all fit is laid out at its lattice positions, pressed, without a push", () => {
    const layout = laid(STOPS_ONLY, { spread: 0 })
    expect(layout.pushes).toBe(0)
    const at = standing(layout)
    const [r0, c0] = at.get("0,0")!
    for (const [key, [r, c]] of at) expect([r - r0, c - c0]).toEqual(cellOfKey(key))
  })

  it("a big prefab pushes only what lies beyond its cut", () => {
    // prettier-ignore
    const rows = [
      "S",
      ".",
      "E.S.P",
    ]
    const prefab: EmbedRoom = { rows: 5, cols: 5, node: [2, 2], doors: { w: [2, 0] } }
    const from = (at: Map<string, Cell>, key: string) => {
      const [er, ec] = at.get("2,0")!
      return [at.get(key)![0] - er, at.get(key)![1] - ec]
    }
    const pushedLayout = laid(rows, { spread: 0 }, new Map([["2,4", prefab]]))
    expect(pushedLayout.pushes).toBeLessThanOrEqual(4)
    const pushed = standing(pushedLayout)
    const bare = standing(laid(rows, { spread: 0 }))
    expect(from(pushed, "0,0")).toEqual(from(bare, "0,0"))
    expect(from(pushed, "2,2")).toEqual(from(bare, "2,2"))
    expect(from(pushed, "2,4")[1]).toBeGreaterThan(from(bare, "2,4")[1])
  })

  it("on sketches of plain stops and claiming rooms the press leaves no string longer than its stops need", () => {
    for (const rows of [STOPS_ONLY, FOUR_SIDES]) expect(laid(rows, { spread: 0 }).slack).toBe(0)
  })

  it("spread adds length after the press", () => {
    const length = (layout: Layout) => layout.strings.reduce((sum, s) => sum + between(s.corners), 0)
    expect(length(laid(FOUR_SIDES, { spread: 1 }))).toBeGreaterThan(length(laid(FOUR_SIDES, { spread: 0 })))
  })

  it("a loop keeps its cyclic order", () => {
    for (const rows of [LOOPED, FOUR_SIDES]) {
      const layout = laid(rows, { spread: 0 })
      const ways = new Map<string, number>()
      for (const s of layout.graph.strings) for (const end of [s.a, s.b]) ways.set(end, (ways.get(end) ?? 0) + 1)
      const at = standing(layout)
      layout.graph.strings.forEach((s, i) => {
        const { corners } = layout.strings[i]
        const side = (end: string, door: Cell) => {
          const [r, c] = at.get(end)!
          return door[0] < r ? "n" : door[0] > r ? "s" : door[1] > c ? "e" : "w"
        }
        const leaves = (end: string, door: Cell, toward: Cell) =>
          door[0] === at.get(end)![0] && door[1] === at.get(end)![1] ? side(end, toward) : side(end, door)
        if (ways.get(s.a)! > 2) expect(leaves(s.a, corners[0], corners[1])).toBe(s.dirA)
        if (ways.get(s.b)! > 2)
          expect(leaves(s.b, corners[corners.length - 1], corners[corners.length - 2])).toBe(s.dirB)
      })
    }
  })

  it("compaction never leaves a string shorter than its nodes need", () => {
    for (const seed of SEEDS) {
      const layout = laid(FOUR_SIDES, { seed, spread: 1 })
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
