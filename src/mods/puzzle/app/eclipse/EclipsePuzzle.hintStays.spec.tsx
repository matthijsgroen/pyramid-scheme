// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import { ECLIPSE_CONFIG } from "@/mods/puzzle/game/eclipse/eclipseConfig"
import { generateEclipse } from "@/mods/puzzle/game/eclipse/generateEclipse"
import type { Mark } from "@/mods/puzzle/game/eclipse/eclipse"
import { buildEclipseHint, type EclipseHint } from "./eclipseHint"
import { EclipsePuzzle } from "./EclipsePuzzle"

// The hint builder says what the test scripts; the board is the real one, recorded so the test can read which
// squares it was told to mark.
vi.mock("./eclipseHint", () => ({ buildEclipseHint: vi.fn() }))
const seen = vi.hoisted(() => ({ props: undefined as { decided?: ReadonlySet<number>; focus?: number } | undefined }))
vi.mock("./EclipseBoard", async importOriginal => {
  const actual = await importOriginal<typeof import("./EclipseBoard")>()
  return {
    EclipseBoard: (props: Parameters<typeof actual.EclipseBoard>[0]) => {
      seen.props = props
      return actual.EclipseBoard(props)
    },
  }
})

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const puzzle = generateEclipse(4, ECLIPSE_CONFIG.starter)
// Given squares are printed, not tapped, so the squares a test names are the free ones, in board order.
const free = puzzle.given.flatMap((mark, cell) => (mark === undefined ? [cell] : []))

const last = free[free.length - 1]

const hintOf = (targets: [number, Mark][], key = "first"): EclipseHint => ({
  key,
  params: {},
  cells: new Set(),
  decided: new Set(targets.map(([cell]) => cell)),
  action: { key: "fillMixed", count: targets.length },
  targets: new Map(targets),
  focus: targets[0][0],
  links: new Set(),
})

const open = (hint: EclipseHint) => {
  vi.mocked(buildEclipseHint).mockReset()
  vi.mocked(buildEclipseHint)
    .mockReturnValueOnce(hint)
    .mockReturnValue(hintOf([[last, "sun"]], "second"))
  const view = render(<EclipsePuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />)
  const cells = () =>
    within(view.container)
      .getAllByRole("button")
      .filter(button => button.className.includes("aspect-square"))
  act(() => within(view.container).getByRole("button", { name: /hint/i }).click())
  const tap = (...squares: number[]) => squares.forEach(cell => act(() => cells()[cell].click()))
  const shown = () => view.container.textContent ?? ""
  return { tap, shown }
}

describe("EclipsePuzzle hint that stays", () => {
  beforeEach(() => {
    seen.props = undefined
  })

  it("keeps the hint when one of several decisions is carried out, and stops marking that square", () => {
    const { tap, shown } = open(
      hintOf([
        [free[0], "sun"],
        [free[1], "sun"],
        [free[2], "sun"],
      ])
    )
    expect([...seen.props!.decided!]).toEqual([free[0], free[1], free[2]])
    tap(free[0])
    expect(shown()).toContain("first")
    expect([...seen.props!.decided!]).toEqual([free[1], free[2]])
    expect(seen.props!.focus).toBe(free[1])
  })

  it("ends the hint on the move that completes the last decision", () => {
    const { tap, shown } = open(
      hintOf([
        [free[0], "sun"],
        [free[1], "sun"],
      ])
    )
    tap(free[0], free[1])
    expect(shown()).not.toContain("first")
    expect(seen.props!.decided).toBeUndefined()
  })

  it("ends the hint on a move elsewhere", () => {
    const { tap, shown } = open(
      hintOf([
        [free[0], "sun"],
        [free[1], "sun"],
      ])
    )
    tap(last)
    expect(shown()).not.toContain("first")
  })

  it("keeps a moon hint after the first tap, which only lays the sun on the way", () => {
    const { tap, shown } = open(
      hintOf([
        [free[0], "moon"],
        [free[1], "moon"],
      ])
    )
    tap(free[0])
    expect(shown()).toContain("first")
    expect([...seen.props!.decided!]).toEqual([free[0], free[1]])
    tap(free[0])
    expect([...seen.props!.decided!]).toEqual([free[1]])
  })

  it("ends the hint when a tap goes past the target", () => {
    const { tap, shown } = open(
      hintOf([
        [free[0], "sun"],
        [free[1], "sun"],
      ])
    )
    tap(free[0], free[0])
    expect(shown()).not.toContain("first")
  })

  it("ends the hint when a decided square is cleared again", () => {
    const { tap, shown } = open(hintOf([[free[0], "moon"]]))
    tap(free[0], free[0], free[0])
    expect(shown()).not.toContain("first")
  })

  it("keeps showing the hint it revealed after a following move", () => {
    const { tap, shown } = open(
      hintOf([
        [free[0], "sun"],
        [free[1], "sun"],
      ])
    )
    tap(free[0])
    expect(shown()).not.toContain("second")
    expect(buildEclipseHint).toHaveBeenCalledTimes(1)
  })
})
