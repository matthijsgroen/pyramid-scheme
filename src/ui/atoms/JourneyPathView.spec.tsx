import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { JourneyPathView } from "./JourneyPathView"

const EMERALD = "rgb(16,185,129)"

const renderView = (unexploredNodes?: ReadonlySet<number>) =>
  render(
    <JourneyPathView
      onClick={() => {}}
      label="go"
      inJourney
      levelCount={3}
      levelNr={2} // currentIdx = 1 → node index 0 completed, node 1 current, node 2 future
      journeyLength="long"
      type="pyramid"
      unexploredNodes={unexploredNodes}
    />
  )

const emeraldPulses = (container: HTMLElement) =>
  [...container.querySelectorAll("circle")].filter(c => c.getAttribute("stroke") === EMERALD)

describe("JourneyPathView unexplored-node marker", () => {
  it("pulses a completed node that has unvisited content", () => {
    const { container } = renderView(new Set([1])) // node 1 (1-based) = index 0 = completed
    expect(emeraldPulses(container)).toHaveLength(1)
  })

  it("does not pulse the current node, even if it's in the set", () => {
    const { container } = renderView(new Set([2])) // node 2 = index 1 = the current node
    expect(emeraldPulses(container)).toHaveLength(0)
  })

  it("does not pulse when there is nothing unexplored", () => {
    const { container } = renderView(new Set())
    expect(emeraldPulses(container)).toHaveLength(0)
  })
})
