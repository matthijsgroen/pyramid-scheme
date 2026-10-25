// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { JourneyStops } from "./JourneyStops"

afterEach(cleanup)

const stops = [
  { n: 1, label: "First", state: "done" as const, dot: true, dotLabel: "News here" },
  { n: 2, label: "Second", state: "ahead" as const },
  { n: 3, label: "Third", state: "buried" as const },
]

describe("JourneyStops", () => {
  it("a done stop calls onStop with its number", () => {
    const onStop = vi.fn()
    render(<JourneyStops stops={stops} onStop={onStop} />)
    fireEvent.click(screen.getByRole("button", { name: /First/ }))
    expect(onStop).toHaveBeenCalledWith(1)
  })

  it("only done stops are buttons", () => {
    render(<JourneyStops stops={stops} onStop={() => {}} />)
    expect(screen.getAllByRole("button")).toHaveLength(1)
    expect(screen.getByText("Second")).toBeTruthy()
    expect(screen.getByText("Third")).toBeTruthy()
  })

  it("shows a dot on its stop", () => {
    render(<JourneyStops stops={stops} onStop={() => {}} />)
    expect(screen.getByRole("img", { name: "News here" })).toBeTruthy()
  })

  it("renders what the mods put under the stops", () => {
    render(
      <JourneyStops stops={stops} onStop={() => {}}>
        <p>mod card</p>
      </JourneyStops>
    )
    expect(screen.getByText("mod card")).toBeTruthy()
  })
})
