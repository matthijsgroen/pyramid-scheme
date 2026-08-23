import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { render, waitFor, within } from "@testing-library/react"
import { act } from "react"
import { ECLIPSE_CONFIG } from "@/mods/puzzle/game/eclipse/eclipseConfig"
import { generateEclipse, type EclipsePuzzleWithAnswer } from "@/mods/puzzle/game/eclipse/generateEclipse"
import { EclipsePuzzle } from "./EclipsePuzzle"

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

const swelling = (root: HTMLElement) => root.querySelectorAll(".animate-bloom").length

/** One tap puts a sun in, a second a moon — so each square takes as many taps as the answer asks for. */
const solve = (root: HTMLElement, puzzle: EclipsePuzzleWithAnswer) =>
  puzzle.solution.forEach((mark, cell) => {
    if (puzzle.given[cell] !== undefined) return
    act(() => cellsIn(root)[cell].click())
    if (mark === "moon") act(() => cellsIn(root)[cell].click())
  })

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
 * Here it is one sweep across the grid, top-left corner to bottom-right, a diagonal at a time — so the run
 * says "the whole board" rather than pointing at any square in it. The constraints are the shared ones: under
 * a second, no input while it runs, nothing at all under reduced motion.
 */
describe("the completion run", () => {
  it("sweeps the marks before the banner arrives, then reports the solve", { timeout: 120_000 }, async () => {
    reducedMotion(false)
    const puzzle = generateEclipse(4, ECLIPSE_CONFIG.starter)
    const { container } = render(
      <EclipsePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)

    // Mid-run: the wave has reached part of the board but not all of it, and the banner has not landed.
    await waitFor(() => expect(swelling(container)).toBeGreaterThan(0))
    expect(swelling(container)).toBeLessThan(puzzle.size ** 2)
    expect(within(container).queryByText(/⏱/)).toBeNull()

    // And it does finish — the whole board is lit, the solve is reported, so the banner follows.
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
    expect(swelling(container)).toBe(puzzle.size ** 2)
  })

  it("runs the wave from the top-left corner", { timeout: 120_000 }, async () => {
    reducedMotion(false)
    const puzzle = generateEclipse(4, ECLIPSE_CONFIG.starter)
    const { container } = render(
      <EclipsePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    // The first square to take its turn is the corner the sweep starts from; the far corner is the last.
    await waitFor(() => expect(swelling(container)).toBeGreaterThan(0))
    const cells = cellsIn(container)
    expect(cells[0].querySelector(".animate-bloom")).not.toBeNull()
    expect(cells[puzzle.size ** 2 - 1].querySelector(".animate-bloom")).toBeNull()
  })

  it("refuses input while the board is finishing", { timeout: 120_000 }, async () => {
    reducedMotion(false)
    const puzzle = generateEclipse(4, ECLIPSE_CONFIG.starter)
    const { container } = render(
      <EclipsePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    // Cycling a mark would un-solve a board whose win is already on its way, so the tap is dropped and the
    // run still finishes.
    const open = puzzle.given.findIndex(given => given === undefined)
    act(() => cellsIn(container)[open].click())
    expect(within(container).getByRole<HTMLButtonElement>("button", { name: /↩/ }).disabled).toBe(true)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })

  /** A player who asked for less motion gets none of it — and no wait for an animation they will not see. */
  it("skips the run entirely under prefers-reduced-motion", { timeout: 120_000 }, async () => {
    reducedMotion(true)
    const puzzle = generateEclipse(4, ECLIPSE_CONFIG.starter)
    const { container } = render(
      <EclipsePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    expect(swelling(container)).toBe(0)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })
})
