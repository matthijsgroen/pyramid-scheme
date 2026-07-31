import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { CollectibleSlot } from "./CollectibleSlot"

afterEach(cleanup)

// Which states accept a click. A partial slot MUST, or the Collection screen can't act as the
// compass's target picker: HuntBar only offers an uncollected hieroglyph, so if only collected
// slots were clickable the hunt button would be unreachable (clickable ⟹ collected ⟹ not huntable).
// An empty slot deliberately stays inert — nothing to reveal, and nothing to hunt for a symbol you
// haven't turned up a single piece of.
describe("CollectibleSlot click targets", () => {
  it("forwards a click on a partial slot (so it can be picked as a hunt target)", () => {
    const onClick = vi.fn()
    render(
      <CollectibleSlot
        state="partial"
        symbol="𓂀"
        difficulty="junior"
        progress={{ found: 2, required: 5 }}
        onClick={onClick}
      />
    )
    fireEvent.click(screen.getByText("𓂀"))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("forwards a click on a collected slot", () => {
    const onClick = vi.fn()
    render(<CollectibleSlot state="collected" symbol="𓂀" difficulty="junior" onClick={onClick} />)
    fireEvent.click(screen.getByText("𓂀"))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("ignores a click on an empty slot", () => {
    const onClick = vi.fn()
    render(<CollectibleSlot state="empty" onClick={onClick} />)
    fireEvent.click(screen.getByText("?"))
    expect(onClick).not.toHaveBeenCalled()
  })
})

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
