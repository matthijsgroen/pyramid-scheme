// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { StructureRowProps } from "./StructureRow"
import { StructureRow } from "./StructureRow"

afterEach(cleanup)

const props: StructureRowProps = {
  name: "Hut",
  found: 2,
  total: 4,
  parts: [{ id: "poles", name: "Poles" }, { id: "cloth", name: "Cloth" }, { id: "c" }, { id: "d" }],
  open: false,
  onToggle: () => {},
  labels: { progress: "2 van 4", built: "gebouwd", unknownPart: "???", toggle: "toggle" },
}

const row = (extra: Partial<StructureRowProps> = {}) =>
  render(
    <ul>
      <StructureRow {...props} {...extra} />
    </ul>
  )

describe("StructureRow", () => {
  it("closed shows the name and progress but no part names", () => {
    row()
    expect(screen.getByText("Hut")).toBeTruthy()
    expect(screen.getByText("2 van 4")).toBeTruthy()
    expect(screen.queryByText("Poles")).toBeNull()
    expect(screen.queryByText("???")).toBeNull()
  })

  it("opened shows found parts by name and the rest as unknown", () => {
    row({ open: true })
    expect(screen.getByText("Poles")).toBeTruthy()
    expect(screen.getByText("Cloth")).toBeTruthy()
    expect(screen.getAllByText("???")).toHaveLength(2)
  })

  it("a complete row reads built", () => {
    row({ found: 4, total: 4 })
    expect(screen.getByText("gebouwd")).toBeTruthy()
    expect(screen.queryByText("2 van 4")).toBeNull()
  })

  it("the toggle calls onToggle and carries aria-expanded", () => {
    const onToggle = vi.fn()
    row({ onToggle, open: true })
    const button = screen.getByRole("button")
    expect(button.getAttribute("aria-expanded")).toBe("true")
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
  })
})

describe("StructureRow new parts", () => {
  const withNew: Partial<StructureRowProps> = {
    parts: [
      { id: "poles", name: "Poles", newLabel: "NIEUW" },
      { id: "cloth", name: "Cloth" },
    ],
  }

  it("a closed row carries the new label in its accessible name", () => {
    row(withNew)
    expect(screen.getByRole("button").getAttribute("aria-label")).toContain("NIEUW")
    expect(screen.getByText("NIEUW")).toBeTruthy()
  })

  it("an open row badges only the new part", () => {
    row({ ...withNew, open: true })
    expect(screen.getAllByText("NIEUW")).toHaveLength(2)
    expect(screen.getByText("Poles").parentElement?.textContent).toContain("NIEUW")
    expect(screen.getByText("Cloth").parentElement?.textContent).not.toContain("NIEUW")
  })

  it("shows no badge when no part is new", () => {
    row({ open: true })
    expect(screen.queryByText("NIEUW")).toBeNull()
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Hut, toggle")
  })
})
