import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { CollectibleSlot } from "./CollectibleSlot"

afterEach(cleanup)

// The count badge (stackable junk): shows how many are held, and hides itself at 0 (a found-then-
// sold-out item stays collected with no badge). Other sections pass no count → bare tile.
describe("CollectibleSlot count badge", () => {
  it("shows the held count on a collected stackable slot", () => {
    render(<CollectibleSlot state="collected" symbol="𓂀" difficulty="junior" count={7} />)
    expect(screen.getByText("7")).toBeTruthy()
  })

  it("hides the badge when the count is 0 (found then sold out)", () => {
    render(<CollectibleSlot state="collected" symbol="𓂀" difficulty="junior" count={0} />)
    expect(screen.queryByText("0")).toBeNull()
  })

  it("shows no count badge when a section passes no count", () => {
    render(<CollectibleSlot state="collected" symbol="𓂀" difficulty="junior" />)
    // Nothing numeric — the plain collected tile.
    expect(screen.queryByText(/^\d+$/)).toBeNull()
  })
})
