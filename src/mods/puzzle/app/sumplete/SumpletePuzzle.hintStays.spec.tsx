// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import { SUMPLETE_CONFIG } from "@/mods/puzzle/game/sumplete/sumpleteConfig"
import { generateSumplete } from "@/mods/puzzle/game/sumplete/generateSumplete"
import { buildSumpleteHint, type SumpleteHint } from "./sumpleteHint"
import { SumpletePuzzle } from "./SumpletePuzzle"

// The hint builder says what the test scripts; the board is the real one, recorded so the test can read which
// numbers it was told to mark.
vi.mock("./sumpleteHint", () => ({ buildSumpleteHint: vi.fn() }))
const seen = vi.hoisted(() => ({ props: undefined as { highlighted?: ReadonlySet<string> } | undefined }))
vi.mock("./SumpleteBoard", async importOriginal => {
  const actual = await importOriginal<typeof import("./SumpleteBoard")>()
  return {
    SumpleteBoard: (props: Parameters<typeof actual.SumpleteBoard>[0]) => {
      seen.props = props
      return actual.SumpleteBoard(props)
    },
  }
})

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const puzzle = generateSumplete(SUMPLETE_CONFIG.starter.size, 4, SUMPLETE_CONFIG.starter)
const size = puzzle.grid.length
const keyOf = (cell: number) => `${Math.floor(cell / size)},${cell % size}`

const hintOf = (targets: [number, "strike" | "keep"][], key = "first"): SumpleteHint => ({
  key,
  params: {},
  cells: new Set(targets.map(([cell]) => keyOf(cell))),
  action: { key: "strike", count: targets.length },
  targets: new Map(targets.map(([cell, mark]) => [keyOf(cell), mark])),
})

const open = (hint: SumpleteHint) => {
  vi.mocked(buildSumpleteHint).mockReset()
  vi.mocked(buildSumpleteHint)
    .mockReturnValueOnce(hint)
    .mockReturnValue(hintOf([[8, "strike"]], "second"))
  const view = render(<SumpletePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />)
  const cells = () =>
    within(view.container)
      .getAllByRole("button")
      .filter(button => button.className.includes("aspect-square"))
  act(() => within(view.container).getByRole("button", { name: /hint/i }).click())
  const tap = (...squares: number[]) => squares.forEach(cell => act(() => cells()[cell].click()))
  const shown = () => view.container.textContent ?? ""
  return { tap, shown }
}

describe("SumpletePuzzle hint that stays", () => {
  beforeEach(() => {
    seen.props = undefined
  })

  it("keeps the hint when one of several decisions is carried out, and stops marking that number", () => {
    const { tap, shown } = open(
      hintOf([
        [0, "strike"],
        [1, "strike"],
        [2, "strike"],
      ])
    )
    expect([...seen.props!.highlighted!]).toEqual([keyOf(0), keyOf(1), keyOf(2)])
    tap(0)
    expect(shown()).toContain("first")
    expect([...seen.props!.highlighted!]).toEqual([keyOf(1), keyOf(2)])
  })

  it("ends the hint on the move that completes the last decision", () => {
    const { tap, shown } = open(
      hintOf([
        [0, "strike"],
        [1, "strike"],
      ])
    )
    tap(0, 1)
    expect(shown()).not.toContain("first")
    expect(seen.props!.highlighted).toBeUndefined()
  })

  it("ends the hint on a move elsewhere", () => {
    const { tap, shown } = open(
      hintOf([
        [0, "strike"],
        [1, "strike"],
      ])
    )
    tap(8)
    expect(shown()).not.toContain("first")
  })

  it("keeps a keep hint after the first tap, which only strikes the number on the way", () => {
    const { tap, shown } = open(
      hintOf([
        [0, "keep"],
        [1, "keep"],
      ])
    )
    tap(0)
    expect(shown()).toContain("first")
    expect([...seen.props!.highlighted!]).toEqual([keyOf(0), keyOf(1)])
    tap(0)
    expect([...seen.props!.highlighted!]).toEqual([keyOf(1)])
  })

  it("ends the hint when a tap goes past the target", () => {
    const { tap, shown } = open(
      hintOf([
        [0, "strike"],
        [1, "strike"],
      ])
    )
    tap(0, 0)
    expect(shown()).not.toContain("first")
  })

  it("keeps showing the hint it revealed after a following move", () => {
    const { tap, shown } = open(
      hintOf([
        [0, "strike"],
        [1, "strike"],
      ])
    )
    tap(0)
    expect(shown()).toContain("first")
    expect(shown()).not.toContain("second")
  })
})
