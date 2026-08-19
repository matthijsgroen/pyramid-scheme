import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DIR, TURN_ANGLES, type LightbeamPuzzleData, type MirrorAngle } from "@/mods/puzzle/game/lightbeam/beam"
import { LightbeamBoard } from "./LightbeamBoard"

/**
 * Two mirrors in the same state, one an ordinary turn mirror and one a cut mirror on the stops given.
 * They never meet the beam, so what they are set to cannot change anything else on the board.
 */
const twoMirrors = (stops: readonly MirrorAngle[]): LightbeamPuzzleData => ({
  size: 9,
  sun: { at: { row: 8, col: 8 }, facing: DIR.up },
  shrine: { row: 0, col: 0 },
  fixed: [],
  movable: [
    { kind: "turnMirror", at: { row: 4, col: 1 }, angles: TURN_ANGLES },
    { kind: "turnMirror", at: { row: 4, col: 3 }, angles: stops.length ? stops : TURN_ANGLES },
  ],
})

const mirrorTurns = (container: HTMLElement): string[] =>
  [...container.querySelectorAll("polyline, line, polygon")]
    .map(shape => shape.parentElement?.getAttribute("style") ?? "")
    .filter(style => style.includes("rotate"))

describe("LightbeamBoard", () => {
  /**
   * A cut mirror standing at an aligned stop draws on exactly the diagonal an ordinary mirror at that stop
   * does, so it is only ever a different *object*, never a mirror lying about which way it sends the light.
   *
   * This used to guard a coincidence: the walk had four directions and reflected off a separate `face`
   * field, so a stop set and the faces beside it had to be authored in step or a story frame would draw
   * one thing and trace another. That field is gone — the walk reflects off the same angle the glyph is
   * turned to (§11.8 rule 6) — so the disagreement can no longer be typed, and what is left to check is
   * that the *drawing* does not treat a cut mirror's angles as a different scale from an ordinary one's.
   */
  it.each([
    { state: 0, stops: [2, 7], drawn: "45°" },
    { state: 1, stops: [1, 6], drawn: "135°" },
  ])("draws an aligned stop exactly where an ordinary mirror at $drawn sits", ({ state, stops }) => {
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
