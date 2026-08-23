import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { render, waitFor, within } from "@testing-library/react"
import { act } from "react"
import { BALANCE_CONFIG } from "@/mods/puzzle/game/balanceScale/balanceConfig"
import { generateBalance, type BalancePuzzle } from "@/mods/puzzle/game/balanceScale/generateBalance"
import { BalancePuzzle as BalanceScreen } from "./BalancePuzzle"

// The shell scrolls a revealed hint into view; jsdom does not implement it.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * The two rows of controls under the board, told from the pieces standing in the pans by the size each is
 * drawn at: the glyph row picks WHICH glyph is being weighed, the palette picks WHAT it weighs.
 */
const buttonsIn = (root: HTMLElement, marker: string) =>
  within(root)
    .getAllByRole("button")
    .filter(button => button.className.includes(marker))

const glyphsIn = (root: HTMLElement) => buttonsIn(root, "min-w-16")
const weightsIn = (root: HTMLElement) => buttonsIn(root, "size-11")

const settling = (root: HTMLElement) => root.querySelectorAll(".animate-settle").length
// The pans ride the rock, one either side of every settling beam — a beam rocking over pans nailed in place
// reads as a broken scale.
const bobbing = (root: HTMLElement) => root.querySelectorAll(".animate-bob").length

/** Gives every glyph the value the answer holds, which is the whole of a solve here. */
const solve = (root: HTMLElement, puzzle: BalancePuzzle) =>
  puzzle.glyphs.forEach((glyph, index) => {
    act(() => glyphsIn(root)[index].click())
    act(() => weightsIn(root)[puzzle.solution[glyph] - 1].click())
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
 * What that looks like here is the family's own instrument: a beam that has come level rocks once and
 * settles, one scale at a time. The constraints are the shared ones — under a second, no input while it
 * runs, and nothing at all under reduced motion.
 */
describe("the completion run", () => {
  it("rocks the beams before the banner arrives, then reports the solve", async () => {
    reducedMotion(false)
    const puzzle = generateBalance(3, BALANCE_CONFIG.starter)
    const { container } = render(
      <BalanceScreen puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)

    // Mid-run: beams are settling one at a time, each with both its pans, and the banner has not landed.
    await waitFor(() => expect(settling(container)).toBeGreaterThan(0))
    expect(bobbing(container)).toBe(settling(container) * 2)
    expect(within(container).queryByText(/⏱/)).toBeNull()

    // And it does finish — the solve is reported, so the banner follows.
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })

  it("refuses input while the board is finishing", async () => {
    reducedMotion(false)
    const puzzle = generateBalance(3, BALANCE_CONFIG.starter)
    const { container } = render(
      <BalanceScreen puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    // Re-weighting a glyph would un-solve a board whose win is already on its way, so the tap is dropped
    // and the run still finishes.
    const wrong = puzzle.solution[puzzle.glyphs[0]] === 1 ? 2 : 1
    act(() => glyphsIn(container)[0].click())
    act(() => weightsIn(container)[wrong - 1].click())
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })

  /** A player who asked for less motion gets none of it — and no wait for an animation they will not see. */
  it("skips the run entirely under prefers-reduced-motion", async () => {
    reducedMotion(true)
    const puzzle = generateBalance(3, BALANCE_CONFIG.starter)
    const { container } = render(
      <BalanceScreen puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    expect(settling(container) + bobbing(container)).toBe(0)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })
})
