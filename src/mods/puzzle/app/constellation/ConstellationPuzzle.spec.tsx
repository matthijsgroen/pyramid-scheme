import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, waitFor, within } from "@testing-library/react"
import { act } from "react"
import { colOf, pairTowards, rowOf } from "@/mods/puzzle/game/constellation/constellation"
import { CONSTELLATION_CONFIG } from "@/mods/puzzle/game/constellation/constellationConfig"
import {
  generateConstellation,
  type ConstellationPuzzleWithAnswer,
} from "@/mods/puzzle/game/constellation/generateConstellation"
import { buildConstellationHint } from "./constellationHint"
import { ConstellationPuzzle } from "./ConstellationPuzzle"

// The real builder, counted. Deriving a hint IS the expensive thing here — the top rung walks groups across
// the whole board — so the invariant is whether it is called at all rather than how long a gesture took.
vi.mock("./constellationHint", async importOriginal => {
  const actual = await importOriginal<typeof import("./constellationHint")>()
  return { ...actual, buildConstellationHint: vi.fn(actual.buildConstellationHint) }
})

// The stars, in puzzle order: the only touch targets on the board (§8).
const starsIn = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => button.className.includes("-translate-1/2"))

/**
 * One drag: press a star, travel far enough to mean a direction, release.
 *
 * The gesture is a direction rather than a destination (§6), so the deltas below are all the board needs —
 * which is also why it can be driven without any layout.
 */
const drag = (star: HTMLElement, deltaRow: number, deltaCol: number) => {
  act(() => {
    fireEvent.pointerDown(star, { clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(star, { clientX: 100 + deltaCol * 60, clientY: 100 + deltaRow * 60, pointerId: 1 })
    fireEvent.pointerUp(star, { pointerId: 1 })
  })
}

/** Which way the second star of a pair lies from the first. */
const directionOf = (puzzle: ConstellationPuzzleWithAnswer, pair: number) => {
  const { size } = puzzle
  const [from, to] = [puzzle.stars[puzzle.pairs[pair].a].cell, puzzle.stars[puzzle.pairs[pair].b].cell]
  return {
    deltaRow: Math.sign(rowOf(size, to) - rowOf(size, from)),
    deltaCol: Math.sign(colOf(size, to) - colOf(size, from)),
  }
}

const WAYS_OUT: [number, number][] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
]

beforeAll(() => {
  // Neither is implemented by jsdom: the shell scrolls a revealed hint into view, and the board captures the
  // pointer so a drag that leaves the star still reports to it.
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
})

describe("ConstellationPuzzle", () => {
  it("draws a line on a drag, and nothing at all on a press that does not travel", () => {
    const puzzle = generateConstellation(3, CONSTELLATION_CONFIG.starter)
    const { container } = render(
      <ConstellationPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    const undo = () => within(container).getByRole<HTMLButtonElement>("button", { name: /↩/ })
    expect(undo().disabled).toBe(true)

    // A press with no travel is a cancel: dragging is the only input, so a stationary tap on the board has
    // to do nothing at all, or every attempt to scroll the page would draw a line.
    act(() => {
      fireEvent.pointerDown(starsIn(container)[0], { clientX: 100, clientY: 100, pointerId: 1 })
      fireEvent.pointerUp(starsIn(container)[0], { pointerId: 1 })
    })
    expect(undo().disabled).toBe(true)

    const pair = puzzle.solution.findIndex(count => count > 0)
    const { deltaRow, deltaCol } = directionOf(puzzle, pair)
    drag(starsIn(container)[puzzle.pairs[pair].a], deltaRow, deltaCol)
    expect(undo().disabled).toBe(false)
  })

  it("draws nothing when the drag points at empty sky", () => {
    const puzzle = generateConstellation(3, CONSTELLATION_CONFIG.starter)
    const { container } = render(
      <ConstellationPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    // A star's row and column are bounded, so some way out of some star ends in nothing.
    const [star, deltaRow, deltaCol] = puzzle.stars.flatMap((_unused, index) =>
      WAYS_OUT.flatMap(([deltaRow, deltaCol]) =>
        pairTowards(puzzle, index, deltaRow, deltaCol) === undefined ? [[index, deltaRow, deltaCol]] : []
      )
    )[0]
    drag(starsIn(container)[star], deltaRow, deltaCol)
    expect(within(container).getByRole<HTMLButtonElement>("button", { name: /↩/ }).disabled).toBe(true)
  })

  /**
   * The preview has to be about what the drag will DO, not about what is already there.
   *
   * Drawn as the pair's current state, the drag that doubles a line and the drag that clears one both showed
   * nothing at all — the "preview" was the line the player had already drawn, sitting exactly where it was.
   */
  it("previews the stroke a drag would add to a pair that already holds a line", () => {
    const puzzle = generateConstellation(3, CONSTELLATION_CONFIG.starter)
    const { container } = render(
      <ConstellationPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    const pending = () => container.querySelectorAll('line[class*="/40"]').length
    const pair = puzzle.solution.findIndex(count => count > 0)
    const { deltaRow, deltaCol } = directionOf(puzzle, pair)
    const star = () => starsIn(container)[puzzle.pairs[pair].a]

    drag(star(), deltaRow, deltaCol)
    expect(pending()).toBe(0) // released: the line is on the board, nothing is pending

    // Mid-drag on the same pair, before release: the second stroke is what is about to happen.
    act(() => {
      fireEvent.pointerDown(star(), { clientX: 100, clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(star(), { clientX: 100 + deltaCol * 60, clientY: 100 + deltaRow * 60, pointerId: 1 })
    })
    expect(pending()).toBe(1)
    expect(container.querySelectorAll("line").length).toBe(2)
    act(() => fireEvent.pointerUp(star(), { pointerId: 1 }))
  })

  /**
   * **A gesture must not cost a hint.** Counted rather than timed: the question is whether the work happened
   * at all, which is what a wall-clock bound cannot answer on a shared runner.
   */
  it("answers a drag without deriving a hint, and derives one when asked", () => {
    const derive = vi.mocked(buildConstellationHint)
    derive.mockClear()
    const puzzle = generateConstellation(5, CONSTELLATION_CONFIG.wizard)
    const { container } = render(
      <ConstellationPuzzle puzzle={puzzle} difficulty="wizard" onSolved={() => {}} onCancel={() => {}} />
    )

    puzzle.solution.forEach((count, pair) => {
      if (!count) return
      const { deltaRow, deltaCol } = directionOf(puzzle, pair)
      drag(starsIn(container)[puzzle.pairs[pair].a], deltaRow, deltaCol)
    })
    expect(derive).not.toHaveBeenCalled()

    act(() => within(container).getByRole("button", { name: /hint/i }).click())
    expect(derive).toHaveBeenCalled()
  })

  it("reports the board solved once every line the answer holds is drawn", async () => {
    const puzzle = generateConstellation(2, CONSTELLATION_CONFIG.starter)
    let solved = false
    const { container } = render(
      <ConstellationPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => (solved = true)} onCancel={() => {}} />
    )
    puzzle.solution.forEach((count, pair) => {
      const { deltaRow, deltaCol } = directionOf(puzzle, pair)
      for (let line = 0; line < count; line++) drag(starsIn(container)[puzzle.pairs[pair].a], deltaRow, deltaCol)
    })
    // The banner lands 0.8s after the last line (puzzle-screens.md §3), reporting the solve time wordlessly.
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
    expect(solved).toBe(false) // the banner waits for a tap; solving does not leave the room by itself
  })
})
