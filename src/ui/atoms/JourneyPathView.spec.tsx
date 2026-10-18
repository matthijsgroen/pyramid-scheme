// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { JourneyPathView } from "./JourneyPathView"

const EMERALD = "rgb(16,185,129)"

const renderView = (unexploredNodes?: ReadonlySet<number>, buriedNodes?: ReadonlySet<number>) =>
  render(
    <JourneyPathView
      onClick={() => {}}
      label="go"
      inJourney
      levelCount={3}
      levelNr={2} // currentIdx = 1 → node index 0 completed, node 1 current, node 2 future
      journeyLength="long"
      exterior="pyramid"
      unexploredNodes={unexploredNodes}
      buriedNodes={buriedNodes}
    />
  )

const emeraldPulses = (container: HTMLElement) =>
  [...container.querySelectorAll("circle")].filter(c => c.getAttribute("stroke") === EMERALD)

describe("JourneyPathView unexplored-node marker", () => {
  it("pulses a completed node that has unvisited content", () => {
    const { container } = renderView(new Set([1])) // node 1 (1-based) = index 0 = completed
    expect(emeraldPulses(container)).toHaveLength(1)
  })

  it("pulses the current node when it is in the set", () => {
    const { container } = renderView(new Set([2])) // node 2 = index 1 = the current node
    expect(emeraldPulses(container)).toHaveLength(1)
  })

  it("does not pulse when there is nothing unexplored", () => {
    const { container } = renderView(new Set())
    expect(emeraldPulses(container)).toHaveLength(0)
  })
})

describe("JourneyPathView label", () => {
  it("is not drawn over the map, so a click on it can never reach a site node", () => {
    const { container, getByText } = renderView()
    const label = getByText(/go/)
    const map = container.querySelector("svg")!.parentElement!

    expect(map.contains(label)).toBe(false)
    expect(label.className).not.toContain("pointer-events-none")
  })
})

describe("JourneyPathView buried node", () => {
  const nodes = (container: HTMLElement, kind: string) => container.querySelectorAll(`[data-node="${kind}"]`)

  it("is not drawn as the current node, although it is the next to play", () => {
    const { container } = renderView(undefined, new Set([2]))
    expect(nodes(container, "buried")).toHaveLength(1)
    expect(nodes(container, "current")).toHaveLength(0)
  })

  it("leaves the current node alone when another one is buried", () => {
    const { container } = renderView(undefined, new Set([3]))
    expect(nodes(container, "current")).toHaveLength(1)
    expect(nodes(container, "buried")).toHaveLength(1)
  })

  it("takes the pulse when sand has moved there", () => {
    const { container } = renderView(new Set([2]), new Set([2]))
    expect(emeraldPulses(container)).toHaveLength(1)
  })
})
