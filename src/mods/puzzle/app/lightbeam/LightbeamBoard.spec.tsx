import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { LightbeamPuzzleData } from "@/mods/puzzle/game/lightbeam/beam"
import { LightbeamBoard } from "./LightbeamBoard"

/**
 * Two mirrors in the same state, one an ordinary turn mirror and one a cut mirror on the stop given.
 * They never meet the beam, so what they are set to cannot change anything else on the board.
 */
const twoMirrors = (stops: readonly number[]): LightbeamPuzzleData => ({
  size: 9,
  sun: { at: { row: 8, col: 8 }, facing: "up" },
  shrine: { row: 0, col: 0 },
  fixed: [],
  movable: [
    { kind: "turnMirror", at: { row: 4, col: 1 }, faces: ["/", "\\"] },
    { kind: "turnMirror", at: { row: 4, col: 3 }, faces: ["/", "\\"], angles: stops.length ? stops : undefined },
  ],
})

const mirrorTurns = (container: HTMLElement): string[] =>
  [...container.querySelectorAll("polyline, line, polygon")]
    .map(shape => shape.parentElement?.getAttribute("style") ?? "")
    .filter(style => style.includes("rotate"))

describe("LightbeamBoard", () => {
  /**
   * The load-bearing one, and the reason a board can carry a cut mirror while the walk still has four
   * directions (design doc §11.8): an aligned stop — 2 (45°) or 6 (135°) — has to be drawn on exactly the
   * diagonal the `face` beside it names. The moment the two disagree, a story frame shows a mirror lying
   * about which way it sends the light, and the whole prototype stops being evidence of anything.
   */
  it.each([
    { state: 0, stops: [2, 7], face: "/" },
    { state: 1, stops: [1, 6], face: "\\" },
  ])("draws an aligned stop on the same diagonal as the $face it names", ({ state, stops }) => {
    const { container } = render(
      <LightbeamBoard puzzle={twoMirrors(stops)} states={[state, state]} onCycle={() => {}} />
    )
    const [ordinary, cut] = mirrorTurns(container)
    expect(cut).toBe(ordinary)
  })

  it("turns a cut mirror off the diagonals when it is on a half-step stop", () => {
    const { container } = render(<LightbeamBoard puzzle={twoMirrors([1, 6])} states={[0, 0]} onCycle={() => {}} />)
    const [ordinary, cut] = mirrorTurns(container)
    expect(cut).not.toBe(ordinary)
    expect(cut).toContain("-22.5deg")
  })

  /**
   * A mirror line is the same line half a turn later, so every setting has two drawable angles and the
   * choice between them decides which way the piece appears to turn. Nothing in a still frame can catch
   * this — a mirror drawn 180° out is pixel-identical — and it is only wrong in the hand, which is where
   * a tap is read. So it is asserted: a tap turns a mirror by at most a quarter, and the ordinary mirror
   * keeps the clockwise quarter turn it had before the glyph learned about angles at all.
   */
  it.each([
    { kind: "an ordinary mirror", stops: undefined, expected: 90 },
    { kind: "a cut mirror", stops: [1, 6], expected: 67.5 },
    { kind: "a cut mirror", stops: [2, 7], expected: 67.5 },
  ])("turns $kind the short way round when it is tapped", ({ stops, expected }) => {
    const puzzle = twoMirrors(stops ?? [])
    const turn = (state: number) => {
      const { container } = render(<LightbeamBoard puzzle={puzzle} states={[state, state]} onCycle={() => {}} />)
      const drawn = mirrorTurns(container)[stops ? 1 : 0]
      return Number(drawn.match(/rotate\((-?[\d.]+)deg\)/)![1])
    }
    expect(turn(1) - turn(0)).toBe(expected)
  })
})
