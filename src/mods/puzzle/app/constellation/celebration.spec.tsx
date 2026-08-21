import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { render, waitFor, within } from "@testing-library/react"
import { act } from "react"
import { colOf, rowOf } from "@/mods/puzzle/game/constellation/constellation"
import { CONSTELLATION_CONFIG } from "@/mods/puzzle/game/constellation/constellationConfig"
import {
  generateConstellation,
  type ConstellationPuzzleWithAnswer,
} from "@/mods/puzzle/game/constellation/generateConstellation"
import { ConstellationPuzzle } from "./ConstellationPuzzle"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const starsIn = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => button.className.includes("-translate-1/2"))

// Either motion counts as "this node had its turn": the sky blooms (a swell, since a star is a point of
// light) and the places on the earth flare (light only, since a basin swelling reads as the board twitching).
const celebrating = (root: HTMLElement) => root.querySelectorAll(".animate-flare, .animate-bloom").length

/** Draws every line the answer holds, which leaves the board solved. */
const solve = (root: HTMLElement, puzzle: ConstellationPuzzleWithAnswer) => {
  puzzle.solution.forEach((count, pair) => {
    const [from, to] = [puzzle.stars[puzzle.pairs[pair].a].cell, puzzle.stars[puzzle.pairs[pair].b].cell]
    const deltaRow = Math.sign(rowOf(puzzle.size, to) - rowOf(puzzle.size, from))
    const deltaCol = Math.sign(colOf(puzzle.size, to) - colOf(puzzle.size, from))
    for (let line = 0; line < count; line++) {
      const star = starsIn(root)[puzzle.pairs[pair].a]
      act(() => {
        const send = (type: string, x: number, y: number) =>
          star.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: x, clientY: y }))
        send("pointerdown", 100, 100)
        send("pointermove", 100 + deltaCol * 60, 100 + deltaRow * 60)
        send("pointerup", 100 + deltaCol * 60, 100 + deltaRow * 60)
      })
    }
  })
}

const reducedMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))

/**
 * The board finishes itself before the shell hears the word "solved".
 *
 * That ordering is the whole feature: the shell freezes the board and starts its banner on `solved`, so a
 * celebration has to run first — and it has to run inside about a second, because the shell stops its
 * solve-time clock at that same moment and that number is what PUZZLE_FAMILIES.md §3.2's budget is measured
 * with.
 */
describe("the completion run", () => {
  it("blooms the nodes before the banner arrives, then reports the solve", async () => {
    reducedMotion(false)
    const puzzle = generateConstellation(2, CONSTELLATION_CONFIG.starter)
    const { container } = render(
      <ConstellationPuzzle
        puzzle={puzzle}
        difficulty="starter"
        theme="irrigation"
        onSolved={() => {}}
        onCancel={() => {}}
      />
    )
    solve(container, puzzle)

    // Mid-run: nodes are finishing one at a time, and the banner has not landed.
    await waitFor(() => expect(celebrating(container)).toBeGreaterThan(0))
    expect(within(container).queryByText(/⏱/)).toBeNull()

    // And it does finish — the solve is reported, so the banner follows.
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })

  it("swells a star and only brightens a basin", () => {
    reducedMotion(false)
    const puzzle = generateConstellation(2, CONSTELLATION_CONFIG.starter)
    const sky = render(
      <ConstellationPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    const delta = render(
      <ConstellationPuzzle
        puzzle={puzzle}
        difficulty="starter"
        theme="irrigation"
        onSolved={() => {}}
        onCancel={() => {}}
      />
    )
    solve(sky.container, puzzle)
    solve(delta.container, puzzle)
    return waitFor(() => {
      expect(sky.container.querySelectorAll(".animate-bloom").length).toBeGreaterThan(0)
      expect(delta.container.querySelectorAll(".animate-bloom")).toHaveLength(0)
      expect(delta.container.querySelectorAll(".animate-flare").length).toBeGreaterThan(0)
    })
  })

  it("refuses input while the board is finishing", () => {
    reducedMotion(false)
    const puzzle = generateConstellation(2, CONSTELLATION_CONFIG.starter)
    const { container } = render(
      <ConstellationPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    // Undo would take a line back out and un-solve a board whose win is already on its way.
    expect(within(container).getByRole<HTMLButtonElement>("button", { name: /↩/ }).disabled).toBe(true)
  })

  /** A player who asked for less motion gets none of it — and no wait for an animation they will not see. */
  it("skips the run entirely under prefers-reduced-motion", async () => {
    reducedMotion(true)
    const puzzle = generateConstellation(2, CONSTELLATION_CONFIG.starter)
    const { container } = render(
      <ConstellationPuzzle
        puzzle={puzzle}
        difficulty="starter"
        theme="irrigation"
        onSolved={() => {}}
        onCancel={() => {}}
      />
    )
    solve(container, puzzle)
    expect(celebrating(container)).toBe(0)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })
})
