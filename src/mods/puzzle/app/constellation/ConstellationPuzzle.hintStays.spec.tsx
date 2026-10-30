// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, within } from "@testing-library/react"
import { act } from "react"
import { colOf, rowOf } from "@/mods/puzzle/game/constellation/constellation"
import { CONSTELLATION_CONFIG } from "@/mods/puzzle/game/constellation/constellationConfig"
import { generateConstellation } from "@/mods/puzzle/game/constellation/generateConstellation"
import { buildConstellationHint, type ConstellationHint } from "./constellationHint"
import { ConstellationPuzzle } from "./ConstellationPuzzle"

// The hint builder says what the test scripts; the board is the real one, recorded so the test can read which
// pairs it was told to mark.
vi.mock("./constellationHint", () => ({ buildConstellationHint: vi.fn() }))
const seen = vi.hoisted(() => ({
  props: undefined as { highlighted?: ReadonlySet<number>; focus?: number } | undefined,
}))
vi.mock("./ConstellationBoard", async importOriginal => {
  const actual = await importOriginal<typeof import("./ConstellationBoard")>()
  return {
    ConstellationBoard: (props: Parameters<typeof actual.ConstellationBoard>[0]) => {
      seen.props = props
      return actual.ConstellationBoard(props)
    },
  }
})

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
})
afterEach(cleanup)

const puzzle = generateConstellation(5, CONSTELLATION_CONFIG.expert)
// The pairs of the answer: lines the rules allow together, so drawing one never meets a crossing.
const answer = puzzle.solution.flatMap((count, pair) => (count > 0 ? [pair] : []))

const hintOf = (bounds: { pair: number; min?: number; max?: number }[], key = "first"): ConstellationHint => ({
  key,
  params: {},
  pairs: new Set(bounds.map(bound => bound.pair)),
  focus: bounds[0].pair,
  stars: new Set(),
  action: { key: "draw", count: bounds.length },
  bounds,
})

const open = (hint: ConstellationHint) => {
  vi.mocked(buildConstellationHint).mockReset()
  vi.mocked(buildConstellationHint)
    .mockReturnValueOnce(hint)
    .mockReturnValue(hintOf([{ pair: answer[3], min: 1 }], "second"))
  const view = render(
    <ConstellationPuzzle puzzle={puzzle} difficulty="expert" onSolved={() => {}} onCancel={() => {}} />
  )
  const stars = () =>
    within(view.container)
      .getAllByRole("button")
      .filter(button => button.className.includes("-translate-1/2"))
  act(() => within(view.container).getByRole("button", { name: /hint/i }).click())
  /** One drag along a pair, from its first star. */
  const draw = (...pairs: number[]) =>
    pairs.forEach(pair => {
      const { a, b } = puzzle.pairs[pair]
      const [from, to] = [puzzle.stars[a].cell, puzzle.stars[b].cell]
      const deltaRow = Math.sign(rowOf(puzzle.size, to) - rowOf(puzzle.size, from))
      const deltaCol = Math.sign(colOf(puzzle.size, to) - colOf(puzzle.size, from))
      act(() => {
        fireEvent.pointerDown(stars()[a], { clientX: 100, clientY: 100, pointerId: 1 })
        fireEvent.pointerMove(stars()[a], { clientX: 100 + deltaCol * 60, clientY: 100 + deltaRow * 60, pointerId: 1 })
        fireEvent.pointerUp(stars()[a], { pointerId: 1 })
      })
    })
  const shown = () => view.container.textContent ?? ""
  return { draw, shown }
}

describe("ConstellationPuzzle hint that stays", () => {
  beforeEach(() => {
    seen.props = undefined
  })

  it("has enough answer pairs to script the hints", () => {
    expect(answer.length).toBeGreaterThanOrEqual(4)
  })

  it("keeps the hint when one of several lines is drawn, and stops marking that pair", () => {
    const [a, b, c] = answer
    const { draw, shown } = open(
      hintOf([
        { pair: a, min: 1 },
        { pair: b, min: 1 },
        { pair: c, min: 1 },
      ])
    )
    expect([...seen.props!.highlighted!]).toEqual([a, b, c])
    draw(a)
    expect(shown()).toContain("first")
    expect([...seen.props!.highlighted!]).toEqual([b, c])
    expect(seen.props!.focus).toBe(b)
  })

  it("ends the hint on the line that completes the last decision", () => {
    const [a, b] = answer
    const { draw, shown } = open(
      hintOf([
        { pair: a, min: 1 },
        { pair: b, min: 1 },
      ])
    )
    draw(a, b)
    expect(shown()).not.toContain("first")
    expect(seen.props!.highlighted).toBeUndefined()
  })

  it("ends the hint on a line drawn elsewhere", () => {
    const [a, b, c] = answer
    const { draw, shown } = open(
      hintOf([
        { pair: a, min: 1 },
        { pair: b, min: 1 },
      ])
    )
    draw(c)
    expect(shown()).not.toContain("first")
  })

  it("keeps a double-line hint after the first line, which is only one of two", () => {
    const [a, b] = answer
    const { draw, shown } = open(
      hintOf([
        { pair: a, min: 2 },
        { pair: b, min: 1 },
      ])
    )
    draw(a)
    expect(shown()).toContain("first")
    expect([...seen.props!.highlighted!]).toEqual([a, b])
    draw(a)
    expect([...seen.props!.highlighted!]).toEqual([b])
  })

  it("ends the hint when a line goes past the pair's ceiling", () => {
    const [a, b] = answer
    const { draw, shown } = open(
      hintOf([
        { pair: a, min: 1, max: 1 },
        { pair: b, min: 1 },
      ])
    )
    draw(a, a)
    expect(shown()).not.toContain("first")
  })

  it("ends a refuse hint on any line, since nothing in it is left to carry out", () => {
    const [a, b] = answer
    const hint = { ...hintOf([{ pair: a, max: 0 }]), action: { key: "refuse" as const, count: 1 } }
    const { draw, shown } = open(hint)
    expect([...seen.props!.highlighted!]).toEqual([a])
    draw(b)
    expect(shown()).not.toContain("first")
  })

  it("keeps showing the hint it revealed after a following move", () => {
    const [a, b] = answer
    const { draw, shown } = open(
      hintOf([
        { pair: a, min: 1 },
        { pair: b, min: 1 },
      ])
    )
    draw(a)
    expect(shown()).not.toContain("second")
  })
})
