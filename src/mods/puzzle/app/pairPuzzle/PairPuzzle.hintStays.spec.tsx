// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import { PAIR_PUZZLE_CONFIG } from "@/mods/puzzle/game/pairPuzzle/pairPuzzleConfig"
import { generatePairPuzzle } from "@/mods/puzzle/game/pairPuzzle/generatePairPuzzle"
import { buildPairHint, type PairHint } from "./pairPuzzleHint"
import { PairPuzzle } from "./PairPuzzle"

// The hint builder says what the test scripts; the board is the real one, recorded so the test can read which
// squares it was told to mark.
vi.mock("./pairPuzzleHint", () => ({ buildPairHint: vi.fn() }))
const seen = vi.hoisted(() => ({ props: undefined as { decided?: ReadonlySet<number>; focus?: number } | undefined }))
vi.mock("./PairPuzzleBoard", async importOriginal => {
  const actual = await importOriginal<typeof import("./PairPuzzleBoard")>()
  return {
    PairPuzzleBoard: (props: Parameters<typeof actual.PairPuzzleBoard>[0]) => {
      seen.props = props
      return actual.PairPuzzleBoard(props)
    },
  }
})

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const hintOf = (action: "place" | "ruleOut" | undefined, decided: number[], key = "first"): PairHint => ({
  key,
  params: {},
  action,
  settles: decided.length,
  cells: new Set(),
  decided: new Set(decided),
  focus: decided[0],
})

const puzzle = generatePairPuzzle(3, PAIR_PUZZLE_CONFIG.starter)
// Anchors are printed, not tapped, so the squares a test names are the free ones, in board order.
const free = puzzle.anchors.flatMap((anchor, cell) => (anchor ? [] : [cell]))

const open = (hint: PairHint) => {
  vi.mocked(buildPairHint).mockReset()
  vi.mocked(buildPairHint)
    .mockReturnValueOnce(hint)
    .mockReturnValue(hintOf("ruleOut", [free[8]], "second"))
  const view = render(<PairPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />)
  const cells = () =>
    within(view.container)
      .getAllByRole("button")
      .filter(button => button.className.includes("aspect-square"))
  act(() => within(view.container).getByRole("button", { name: /hint/i }).click())
  const tap = (...squares: number[]) => squares.forEach(cell => act(() => cells()[free.indexOf(cell)].click()))
  const shown = () => view.container.textContent ?? ""
  return { tap, shown }
}

describe("PairPuzzle hint that stays", () => {
  beforeEach(() => {
    seen.props = undefined
  })

  it("keeps the hint when one of several decisions is carried out, and stops marking that square", () => {
    const { tap, shown } = open(hintOf("ruleOut", [free[0], free[1], free[2]]))
    expect([...seen.props!.decided!]).toEqual([free[0], free[1], free[2]])
    tap(free[0])
    expect(shown()).toContain("first")
    expect([...seen.props!.decided!]).toEqual([free[1], free[2]])
    expect(seen.props!.focus).toBe(free[1])
  })

  it("ends the hint on the move that completes the last decision", () => {
    const { tap, shown } = open(hintOf("ruleOut", [free[0], free[1]]))
    tap(free[0], free[1])
    expect(shown()).not.toContain("first")
    expect(seen.props!.decided).toBeUndefined()
  })

  it("ends the hint on a move elsewhere", () => {
    const { tap, shown } = open(hintOf("ruleOut", [free[0], free[1], free[2]]))
    tap(free[8])
    expect(shown()).not.toContain("first")
    expect(seen.props!.decided).toBeUndefined()
  })

  it("keeps a place hint after the first tap, which only darkens the square", () => {
    const { tap, shown } = open(hintOf("place", [free[4], free[5]]))
    tap(free[4])
    expect(shown()).toContain("first")
    expect([...seen.props!.decided!]).toEqual([free[4], free[5]])
    tap(free[4])
    expect([...seen.props!.decided!]).toEqual([free[5]])
  })

  it("keeps showing the hint it revealed after a following move", () => {
    const { tap, shown } = open(hintOf("ruleOut", [free[0], free[1], free[2]]))
    tap(free[0])
    expect(shown()).toContain("first")
    expect(shown()).not.toContain("second")
    expect(buildPairHint).toHaveBeenCalledTimes(1)
  })
})
