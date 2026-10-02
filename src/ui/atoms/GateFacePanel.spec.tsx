// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { GateFacePanel, type GateFaceOrder } from "./GateFacePanel"

afterEach(cleanup)

const order = (overrides: Partial<GateFaceOrder> = {}): GateFaceOrder => ({
  id: "plates",
  tiles: [
    { id: "0", glyph: "A", status: "inOrder", label: "first" },
    { id: "1", glyph: "B", status: "unwalked", label: "second" },
    { id: "2", glyph: "C", status: "outOfOrder", label: "third" },
  ],
  ...overrides,
})

const panel = (orders: GateFaceOrder[], markers: Parameters<typeof GateFacePanel>[0]["markers"] = []) =>
  render(
    <GateFacePanel
      title="t"
      hint="h"
      markers={markers}
      orders={orders}
      turnAroundLabel="back"
      onTurnAround={() => {}}
    />
  )

describe("the door's panel for a sequence", () => {
  it("lists the tiles in the order given, each carrying its status", () => {
    panel([order()])
    const items = screen.getAllByRole("listitem")
    expect(items.map(i => i.textContent)).toEqual(["A", "B", "C"])
    expect(items.map(i => i.getAttribute("data-status"))).toEqual(["inOrder", "unwalked", "outOfOrder"])
  })

  it("offers start again only when the order carries a reset, and calls it when pressed", () => {
    const onReset = vi.fn()
    panel([order()])
    expect(screen.queryByRole("button", { name: "again" })).toBeNull()
    cleanup()
    panel([order({ reset: { label: "again", onReset } })])
    fireEvent.click(screen.getByRole("button", { name: "again" }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it("says the run is spoiled only when a note is given", () => {
    panel([order({ note: "spoiled" })])
    expect(screen.getByText("spoiled")).toBeDefined()
    cleanup()
    panel([order()])
    expect(screen.queryByText("spoiled")).toBeNull()
  })

  it("draws no row of owner markers for a door with none", () => {
    panel([order()])
    expect(screen.getAllByRole("list")).toHaveLength(1)
    cleanup()
    panel([], [{ id: "a", icon: <span>x</span>, lit: true, label: "a" }])
    expect(screen.getAllByRole("list")).toHaveLength(1)
  })
})
