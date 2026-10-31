// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { JourneyStops } from "./JourneyStops"

afterEach(cleanup)

const stops = [
  { n: 1, state: "done" as const, dot: true, dotLabel: "News here" },
  { n: 2, state: "ahead" as const },
  { n: 3, state: "buried" as const },
]

describe("JourneyStops", () => {
  it("says the kind once and names each stop by kind and number", () => {
    render(<JourneyStops label="Site" stops={stops} onStop={() => {}} />)
    expect(screen.getAllByText("Site")).toHaveLength(1)
    expect(screen.getByLabelText("Site 2")).toBeTruthy()
  })

  it("a done stop calls onStop with its number", () => {
    const onStop = vi.fn()
    render(<JourneyStops label="Site" stops={stops} onStop={onStop} />)
    fireEvent.click(screen.getByRole("button", { name: "Site 1" }))
    expect(onStop).toHaveBeenCalledWith(1)
  })

  it("only done stops are buttons", () => {
    render(<JourneyStops label="Site" stops={stops} onStop={() => {}} />)
    expect(screen.getAllByRole("button")).toHaveLength(1)
    expect(screen.getByLabelText("Site 3")).toBeTruthy()
  })

  it("shows a dot on its stop", () => {
    render(<JourneyStops label="Site" stops={stops} onStop={() => {}} />)
    expect(screen.getByRole("img", { name: "News here" })).toBeTruthy()
  })

  it("renders what the mods put under the stops", () => {
    render(
      <JourneyStops label="Site" stops={stops} onStop={() => {}}>
        <p>mod card</p>
      </JourneyStops>
    )
    expect(screen.getByText("mod card")).toBeTruthy()
  })
})
