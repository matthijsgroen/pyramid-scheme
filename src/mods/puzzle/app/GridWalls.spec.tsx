import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { GridWalls } from "./GridWalls"

afterEach(cleanup)

// Four squares cut into two chambers, one per row: the rim, a wall between chambers, and a seam inside one.
const twoRows = (row: number, col: number, dRow: number, dCol: number) => {
  const [nextRow, nextCol] = [row + dRow, col + dCol]
  if (nextRow < 0 || nextRow > 1 || nextCol < 0 || nextCol > 1) return true
  return nextRow !== row
}

const path = (isWall = twoRows, size = 2) => {
  const { container } = render(<GridWalls size={size} isWall={isWall} colour="red" />)
  return container.querySelector("path")?.getAttribute("d") ?? ""
}

describe("GridWalls", () => {
  it("draws a wall along every edge the grid says is one", () => {
    // The boundary between the two rows, both squares of it.
    expect(path()).toContain("M0 1h1")
    expect(path()).toContain("M1 1h1")
  })

  it("draws each wall once, so it is not two half-walls meeting on the line", () => {
    // The regression this guards: an edge belongs to the squares on BOTH sides of it, and drawing it from
    // each of them made a wall inside the grid twice as thick as the rim, where only one square can draw it.
    expect(path().split("M0 1h1")).toHaveLength(2)
  })

  it("draws the whole rim, including the two sides no square is above or left of", () => {
    const d = path()
    expect(d).toContain("M0 0h1") // top
    expect(d).toContain("M0 0v1") // left
    expect(d).toContain("M0 2h1") // bottom, past the last row
    expect(d).toContain("M2 0v1") // right, past the last column
  })

  it("leaves an edge inside one chamber to the seam", () => {
    // Vertical, between the two squares of the top row: a grid line, not a wall.
    expect(path()).not.toContain("M1 0v1")
  })

  it("keeps the stroke one width wherever the board is scaled to", () => {
    const { container } = render(<GridWalls size={2} isWall={twoRows} colour="red" />)
    // Without this the stroke is measured in board-widths, so the walls thicken with the board.
    expect(container.querySelector("path")?.getAttribute("vector-effect")).toBe("non-scaling-stroke")
  })

  it("takes no pointer events, so the squares underneath stay tappable", () => {
    const { container } = render(<GridWalls size={2} isWall={twoRows} colour="red" />)
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("pointer-events-none")
  })
})
