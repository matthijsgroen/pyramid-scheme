import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, waitFor, within } from "@testing-library/react"
import { DIR, TURN_ANGLES, traceBeam, type LightbeamPuzzleData } from "@/mods/puzzle/game/lightbeam/beam"
import type { LightbeamPuzzle as LightbeamPuzzleBoard } from "@/mods/puzzle/game/lightbeam/generateLightbeam"
import { LightbeamBoard } from "./LightbeamBoard"
import { LightbeamPuzzle } from "./LightbeamPuzzle"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

/** The light leaves the disc and runs straight into the shrine — lit from the first render, no move needed. */
const straightRight: LightbeamPuzzleData = {
  size: 5,
  sun: { at: { row: 2, col: 0 }, facing: DIR.right },
  shrine: { row: 2, col: 4 },
  fixed: [],
  movable: [{ kind: "turnMirror", at: { row: 0, col: 0 }, angles: TURN_ANGLES }],
}

const surgeStrokes = (container: HTMLElement) =>
  [...container.querySelectorAll("svg.mix-blend-screen polyline")].filter(line =>
    (line.getAttribute("class") ?? "").includes("stroke-white")
  ).length

/**
 * The board saying what the player did, in the terms it is already made of: the light they proved runs the
 * route, and the shrine takes it.
 *
 * Drawn from one number — how far the finishing run has got — so the beam owns the first stretch of it and the
 * shrine the rest. The shrine flaring while the route behind it is still filling in would read as two
 * animations rather than one arrival.
 */
describe("the finishing run", () => {
  it("lays a thicker beam along the route as the run advances", () => {
    const segments = traceBeam(straightRight, [0]).path.length
    const part = render(<LightbeamBoard puzzle={straightRight} states={[0]} surge={0.35} onCycle={() => {}} />)
    const whole = render(<LightbeamBoard puzzle={straightRight} states={[0]} surge={1} onCycle={() => {}} />)

    expect(surgeStrokes(part.container)).toBeGreaterThan(0)
    expect(surgeStrokes(part.container)).toBeLessThan(segments)
    expect(surgeStrokes(whole.container)).toBe(segments)
  })

  it("draws no surge at all on a board that is not finishing", () => {
    const { container } = render(<LightbeamBoard puzzle={straightRight} states={[0]} onCycle={() => {}} />)
    expect(surgeStrokes(container)).toBe(0)
  })

  it("flares the shrine only once the light has arrived", () => {
    const arriving = render(<LightbeamBoard puzzle={straightRight} states={[0]} surge={0.3} onCycle={() => {}} />)
    const arrived = render(<LightbeamBoard puzzle={straightRight} states={[0]} surge={1} onCycle={() => {}} />)
    expect(arriving.container.querySelectorAll(".animate-flare")).toHaveLength(0)
    expect(arrived.container.querySelectorAll(".animate-flare").length).toBeGreaterThan(0)
  })

  /** The same rule every family's run is held to: nothing may move under a win that is already travelling. */
  it("refuses a tap while the light is on its way to the shrine", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const puzzle: LightbeamPuzzleBoard = {
      ...straightRight,
      initial: [0],
      solution: [0],
      techniqueCap: "entryRun",
      modes: [],
    }
    const { container } = render(
      <LightbeamPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    const mirror = within(container)
      .getAllByRole("button")
      .find(button => button.className.includes("aspect-square"))!
    const before = container.innerHTML
    mirror.click()
    expect(container.innerHTML).toBe(before)

    // And the run still finishes: the shell hears the solve and lands its banner.
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
    vi.unstubAllGlobals()
  })
})
