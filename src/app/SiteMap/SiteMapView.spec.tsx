import { render, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SiteMapView } from "./SiteMapView"
import type { CellState, FloorGrid, GridCell } from "@/game/siteTypes"

// ── Grid factory ──────────────────────────────────────────────────────────────

const empty: GridCell = { type: "empty" }

const corridor = (state: CellState, isCorner = true): GridCell => ({
  type: "corridor",
  // Two non-opposing dirs = corner; opposing dirs = straight passthrough
  dirs: isCorner ? new Set(["n", "e"]) : new Set(["n", "s"]),
  state,
})

const room = (state: CellState): GridCell => ({
  type: "room",
  roomType: "puzzle",
  dirs: new Set(["s"]),
  state,
})

const makeGrid = (cells: GridCell[][]): FloorGrid => ({
  cells,
  rows: cells.length,
  cols: cells[0].length,
  entrancePos: [0, 0],
  exitPos: [0, 0],
  siteId: "test",
  staircases: {},
})

const clickableIn = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("g")).filter(el => el.style?.cursor === "pointer")

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SiteMapView — corridor clickability", () => {
  it("fires onCellClick for a reachable corridor corner", () => {
    const onClick = vi.fn()
    const { container } = render(
      <SiteMapView grid={makeGrid([[corridor("reachable", true), empty]])} onCellClick={onClick} />
    )
    const targets = clickableIn(container)
    expect(targets.length).toBeGreaterThan(0)
    fireEvent.click(targets[0])
    expect(onClick).toHaveBeenCalledWith(0, 0)
  })

  it("fires onCellClick for a completed corridor corner — navigation to visited nodes", () => {
    const onClick = vi.fn()
    const { container } = render(
      <SiteMapView grid={makeGrid([[corridor("completed", true), empty]])} onCellClick={onClick} />
    )
    const targets = clickableIn(container)
    expect(targets.length).toBeGreaterThan(0)
    fireEvent.click(targets[0])
    expect(onClick).toHaveBeenCalledWith(0, 0)
  })

  it("does not expose clickable target for a straight (non-corner) corridor", () => {
    const onClick = vi.fn()
    const { container } = render(
      <SiteMapView grid={makeGrid([[corridor("reachable", false), empty]])} onCellClick={onClick} />
    )
    expect(clickableIn(container)).toHaveLength(0)
  })

  it("does not expose clickable target for a fogged corridor corner", () => {
    const onClick = vi.fn()
    const { container } = render(
      <SiteMapView grid={makeGrid([[corridor("fogged", true), empty]])} onCellClick={onClick} />
    )
    expect(clickableIn(container)).toHaveLength(0)
  })
})

describe("SiteMapView — room clickability", () => {
  it("fires onCellClick for a reachable room", () => {
    const onClick = vi.fn()
    const { container } = render(<SiteMapView grid={makeGrid([[room("reachable"), empty]])} onCellClick={onClick} />)
    const targets = clickableIn(container)
    expect(targets.length).toBeGreaterThan(0)
    fireEvent.click(targets[0])
    expect(onClick).toHaveBeenCalledWith(0, 0)
  })

  it("fires onCellClick for a completed room — navigation back to solved nodes", () => {
    const onClick = vi.fn()
    const { container } = render(<SiteMapView grid={makeGrid([[room("completed"), empty]])} onCellClick={onClick} />)
    const targets = clickableIn(container)
    expect(targets.length).toBeGreaterThan(0)
    fireEvent.click(targets[0])
    expect(onClick).toHaveBeenCalledWith(0, 0)
  })

  it("does not expose clickable target for a fogged room", () => {
    const onClick = vi.fn()
    const { container } = render(<SiteMapView grid={makeGrid([[room("fogged"), empty]])} onCellClick={onClick} />)
    expect(clickableIn(container)).toHaveLength(0)
  })
})
