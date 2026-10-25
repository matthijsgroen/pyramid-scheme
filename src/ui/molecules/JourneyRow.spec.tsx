// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { JourneyRowProps } from "./JourneyRow"
import { JourneyRow } from "./JourneyRow"

afterEach(cleanup)

const base: JourneyRowProps = { name: "Made-up journey", status: "open", exterior: "pyramid", currentLabel: "NU" }
const row = (extra: Partial<JourneyRowProps> = {}) => render(<JourneyRow {...base} {...extra} />)

describe("JourneyRow", () => {
  it.each(["open", "current", "finished"] as const)("a %s row calls onOpen", status => {
    const onOpen = vi.fn()
    row({ status, onOpen })
    fireEvent.click(screen.getByRole("button", { name: /Made-up journey/ }))
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it("a locked row is aria-disabled, holds no button and fires nothing", () => {
    const onOpen = vi.fn()
    const { container } = row({ status: "locked", onOpen })
    expect(container.firstElementChild?.getAttribute("aria-disabled")).toBe("true")
    expect(screen.queryByRole("button")).toBeNull()
    fireEvent.click(screen.getByText("Made-up journey"))
    expect(onOpen).not.toHaveBeenCalled()
  })

  it("a locked row reads each need with its lit and unlit symbols", () => {
    const { container } = row({
      status: "locked",
      needs: [
        {
          label: "Find a piece",
          symbols: [
            { symbol: "A", held: true },
            { symbol: "B", held: false },
          ],
        },
        { label: "Find another" },
      ],
    })
    expect(screen.getByText("Find a piece")).toBeTruthy()
    expect(screen.getByText("Find another")).toBeTruthy()
    expect(container.querySelector('[data-held="true"]')?.textContent).toBe("A")
    expect(container.querySelector('[data-held="false"]')?.textContent).toBe("B")
  })

  it("only the current row shows its NU label", () => {
    row({ status: "current" })
    expect(screen.getByText("NU")).toBeTruthy()
    cleanup()
    row({ status: "open" })
    expect(screen.queryByText("NU")).toBeNull()
  })

  it("shows the note and the dot with its label", () => {
    row({ note: "A note", dot: true, dotLabel: "Something new" })
    expect(screen.getByText("A note")).toBeTruthy()
    expect(screen.getByRole("img", { name: "Something new" })).toBeTruthy()
  })

  it("shows no dot unless asked", () => {
    row({ dotLabel: "Something new" })
    expect(screen.queryByRole("img", { name: "Something new" })).toBeNull()
  })

  it("shows a mod's mark", () => {
    row({ mark: "★" })
    expect(screen.getByText("★")).toBeTruthy()
  })

  it("the chevron toggles the stops without firing onOpen", () => {
    const onOpen = vi.fn()
    const onToggle = vi.fn()
    row({ status: "finished", onOpen, stops: { label: "Show stops", open: false, onToggle } })
    const chevron = screen.getByRole("button", { name: "Show stops" })
    expect(chevron.getAttribute("aria-expanded")).toBe("false")
    fireEvent.click(chevron)
    expect(onToggle).toHaveBeenCalledOnce()
    expect(onOpen).not.toHaveBeenCalled()
  })

  it("an empty details list leaves no wrapper under the row", () => {
    const { container } = row({ details: [] })
    expect(container.firstElementChild?.childElementCount).toBe(1)
  })

  it("details that all render nothing leave a wrapper hidden while empty", () => {
    const { container } = row({ details: [null] })
    const wrapper = container.firstElementChild?.lastElementChild
    expect(wrapper?.className).toContain("empty:hidden")
    expect(wrapper?.childElementCount).toBe(0)
  })

  it("shows its children only while the stops are open", () => {
    const stops = { label: "Show stops", onToggle: () => {} }
    row({ stops: { ...stops, open: false }, children: <p>the stops</p> })
    expect(screen.queryByText("the stops")).toBeNull()
    cleanup()
    row({ stops: { ...stops, open: true }, children: <p>the stops</p> })
    expect(screen.getByText("the stops")).toBeTruthy()
  })
})
