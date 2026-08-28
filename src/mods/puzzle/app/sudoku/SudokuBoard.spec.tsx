import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { createSudokuState } from "@/mods/puzzle/game/sudoku/sudokuState"
import { generateSudoku } from "@/mods/puzzle/game/sudoku/generateSudoku"
import { SUDOKU_CONFIG } from "@/mods/puzzle/game/sudoku/sudokuConfig"
import { SudokuBoard } from "./SudokuBoard"
import { skinFor } from "./skins"

afterEach(cleanup)

const puzzle = generateSudoku(1, SUDOKU_CONFIG.starter)

const board = () => {
  const { container } = render(
    <SudokuBoard
      puzzle={puzzle}
      cells={createSudokuState(puzzle).cells}
      skin={skinFor(undefined, undefined)}
      conflicts={new Set()}
      onSelect={() => undefined}
    />
  )
  return container
}

describe("SudokuBoard chamber walls", () => {
  it("walls the chambers, and only where they meet", () => {
    // Chambers are two wide and three high, so the walls inside a 6x6 run down columns 2 and 4 and along
    // row 3 — and never down column 1, which is the middle of a chamber.
    const d = board().querySelector("path")?.getAttribute("d") ?? ""
    expect(d).toContain("M2 0v1")
    expect(d).toContain("M4 0v1")
    expect(d).toContain("M0 3h1")
    expect(d).not.toContain("M1 0v1")
  })

  it("draws every square the same, so a written figure is the same size and place in all of them", () => {
    // The regression this guards, and the one a player sees first: a figure is laid out inside its square's
    // content box, so while the squares carried the chamber walls as borders of their own, the two columns
    // of a chamber leaned opposite ways and neighbouring figures sat 2px apart from each other.
    const borderClasses = [...board().querySelectorAll("button")].map(button =>
      [...button.classList]
        .filter(name => name.startsWith("border"))
        .sort()
        .join(" ")
    )
    expect(new Set(borderClasses).size).toBe(1)
  })
})
