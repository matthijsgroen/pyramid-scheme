import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, waitFor, within } from "@testing-library/react"
import { act } from "react"
import { ECLIPSE_CONFIG } from "@/mods/puzzle/game/eclipse/eclipseConfig"
import { generateEclipse } from "@/mods/puzzle/game/eclipse/generateEclipse"
import { buildEclipseHint } from "./eclipseHint"
import { EclipsePuzzle } from "./EclipsePuzzle"

// The real builder, counted. Deriving a hint IS the expensive thing, so the invariant below is about whether
// it is called at all rather than about how long a tap took.
vi.mock("./eclipseHint", async importOriginal => {
  const actual = await importOriginal<typeof import("./eclipseHint")>()
  return { ...actual, buildEclipseHint: vi.fn(actual.buildEclipseHint) }
})

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
   * **A tap must not cost a hint.** A hint walks the ladder over the whole board, so deriving one as the
   * board changes puts that on every tap for a string nobody asked to read (the cost lightbeam paid once and
   * stopped paying).
   *
   * Counted rather than timed. This started life as a wall-clock bound and failed CI at 83ms against a
   * threshold of 80 — a shared runner in jsdom cannot answer "was this cheap", and the real question is
   * whether the work happened at all.
   */
  it("answers a tap without deriving a hint, and derives one when asked", { timeout: 120_000 }, () => {
    const derive = vi.mocked(buildEclipseHint)
    derive.mockClear()
    const puzzle = generateEclipse(7, ECLIPSE_CONFIG.wizard)
    const { container } = render(
      <EclipsePuzzle puzzle={puzzle} difficulty="wizard" onSolved={() => {}} onCancel={() => {}} />
    )

    for (let tap = 0; tap < 5; tap++) act(() => cellsIn(container)[tap].click())
    expect(derive).not.toHaveBeenCalled()

    act(() => within(container).getByRole("button", { name: /hint/i }).click())
    expect(derive).toHaveBeenCalled()
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
