// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import type { PairMark, PairPuzzle } from "@/mods/puzzle/game/pairPuzzle/pairPuzzle"
import { PAIR_SKINS } from "./skins"
import { PairPuzzleBoard } from "./PairPuzzleBoard"

afterEach(cleanup)

const skin = PAIR_SKINS.default

// Anchor in the middle of the top row; one piece owed to the top row and to the middle column.
const puzzle: PairPuzzle = {
  size: 3,
  anchors: [false, true, false, false, false, false, false, false, false],
  rowCounts: [1, 0, 0],
  colCounts: [1, 0, 0],
}

const show = (marks: (PairMark | undefined)[], taps: number[] = []) =>
  render(
    <PairPuzzleBoard
      puzzle={puzzle}
      state={{ marks }}
      skin={skin}
      onTapCell={cell => taps.push(cell)}
      onSweepCells={() => undefined}
    />
  )

const blank = () => new Array<PairMark | undefined>(9).fill(undefined)

describe("PairPuzzleBoard", () => {
  it("draws an anchor without a button, so it cannot be tapped", () => {
    const taps: number[] = []
    const { container } = show(blank(), taps)
    expect(container.querySelectorAll("button")).toHaveLength(8)
    expect(container.querySelectorAll("[data-anchor]")).toHaveLength(1)
    fireEvent.click(container.querySelector("[data-anchor]")!)
    expect(taps).toEqual([])
  })

  it("reports a tap on a square by its cell", () => {
    const taps: number[] = []
    const { container } = show(blank(), taps)
    fireEvent.click(container.querySelectorAll("button")[0])
    expect(taps).toEqual([0])
  })

  it("colours a count by what its line holds", () => {
    const marks = blank()
    marks[0] = "piece" // top row and left column both hold their one
    marks[3] = "piece"
    const { container } = show(marks)
    const top = container.querySelector("[data-count='row-0']")!
    const left = container.querySelector("[data-count='col-0']")!
    const middle = container.querySelector("[data-count='row-2']")!
    expect(top.className).toContain(skin.countMet)
    expect(left.className).toContain(skin.countBroken) // two pieces in a column owed one
    expect(middle.className).toContain(skin.countMet) // zero owed and zero held
    expect(top.className).not.toContain(skin.countOpen)
  })

  it("leaves a count open while its line still owes pieces", () => {
    const { container } = show(blank())
    expect(container.querySelector("[data-count='row-0']")!.className).toContain(skin.countOpen)
  })
})
