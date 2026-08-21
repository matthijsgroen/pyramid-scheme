import { beforeAll, describe, expect, it } from "vitest"
import { render, waitFor, within } from "@testing-library/react"
import { act } from "react"
import { ECLIPSE_CONFIG } from "@/mods/puzzle/game/eclipse/eclipseConfig"
import { generateEclipse } from "@/mods/puzzle/game/eclipse/generateEclipse"
import { EclipsePuzzle } from "./EclipsePuzzle"

// Scoped to one render: these tests mount two boards, and a query across the whole document would number
// the second board’s squares after the first board’s.
const cellsIn = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => button.className.includes("aspect-square"))

// The shell scrolls a revealed hint into view, which jsdom does not implement.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

describe("EclipsePuzzle", () => {
  /**
   * **A tap must not cost a solve.** The top rung enumerates every legal filling of every line, so deriving
   * a hint as the board changes puts that on every tap, for a string nobody asked to read. The bound is
   * generous because this runs in jsdom on whatever machine CI gives us; what it guards is the order of
   * magnitude.
   */
  it("answers a tap without solving the board", { timeout: 120_000 }, () => {
    const puzzle = generateEclipse(7, ECLIPSE_CONFIG.wizard)
    const { container } = render(
      <EclipsePuzzle puzzle={puzzle} difficulty="wizard" onSolved={() => {}} onCancel={() => {}} />
    )
    const taps: number[] = []
    for (let tap = 0; tap < 5; tap++) {
      const started = performance.now()
      act(() => cellsIn(container)[tap].click())
      taps.push(performance.now() - started)
    }
    expect([...taps].sort((a, b) => a - b)[2]).toBeLessThan(80)
  })

  it("reports the board solved once every square matches the answer", { timeout: 120_000 }, async () => {
    const puzzle = generateEclipse(4, ECLIPSE_CONFIG.starter)
    let solved = false
    const { container } = render(
      <EclipsePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => (solved = true)} onCancel={() => {}} />
    )
    // One tap puts a sun in, a second a moon — so each square needs as many taps as its answer asks for.
    puzzle.solution.forEach((mark, cell) => {
      if (puzzle.given[cell] !== undefined) return
      act(() => cellsIn(container)[cell].click())
      if (mark === "moon") act(() => cellsIn(container)[cell].click())
    })
    // The banner lands 0.8s after the last mark (puzzle-screens.md §3), reporting the solve time wordlessly.
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
    expect(solved).toBe(false) // the banner waits for a tap; solving does not leave the room by itself
  })
})
