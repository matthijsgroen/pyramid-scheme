// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { TierHeader } from "./TierHeader"

afterEach(cleanup)

describe("TierHeader", () => {
  it("a plain header shows title and progress and is not a button", () => {
    render(<TierHeader title="Tier" progress="1 van 5 klaar" />)
    expect(screen.getByText("Tier")).toBeTruthy()
    expect(screen.getByText("1 van 5 klaar")).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("a collapsible header toggles and carries aria-expanded", () => {
    const onToggle = vi.fn()
    render(<TierHeader title="Tier" progress="5 van 5 klaar" collapsible={{ open: false, onToggle, label: "Show" }} />)
    const button = screen.getByRole("button")
    expect(button.getAttribute("aria-expanded")).toBe("false")
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it("shows the dot with its label only when asked", () => {
    render(<TierHeader title="Tier" progress="p" dot dotLabel="News inside" />)
    expect(screen.getByRole("img", { name: "News inside" })).toBeTruthy()
    cleanup()
    render(<TierHeader title="Tier" progress="p" dotLabel="News inside" />)
    expect(screen.queryByRole("img")).toBeNull()
  })
})
