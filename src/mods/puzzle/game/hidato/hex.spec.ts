import { describe, expect, it } from "vitest"
import { hexDistance, hexKey, hexNeighbours, hexRing, hexagon } from "./hex"

// The six-neighbour rule and the step count are the two facts the whole family rests on: adjacency IS
// the puzzle, and the distance is what tells a run it cannot get somewhere in the numbers it has left.
describe("the comb's coordinates", () => {
  it("gives every cell six neighbours, each one step away", () => {
    const neighbours = hexNeighbours({ q: 2, r: -1 })
    expect(new Set(neighbours.map(hexKey)).size).toBe(6)
    for (const neighbour of neighbours) expect(hexDistance({ q: 2, r: -1 }, neighbour)).toBe(1)
  })

  it("counts the steps a run needs to cross the comb", () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0)
    // Three steps east, and three steps along the other two axes reach the same cell — the distance is
    // the fewest of them, not the sum.
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3)
    expect(hexDistance({ q: 0, r: 0 }, { q: -2, r: 3 })).toBe(3)
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: 2 })).toBe(4)
  })

  it.each([
    [1, 7],
    [2, 19],
    [3, 37],
  ])("fills a radius-%i hexagon with %i cells", (radius, cells) => {
    const hive = hexagon(radius)
    expect(new Set(hive.map(hexKey)).size).toBe(cells)
    for (const cell of hive) expect(hexDistance({ q: 0, r: 0 }, cell)).toBeLessThanOrEqual(radius)
  })

  it.each([1, 2, 3])("walks the radius-%i ring in order, so a slice of it is an arc", radius => {
    const ring = hexRing(radius)
    expect(ring).toHaveLength(6 * radius)
    expect(new Set(ring.map(hexKey)).size).toBe(6 * radius)
    for (const cell of ring) expect(hexDistance({ q: 0, r: 0 }, cell)).toBe(radius)
    // Consecutive entries touch, and the last touches the first — which is what makes any run of
    // entries a contiguous piece of the ring rather than cells scattered round it.
    for (let at = 0; at < ring.length; at++)
      expect(hexDistance(ring[at], ring[(at + 1) % ring.length]), `${at}`).toBe(1)
  })
})
