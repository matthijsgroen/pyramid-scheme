// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { JourneyList } from "./JourneyList"

afterEach(cleanup)

const groups = [
  { key: "a", header: <h3>Open tier</h3>, rows: [<p key="1">row one</p>, <p key="2">row two</p>], open: true },
  { key: "b", header: <h3>Closed tier</h3>, rows: [<p key="3">row three</p>], open: false },
]

describe("JourneyList", () => {
  it("an open group shows its header and rows", () => {
    render(<JourneyList groups={groups} />)
    expect(screen.getByText("Open tier")).toBeTruthy()
    expect(screen.getByText("row one")).toBeTruthy()
    expect(screen.getByText("row two")).toBeTruthy()
  })

  it("a closed group shows its header and none of its rows", () => {
    render(<JourneyList groups={groups} />)
    expect(screen.getByText("Closed tier")).toBeTruthy()
    expect(screen.queryByText("row three")).toBeNull()
  })

  it("shows the footer", () => {
    render(<JourneyList groups={groups} footer={<p>footer note</p>} />)
    expect(screen.getByText("footer note")).toBeTruthy()
  })

  it("shows the empty text when there are no groups", () => {
    render(<JourneyList groups={[]} emptyText="Nothing yet" />)
    expect(screen.getByText("Nothing yet")).toBeTruthy()
  })
})
