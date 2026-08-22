import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, waitFor, within } from "@testing-library/react"
import { act } from "react"
import { STAR_BATTLE_CONFIG } from "@/mods/puzzle/game/starBattle/starBattleConfig"
import { generateStarBattle } from "@/mods/puzzle/game/starBattle/generateStarBattle"
import { buildStarBattleHint } from "./starBattleHint"
import { StarBattlePuzzle } from "./StarBattlePuzzle"

// The real builder, counted. Deriving a hint IS the expensive thing here — the top rung sweeps every pair of
// regions against every pair of lines — so the invariant is whether it runs at all, not how long a tap took.
vi.mock("./starBattleHint", async importOriginal => {
  const actual = await importOriginal<typeof import("./starBattleHint")>()
  return { ...actual, buildStarBattleHint: vi.fn(actual.buildStarBattleHint) }
})

// Scoped to one render: a query across the whole document would number a second board's squares after the
// first board's.
const cellsIn = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => button.className.includes("aspect-square"))

// The shell scrolls a revealed hint into view, and a drag captures the pointer so the squares it crosses
// still report to the square it started on. jsdom implements neither.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
})

describe("StarBattlePuzzle", () => {
  /**
   * **A tap must not cost a hint** — counted rather than timed, for the reason eclipse's version of this test
   * records: a shared runner in jsdom cannot answer "was this cheap", and the real question is whether the
   * work happened at all.
   */
  it("answers a tap without deriving a hint, and derives one when asked", { timeout: 120_000 }, () => {
    const derive = vi.mocked(buildStarBattleHint)
    derive.mockClear()
    const puzzle = generateStarBattle(7, STAR_BATTLE_CONFIG.wizard)
    const { container } = render(
      <StarBattlePuzzle puzzle={puzzle} difficulty="wizard" onSolved={() => {}} onCancel={() => {}} />
    )

    for (let tap = 0; tap < 5; tap++) act(() => cellsIn(container)[tap].click())
    expect(derive).not.toHaveBeenCalled()

    act(() => within(container).getByRole("button", { name: /hint/i }).click())
    expect(derive).toHaveBeenCalled()
  })

  it("opens every square to the player, because the region map is the whole clue", () => {
    const puzzle = generateStarBattle(3, STAR_BATTLE_CONFIG.starter)
    const { container } = render(
      <StarBattlePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    const cells = cellsIn(container)
    expect(cells.length).toBe(puzzle.size ** 2)
    expect(cells.some(cell => cell.hasAttribute("disabled"))).toBe(false)
  })

  it("reports the board solved once every star is placed, with nothing else needed", { timeout: 120_000 }, async () => {
    const puzzle = generateStarBattle(4, STAR_BATTLE_CONFIG.starter)
    let solved = false
    const { container } = render(
      <StarBattlePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => (solved = true)} onCancel={() => {}} />
    )
    // A star is the second tap (the first rules the square out), and the dark marks are the player's own
    // bookkeeping — so a board is finished by placing the stars and nothing else.
    puzzle.solution.forEach((star, cell) => {
      if (!star) return
      act(() => cellsIn(container)[cell].click())
      act(() => cellsIn(container)[cell].click())
    })
    // The banner lands a beat after the last star (puzzle-screens.md §3), reporting the solve time wordlessly.
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
    expect(solved).toBe(false) // the banner waits for a tap; solving does not leave the room by itself
  })

  /**
   * The gesture the family is really controlled by: elimination comes in runs (the rest of a row, the far
   * end of a region), and tapping each square is the same move over and over.
   *
   * jsdom gives every element a zero-sized box, so the board's own geometry cannot be used to say which
   * square a point is over — the layout is stubbed to a known 8-per-side grid instead, and the drag is aimed
   * at squares by arithmetic on it.
   */
  it("rules out a run of squares in one drag, and one press takes the run back", () => {
    const puzzle = generateStarBattle(3, STAR_BATTLE_CONFIG.starter)
    const { container } = render(
      <StarBattlePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    const grid = container.querySelector("div.grid")!
    const side = 400
    grid.getBoundingClientRect = () => ({ left: 0, top: 0, width: side, height: side }) as DOMRect
    const centre = (cell: number) => {
      const step = side / puzzle.size
      return {
        clientX: (cell % puzzle.size) * step + step / 2,
        clientY: Math.floor(cell / puzzle.size) * step + step / 2,
      }
    }
    const cells = cellsIn(container)
    const marks = () => container.querySelectorAll("circle").length

    // Down on the first square of row 0, across the next two, up.
    act(() => fireEvent.pointerDown(cells[0], { ...centre(0), pointerId: 1 }))
    act(() => fireEvent.pointerMove(cells[0], { ...centre(1), pointerId: 1 }))
    act(() => fireEvent.pointerMove(cells[0], { ...centre(2), pointerId: 1 }))
    act(() => fireEvent.pointerUp(cells[0], { pointerId: 1 }))
    // The click a release fires is swallowed, or the square it started on would cycle on as well.
    act(() => cells[0].click())
    expect(marks()).toBe(3)

    act(() => within(container).getByRole("button", { name: /↩/ }).click())
    expect(marks()).toBe(0)
  })

  it("steps a run of dark marks back off the board", () => {
    const puzzle = generateStarBattle(3, STAR_BATTLE_CONFIG.starter)
    const { container } = render(
      <StarBattlePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    // One tap a square, which is the run a wrong reading produces: a sweep of squares ruled out.
    for (const cell of [0, 1]) act(() => cellsIn(container)[cell].click())
    const undo = within(container).getByRole("button", { name: /↩/ })
    const marks = () => container.querySelectorAll("circle").length
    expect(marks()).toBe(2)
    act(() => undo.click())
    expect(marks()).toBe(1)
  })
})
