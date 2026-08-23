import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { render, waitFor, within } from "@testing-library/react"
import { act } from "react"
import { SUMPLETE_CONFIG } from "@/mods/puzzle/game/sumplete/sumpleteConfig"
import { generateSumplete, type SumpleteGrid } from "@/mods/puzzle/game/sumplete/generateSumplete"
import { SumpletePuzzle } from "./SumpletePuzzle"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const cellsIn = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => button.className.includes("aspect-square"))

const flaring = (root: HTMLElement) => root.querySelectorAll(".animate-flare").length

/** One tap crosses a number out, and crossing out the ones the answer drops is the whole solve. */
const solve = (root: HTMLElement, puzzle: SumpleteGrid) =>
  puzzle.solution.forEach((row, rowIndex) =>
    row.forEach((keep, colIndex) => {
      if (keep) return
      act(() => cellsIn(root)[rowIndex * puzzle.grid.length + colIndex].click())
    })
  )

const reducedMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))

/**
 * The board finishes itself before the shell hears the word "solved" (`puzzle-screens.md` §3).
 *
 * Here the run checks the sums off: the row targets flare top to bottom, then the column targets left to
 * right — the board making its own claim in the two directions the claim is made in. The constraints are the
 * shared ones: under a second, no input while it runs, nothing at all under reduced motion.
 */
describe("the completion run", () => {
  it("checks the targets off before the banner arrives, then reports the solve", { timeout: 120_000 }, async () => {
    reducedMotion(false)
    const puzzle = generateSumplete(SUMPLETE_CONFIG.starter.size, 4, SUMPLETE_CONFIG.starter)
    const { container } = render(
      <SumpletePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)

    // Mid-run: some targets have been checked off and some have not, and the banner has not landed.
    const targets = puzzle.grid.length * 2
    await waitFor(() => expect(flaring(container)).toBeGreaterThan(0))
    expect(flaring(container)).toBeLessThan(targets)
    expect(within(container).queryByText(/⏱/)).toBeNull()

    // And it does finish — every line is checked, the solve is reported, so the banner follows.
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
    expect(flaring(container)).toBe(targets)
  })

  it("runs the rows before the columns", { timeout: 120_000 }, async () => {
    reducedMotion(false)
    const puzzle = generateSumplete(SUMPLETE_CONFIG.starter.size, 4, SUMPLETE_CONFIG.starter)
    const { container } = render(
      <SumpletePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    // The first row's target is checked off first; the last column's is last, so it is still waiting.
    await waitFor(() => expect(flaring(container)).toBeGreaterThan(0))
    const flared = [...container.querySelectorAll(".animate-flare")]
    const all = [...container.querySelectorAll("[class*='aspect-square']")].filter(node => node.tagName === "DIV")
    expect(flared[0]).toBe(all[0]) // the first row's target
    expect(flared).not.toContain(all[all.length - 1]) // the last column's target
  })

  it("refuses input while the board is finishing", { timeout: 120_000 }, async () => {
    reducedMotion(false)
    const puzzle = generateSumplete(SUMPLETE_CONFIG.starter.size, 4, SUMPLETE_CONFIG.starter)
    const { container } = render(
      <SumpletePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    // Toggling a number would un-solve a board whose win is already on its way, so the tap is dropped and
    // the run still finishes.
    act(() => cellsIn(container)[0].click())
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })

  /** A player who asked for less motion gets none of it — and no wait for an animation they will not see. */
  it("skips the run entirely under prefers-reduced-motion", { timeout: 120_000 }, async () => {
    reducedMotion(true)
    const puzzle = generateSumplete(SUMPLETE_CONFIG.starter.size, 4, SUMPLETE_CONFIG.starter)
    const { container } = render(
      <SumpletePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    expect(flaring(container)).toBe(0)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })
})
