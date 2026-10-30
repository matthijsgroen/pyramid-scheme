import { describe, expect, it } from "vitest"
import { drawnSketch } from "../carveFixtures"
import { floorGraph, loopHeld } from "./graph"

describe("floorGraph", () => {
  it("a chain of stops between two rooms becomes one string holding them in order", () => {
    const graph = floorGraph(drawnSketch(["E.F.S.S.S.T"]), new Map())
    expect([...graph.pieces.keys()]).toEqual(["0,0", "0,2", "0,10"])
    const chain = graph.strings.find(s => s.a === "0,2")!
    expect(chain).toMatchObject({ b: "0,10", dirA: "e", dirB: "w", nodes: ["0,4", "0,6", "0,8"] })
    expect(chain.connectors.map(cell => cell.ordinal)).toEqual(["0,3", "0,5", "0,7", "0,9"])
  })

  it("a drop is a string of its own between two pieces, holding its run", () => {
    const graph = floorGraph(drawnSketch(["E.SL>>>DS.T"]), new Map())
    const drop = graph.strings.find(s => s.drop)!
    expect(drop).toMatchObject({ a: "0,2", b: "0,8", dirA: "e", dirB: "w", nodes: [] })
    expect(drop.drop!.run).toHaveLength(3)
    expect(graph.pieces.has("0,2") && graph.pieces.has("0,8")).toBe(true)
  })

  it("a fork and a dead end are pieces; a stop with two ways is not", () => {
    // prettier-ignore
    const graph = floorGraph(drawnSketch([
      "E.S.F.S.T",
      "    .",
      "    S",
    ]), new Map())
    expect([...graph.pieces.keys()].sort()).toEqual(["0,0", "0,4", "0,8", "2,4"])
  })

  it("the strings a loop holds are those whose ends stay joined without them", () => {
    // prettier-ignore
    const graph = floorGraph(drawnSketch([
      "E.F.S.S.F.T",
      "  .     .",
      "  S.....S",
    ]), new Map())
    const held = [...loopHeld(graph)].map(i => graph.strings[i])
    expect(held.map(s => [s.a, s.b])).toEqual([
      ["0,2", "0,8"],
      ["0,2", "0,8"],
    ])
  })

  it("a sketch standing a tile is refused as a pass-order mistake", () => {
    const sketch = drawnSketch(["E.S.T"])
    const cells = sketch.cells.map(row => [...row])
    const stop = cells[0][2]
    if (stop.type === "room") cells[0][2] = { ...stop, sequenceTile: { id: "q", step: 0, glyph: 1, entrance: "x" } }
    expect(() => floorGraph({ ...sketch, cells }, new Map())).toThrow(/pieces stand on the laid floor/)
  })
})
