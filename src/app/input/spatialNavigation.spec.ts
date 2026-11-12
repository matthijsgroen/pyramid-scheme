import { describe, expect, it } from "vitest"
import { nearestInDirection, type Rect } from "./spatialNavigation"

const box = (left: number, top: number, width = 10, height = 10): Rect => ({ left, top, width, height })

//  A B C
//  D E F      E in the middle, the rest around it on a 20px grid.
//  G H I
const GRID = [
  box(0, 0),
  box(20, 0),
  box(40, 0),
  box(0, 20),
  box(20, 20),
  box(40, 20),
  box(0, 40),
  box(20, 40),
  box(40, 40),
]
const E = GRID[4]

describe("moving focus by direction", () => {
  it.each([
    ["n", 1],
    ["e", 5],
    ["s", 7],
    ["w", 3],
  ] as const)("from the middle, %s lands on the neighbour that way", (dir, index) => {
    expect(nearestInDirection(E, GRID, dir)).toBe(index)
  })

  it("finds nothing past the edge", () => {
    expect(nearestInDirection(GRID[0], GRID, "n")).toBeUndefined()
    expect(nearestInDirection(GRID[0], GRID, "w")).toBeUndefined()
  })

  it("prefers the control straight ahead to a nearer one off to the side", () => {
    const from = box(0, 0)
    const ahead = box(0, 60)
    const aside = box(40, 30)
    expect(nearestInDirection(from, [aside, ahead], "s")).toBe(1)
  })

  it("never lands on a control level with the start, itself included", () => {
    const from = box(0, 0)
    expect(nearestInDirection(from, [from, box(30, 0)], "n")).toBeUndefined()
  })

  it("reaches a wide control below several narrow ones", () => {
    const row = [box(0, 0), box(20, 0), box(40, 0)]
    const wide = box(0, 30, 50, 10)
    expect(nearestInDirection(row[2], [...row, wide], "s")).toBe(3)
  })
})
