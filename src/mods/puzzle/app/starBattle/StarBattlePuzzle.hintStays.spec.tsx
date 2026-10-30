// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import type { StarBattlePuzzleWithAnswer } from "@/mods/puzzle/game/starBattle/generateStarBattle"
import { buildStarBattleHint, type StarBattleHint } from "./starBattleHint"
import { StarBattlePuzzle } from "./StarBattlePuzzle"

// The hint builder says what the test scripts; the board is the real one, recorded so the test can read which
// squares it was told to mark.
vi.mock("./starBattleHint", () => ({ buildStarBattleHint: vi.fn() }))
const seen = vi.hoisted(() => ({ props: undefined as { decided?: ReadonlySet<number>; focus?: number } | undefined }))
vi.mock("./StarBattleBoard", async importOriginal => {
  const actual = await importOriginal<typeof import("./StarBattleBoard")>()
  return {
    StarBattleBoard: (props: Parameters<typeof actual.StarBattleBoard>[0]) => {
      seen.props = props
      return actual.StarBattleBoard(props)
    },
  }
})

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const hintOf = (action: "place" | "ruleOut" | undefined, decided: number[], key = "first"): StarBattleHint => ({
  key,
  params: {},
  action,
  settles: decided.length,
  cells: new Set(),
  decided: new Set(decided),
  focus: decided[0],
})

/** A 5×5 one-star board, a row of digits per row of regions and a "#" per star. */
const puzzle: StarBattlePuzzleWithAnswer = {
  size: 5,
  quota: 1,
  regions: ["44031", "42331", "42233", "44333", "44444"].flatMap(row => [...row].map(Number)),
  solution: ["..#..", "....#", ".#...", "...#.", "#...."].flatMap(row => [...row].map(square => square === "#")),
  techniqueCap: "groupTight",
}

const open = (hint: StarBattleHint) => {
  vi.mocked(buildStarBattleHint).mockReset()
  vi.mocked(buildStarBattleHint)
    .mockReturnValueOnce(hint)
    .mockReturnValue(hintOf("ruleOut", [8], "second"))
  const view = render(<StarBattlePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />)
  const cells = () =>
    within(view.container)
      .getAllByRole("button")
      .filter(button => button.className.includes("aspect-square"))
  act(() => within(view.container).getByRole("button", { name: /hint/i }).click())
  const tap = (...squares: number[]) => squares.forEach(cell => act(() => cells()[cell].click()))
  const shown = () => view.container.textContent ?? ""
  return { tap, shown }
}

describe("StarBattlePuzzle hint that stays", () => {
  beforeEach(() => {
    seen.props = undefined
  })

  it("keeps the hint when one of several decisions is carried out, and stops marking that square", () => {
    const { tap, shown } = open(hintOf("ruleOut", [0, 1, 2]))
    expect([...seen.props!.decided!]).toEqual([0, 1, 2])
    tap(0)
    expect(shown()).toContain("first")
    expect([...seen.props!.decided!]).toEqual([1, 2])
    expect(seen.props!.focus).toBe(1)
  })

  it("ends the hint on the move that completes the last decision", () => {
    const { tap, shown } = open(hintOf("ruleOut", [0, 1]))
    tap(0, 1)
    expect(shown()).not.toContain("first")
    expect(seen.props!.decided).toBeUndefined()
  })

  it("ends the hint on a move elsewhere", () => {
    const { tap, shown } = open(hintOf("ruleOut", [0, 1, 2]))
    tap(8)
    expect(shown()).not.toContain("first")
    expect(seen.props!.decided).toBeUndefined()
  })

  it("keeps a place hint after the first tap, which only darkens the square", () => {
    const { tap, shown } = open(hintOf("place", [4, 5]))
    tap(4)
    expect(shown()).toContain("first")
    expect([...seen.props!.decided!]).toEqual([4, 5])
    tap(4)
    expect([...seen.props!.decided!]).toEqual([5])
  })

  it("keeps showing the hint it revealed after a following move", () => {
    const { tap, shown } = open(hintOf("ruleOut", [0, 1, 2]))
    tap(0)
    expect(shown()).toContain("first")
    expect(shown()).not.toContain("second")
    expect(buildStarBattleHint).toHaveBeenCalledTimes(1)
  })
})
