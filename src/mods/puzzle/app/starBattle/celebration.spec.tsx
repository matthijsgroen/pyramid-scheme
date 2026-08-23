import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { render, waitFor, within } from "@testing-library/react"
import { act } from "react"
import { STAR_BATTLE_CONFIG } from "@/mods/puzzle/game/starBattle/starBattleConfig"
import { generateStarBattle, type StarBattlePuzzleWithAnswer } from "@/mods/puzzle/game/starBattle/generateStarBattle"
import { StarBattlePuzzle } from "./StarBattlePuzzle"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const cellsIn = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => button.className.includes("aspect-square"))

// Either motion counts as "this answer had its turn": the sky blooms (a swell, since a star is a point of
// light) and the flood plain flares (light only, since a sheaf swelling drags its plot with it).
const celebrating = (root: HTMLElement) => root.querySelectorAll(".animate-flare, .animate-bloom").length

/** Places every star the answer holds — a star is the second tap — which leaves the board solved. */
const solve = (root: HTMLElement, puzzle: StarBattlePuzzleWithAnswer) =>
  puzzle.solution.forEach((star, cell) => {
    if (!star) return
    act(() => cellsIn(root)[cell].click())
    act(() => cellsIn(root)[cell].click())
  })

const reducedMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))

/**
 * The board finishes itself before the shell hears the word "solved" — the ordering constellation and
 * lightbeam already run (`puzzle-screens.md` §3), on the family that shares constellation's two places.
 *
 * That ordering is the whole feature: the shell freezes the board and starts its banner on `solved`, so a
 * celebration has to run first — and inside about a second, because the shell stops its solve-time clock at
 * that same moment and that number is what PUZZLE_FAMILIES.md §3.2's budget is measured with.
 */
describe("the completion run", () => {
  it("lights the answers before the banner arrives, then reports the solve", { timeout: 120_000 }, async () => {
    reducedMotion(false)
    const puzzle = generateStarBattle(4, STAR_BATTLE_CONFIG.starter)
    const { container } = render(
      <StarBattlePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)

    // Mid-run: answers are finishing one at a time, and the banner has not landed.
    await waitFor(() => expect(celebrating(container)).toBeGreaterThan(0))
    expect(within(container).queryByText(/⏱/)).toBeNull()

    // And it does finish — the solve is reported, so the banner follows.
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })

  it("swells a star and only brightens a farmstead", { timeout: 120_000 }, () => {
    reducedMotion(false)
    const puzzle = generateStarBattle(4, STAR_BATTLE_CONFIG.starter)
    const sky = render(
      <StarBattlePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    const plain = render(
      <StarBattlePuzzle puzzle={puzzle} difficulty="starter" theme="fields" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(sky.container, puzzle)
    solve(plain.container, puzzle)
    return waitFor(() => {
      expect(sky.container.querySelectorAll(".animate-bloom").length).toBeGreaterThan(0)
      expect(plain.container.querySelectorAll(".animate-bloom")).toHaveLength(0)
      expect(plain.container.querySelectorAll(".animate-flare").length).toBeGreaterThan(0)
    })
  })

  it("refuses input while the board is finishing", { timeout: 120_000 }, async () => {
    reducedMotion(false)
    const puzzle = generateStarBattle(4, STAR_BATTLE_CONFIG.starter)
    const { container } = render(
      <StarBattlePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    // A tap on a placed star would clear it, un-solving a board whose win is already on its way — so the
    // run finishes and the banner still lands.
    const starCell = puzzle.solution.findIndex(Boolean)
    act(() => cellsIn(container)[starCell].click())
    // Undo would take the last star back out, for the same reason.
    expect(within(container).getByRole<HTMLButtonElement>("button", { name: /↩/ }).disabled).toBe(true)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })

  /** A player who asked for less motion gets none of it — and no wait for an animation they will not see. */
  it("skips the run entirely under prefers-reduced-motion", { timeout: 120_000 }, async () => {
    reducedMotion(true)
    const puzzle = generateStarBattle(4, STAR_BATTLE_CONFIG.starter)
    const { container } = render(
      <StarBattlePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    solve(container, puzzle)
    expect(celebrating(container)).toBe(0)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })
})
