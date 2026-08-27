import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import type { StarBattlePuzzle } from "@/mods/puzzle/game/starBattle/starBattle"
import { skinFor } from "./skins"
import { StarBattleBoard } from "./StarBattleBoard"

afterEach(cleanup)

// Two regions, one per row, so every kind of edge appears once: the rim, the wall between the two regions,
// and the seam inside a region.
const puzzle: StarBattlePuzzle = { size: 2, quota: 1, regions: [0, 0, 1, 1] }

const wallPath = () => {
  const { container } = render(
    <StarBattleBoard
      puzzle={puzzle}
      state={{ marks: new Array(4).fill(undefined) }}
      skin={skinFor(undefined, undefined)}
      onTapCell={() => undefined}
      onSweepCells={() => undefined}
    />
  )
  return container.querySelector("svg path")?.getAttribute("d") ?? ""
}

describe("StarBattleBoard walls", () => {
  it("draws a wall along every edge where two regions meet", () => {
    // The boundary between the rows, both squares of it.
    expect(wallPath()).toContain("M0 1h1")
    expect(wallPath()).toContain("M1 1h1")
  })

  it("draws each wall once, so it is not two half-walls meeting on the line", () => {
    // The regression this guards: an edge belongs to the squares on BOTH sides of it, and drawing it from
    // each of them made a wall inside the grid twice as thick as the rim, where only one square can draw it.
    const d = wallPath()
    expect(d.split("M0 1h1")).toHaveLength(2)
  })

  it("draws the whole rim, including the two sides no square is above or left of", () => {
    const d = wallPath()
    expect(d).toContain("M0 0h1") // top
    expect(d).toContain("M0 0v1") // left
    expect(d).toContain("M0 2h1") // bottom, past the last row
    expect(d).toContain("M2 0v1") // right, past the last column
  })

  it("leaves the edge between two squares of one region to the seam", () => {
    // Vertical, between the two squares of the top row: a grid line, not a boundary.
    expect(wallPath()).not.toContain("M1 0v1")
  })

  it("draws every square the same, so a mark is the same size and place in all of them", () => {
    // The regression this guards, and the one a player sees first: a mark is laid out inside its square's
    // content box, so while the squares carried the walls as borders of their own, a square walled on both
    // sides had 4px less room than an open one and one walled on a single side had its middle shifted off
    // centre. The dots and stars came out at different sizes and wandered as the eye went down a column.
    const { container } = render(
      <StarBattleBoard
        puzzle={puzzle}
        state={{ marks: ["star", "dark", "dark", "star"] }}
        skin={skinFor(undefined, undefined)}
        onTapCell={() => undefined}
        onSweepCells={() => undefined}
      />
    )
    const borderClasses = [...container.querySelectorAll("button")].map(button =>
      [...button.classList]
        .filter(name => name.startsWith("border"))
        .sort()
        .join(" ")
    )
    expect(new Set(borderClasses).size).toBe(1)
  })

  it("keeps the stroke one width wherever the board is scaled to", () => {
    const { container } = render(
      <StarBattleBoard
        puzzle={puzzle}
        state={{ marks: new Array(4).fill(undefined) }}
        skin={skinFor(undefined, undefined)}
        onTapCell={() => undefined}
        onSweepCells={() => undefined}
      />
    )
    // Without this the stroke is measured in board-widths, so the walls thicken with the board.
    expect(container.querySelector("svg path")?.getAttribute("vector-effect")).toBe("non-scaling-stroke")
  })
})
