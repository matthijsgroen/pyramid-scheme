import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, waitFor, within } from "@testing-library/react"
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

// The shell scrolls a revealed hint into view, which jsdom does not implement.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
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
    // One tap is a star, and the dark marks are the player's own bookkeeping — so a board is finished by
    // placing the stars and nothing else.
    puzzle.solution.forEach((star, cell) => {
      if (star) act(() => cellsIn(container)[cell].click())
    })
    // The banner lands a beat after the last star (puzzle-screens.md §3), reporting the solve time wordlessly.
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
    expect(solved).toBe(false) // the banner waits for a tap; solving does not leave the room by itself
  })

  it("steps a run of dark marks back off the board", () => {
    const puzzle = generateStarBattle(3, STAR_BATTLE_CONFIG.starter)
    const { container } = render(
      <StarBattlePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    // Two taps on each of two squares: star, then dark — the run a wrong reading produces.
    for (const cell of [0, 1]) {
      act(() => cellsIn(container)[cell].click())
      act(() => cellsIn(container)[cell].click())
    }
    const undo = within(container).getByRole("button", { name: /↩/ })
    const marks = () => container.querySelectorAll("circle").length
    expect(marks()).toBe(2)
    act(() => undo.click())
    expect(marks()).toBe(1)
  })
})
