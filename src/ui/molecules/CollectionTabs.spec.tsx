// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { CollectionTabs } from "./CollectionTabs"

afterEach(cleanup)

const tabs = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta · 1 nieuw" },
  { id: "c", label: "Gamma" },
]

const tabsOf = (selected: string, onSelect = vi.fn()) => {
  render(<CollectionTabs tabs={tabs} selected={selected} onSelect={onSelect} label="Made-up tabs" panelId="panel" />)
  return onSelect
}

describe("CollectionTabs", () => {
  it("is a tablist whose selected tab is aria-selected and controls the panel", () => {
    tabsOf("b")
    expect(screen.getByRole("tablist", { name: "Made-up tabs" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Beta · 1 nieuw" }).getAttribute("aria-selected")).toBe("true")
    expect(screen.getByRole("tab", { name: "Alpha" }).getAttribute("aria-selected")).toBe("false")
    expect(screen.getByRole("tab", { name: "Alpha" }).getAttribute("aria-controls")).toBe("panel")
  })

  it("a click selects that tab", () => {
    const onSelect = tabsOf("a")
    fireEvent.click(screen.getByRole("tab", { name: "Gamma" }))
    expect(onSelect).toHaveBeenCalledWith("c")
  })

  it("ArrowRight selects the next tab and moves focus to it", () => {
    const onSelect = tabsOf("a")
    fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "ArrowRight" })
    expect(onSelect).toHaveBeenCalledWith("b")
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Beta · 1 nieuw" }))
  })

  it("ArrowLeft wraps from the first to the last", () => {
    const onSelect = tabsOf("a")
    fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "ArrowLeft" })
    expect(onSelect).toHaveBeenCalledWith("c")
  })

  it("ignores other keys", () => {
    const onSelect = tabsOf("a")
    fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "x" })
    expect(onSelect).not.toHaveBeenCalled()
  })
})
