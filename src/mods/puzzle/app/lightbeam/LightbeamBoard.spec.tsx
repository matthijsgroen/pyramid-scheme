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

  // -------------------------------------------------------------------------------------------------
  // The fork, drawn (design doc §11.13). One mirror glyph, and a tick at each stop the piece is NOT in —
  // which is what replaced the `cut` boolean and the hollow plate it picked.
  // -------------------------------------------------------------------------------------------------

  /** The tick marks in a cell: every stroke that is not inside the rotating group the bar lives in. */
  const ticks = (container: HTMLElement, cell: number): SVGLineElement[] => {
    const glyphs = [...container.querySelectorAll("svg")].filter(svg => svg.querySelector("g > line"))
    return [...glyphs[cell].querySelectorAll("g:not([style]) > line")] as SVGLineElement[]
  }

  it("draws one tick per stop the piece is not in, so the count is the fork less one", () => {
    for (const [stops, expected] of [
      [[2, 6], 1],
      [[1, 3, 6], 2],
      [[0, 1, 2, 5, 6], 4],
    ] as const) {
      const { container } = render(<LightbeamBoard puzzle={twoMirrors(stops)} states={[0, 0]} onCycle={() => {}} />)
      // Cell 0 is the ordinary two-stop control; cell 1 is the piece under test.
      expect(ticks(container, 0)).toHaveLength(1)
      expect(ticks(container, 1)).toHaveLength(expected)
    }
  })

  /**
   * The tick lies **across** its bearing, not along it — the one thing the prototype missed (§11.13). A
   * radial tick is collinear with the beam whenever a stop's line is the line the beam leaves on, and the
   * beam is drawn over the pieces with `mix-blend-screen`, so it came out cream: the mark loses its meaning
   * and §9's "nothing but light is drawn amber" breaks in the same stroke.
   *
   * Asserted as geometry rather than as a picture: the tick's own direction must be perpendicular to the
   * radius from the cell centre to its midpoint. A radial tick would score 1 here; a tangential one scores 0.
   */
  it("lays every tick across its bearing, so the beam can never run along one", () => {
    const { container } = render(
      <LightbeamBoard puzzle={twoMirrors([0, 1, 2, 5, 6])} states={[0, 0]} onCycle={() => {}} />
    )
    for (const tick of ticks(container, 1)) {
      const at = (name: string) => Number(tick.getAttribute(name))
      const [mx, my] = [(at("x1") + at("x2")) / 2 - 50, (at("y1") + at("y2")) / 2 - 50]
      const [dx, dy] = [at("x2") - at("x1"), at("y2") - at("y1")]
      const radius = Math.hypot(mx, my)
      const along = Math.hypot(dx, dy)
      expect(radius).toBeGreaterThan(0)
      expect(Math.abs((mx * dx + my * dy) / (radius * along))).toBeLessThan(0.001)
    }
  })

  /**
   * Two mirrors at the same angle with different forks have to be *distinguishable*, and this is the case
   * §11.9 said the drawn angle could never carry: `[45°, 135°]` and `[45°, 157.5°]` both sitting at 45°.
   * The bars are identical by construction — that is asserted above — so the ticks are the whole of it.
   */
  it("tells two mirrors at the same angle apart by where their other stops are", () => {
    const drawn = (stops: readonly MirrorAngle[]) => {
      const { container } = render(<LightbeamBoard puzzle={twoMirrors(stops)} states={[0, 0]} onCycle={() => {}} />)
      return ticks(container, 1).map(tick => `${tick.getAttribute("x1")},${tick.getAttribute("y1")}`)
    }
    expect(drawn([2, 6])).not.toEqual(drawn([2, 7]))
  })
})
