import { render, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SiteMapView } from "./SiteMapView"
import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"

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

const fork = (state: CellState, dirs: Direction[] = []): GridCell => ({
  type: "room",
  roomType: "fork",
  dirs: new Set(dirs),
  state,
})

const leafTreasure = (state: CellState, dirs: Direction[]): GridCell => ({
  type: "room",
  roomType: "treasure",
  dirs: new Set(dirs),
  state,
})

const straightCorridor = (state: CellState, dirs: Direction[]): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs),
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

  it("does not render a fogged room at all", () => {
    const { container } = render(<SiteMapView grid={makeGrid([[room("fogged"), empty]])} />)
    expect(container.querySelectorAll("g[transform]")).toHaveLength(0)
  })
})

// Finds the cell group by its exact translate transform, then checks whether it has a
// wall rect on the given relative edge (CELL = 44, so half = 22).
const hasWallRect = (container: HTMLElement, cx: number, cy: number, edge: "n" | "s" | "e" | "w") => {
  const g = Array.from(container.querySelectorAll("g")).find(
    el => el.getAttribute("transform") === `translate(${cx}, ${cy})`
  )
  if (!g) throw new Error(`no cell group at (${cx}, ${cy})`)
  const rectX = { n: -22, s: -22, w: -22, e: 18 }[edge]
  const rectY = { n: -22, s: 18, w: -22, e: -22 }[edge]
  return Array.from(g.querySelectorAll('rect[fill="#080502"]')).some(
    r => r.getAttribute("x") === String(rectX) && r.getAttribute("y") === String(rectY)
  )
}

describe("SiteMapView — junction merging", () => {
  // Grid layout: fork | void | fork, 1 row. PAD = CELL = 44, so cell centers land at
  // x = 44 + col*44 + 22: col 0 -> 66, col 1 (the shared void) -> 110, col 2 -> 154.
  it("opens the wall between two forks that each claim a side of the void between them", () => {
    // Neither fork has a real graph edge to the other; each claims its own adjacent void
    // cell, and the shared boundary should render with no wall on either side.
    const { container } = render(<SiteMapView grid={makeGrid([[fork("visible"), empty, fork("visible")]])} />)
    expect(hasWallRect(container, 110, 66, "e")).toBe(false)
    expect(hasWallRect(container, 154, 66, "w")).toBe(false)
  })

  it("does not merge non-junction rooms sharing a claimed void the same way", () => {
    // puzzle rooms don't claim void at all, so the shared cell renders as nothing and
    // each room keeps its own wall facing the gap.
    const { container } = render(<SiteMapView grid={makeGrid([[room("visible"), empty, room("visible")]])} />)
    expect(hasWallRect(container, 66, 66, "e")).toBe(true)
    expect(hasWallRect(container, 154, 66, "w")).toBe(true)
  })
})

describe("SiteMapView — diagonal claim stability across a hidden-passage reveal", () => {
  // (0,2) treasure -- (1,2) corridor -- (2,2) fork -- (2,1) corridor
  // (1,1) is a diagonal void cell that both the fork (offset -1,-1, flanks (1,2) and (2,1),
  // both real graph edges) and the treasure (offset 1,-1, flanks (1,2) real + (0,1) only
  // claimed-as-void) can claim. The fork's two real-edge flanks should always outrank the
  // treasure's one real + one incidental flank, regardless of scan order — this is the
  // exact shape that caused a hidden treasure's reveal to steal a wall-open cell out from
  // under an unrelated fork elsewhere on the map.
  const buildGrid = (treasureCell: GridCell): FloorGrid =>
    makeGrid([
      [empty, empty, treasureCell],
      [empty, empty, straightCorridor("reachable", ["n", "s"])],
      [empty, straightCorridor("reachable", ["e"]), fork("reachable", ["n", "w"])],
    ])

  // PAD = CELL = 44: col1 -> x=110, row1 -> y=110, row2 -> y=154
  const floorFillAt = (container: HTMLElement, cx: number, cy: number) => {
    const g = Array.from(container.querySelectorAll("g")).find(
      el => el.getAttribute("transform") === `translate(${cx}, ${cy})`
    )
    if (!g) throw new Error(`no cell group at (${cx}, ${cy})`)
    return g.querySelector("rect")?.getAttribute("fill")
  }

  it("keeps the fork's claim on the shared diagonal cell once the hidden treasure is revealed", () => {
    // Distinct states give the fork and treasure distinct floor tints, so whichever one
    // owns cell (1,1) can be identified from its rendered fill color.
    const hidden = render(<SiteMapView grid={buildGrid(empty)} />)
    const revealed = render(<SiteMapView grid={buildGrid(leafTreasure("visible", ["s"]))} />)

    const forkFill = floorFillAt(hidden.container, 154, 154)
    expect(floorFillAt(hidden.container, 110, 110)).toBe(forkFill)
    expect(floorFillAt(revealed.container, 110, 110)).toBe(forkFill)
  })

  it("breaks an exact flank-strength tie in favor of the more-established room", () => {
    // fork(2,0), dirs {n} -- (1,0) corridor -- (1,1) contested void -- (0,1) corridor -- treasure(0,2), dirs {w}
    // Here BOTH claimants have exactly one real-edge flank (fork's north, treasure's west)
    // plus one same-pass claimed-void flank (fork's east neighbor (2,1), treasure's south
    // neighbor (1,2)) — a genuine tie in flank strength. The already-completed fork should
    // still win over a treasure that only just became reachable by being revealed.
    const grid: FloorGrid = makeGrid([
      [empty, straightCorridor("reachable", ["e"]), leafTreasure("reachable", ["w"])],
      [straightCorridor("reachable", ["n", "s"]), empty, empty],
      [fork("completed", ["n"]), empty, empty],
    ])
    const { container } = render(<SiteMapView grid={grid} />)
    expect(floorFillAt(container, 110, 110)).toBe(floorFillAt(container, 66, 154))
  })
})

describe("SiteMapView — long corridor click target", () => {
  // jsdom doesn't implement scrollTo; SiteMapView calls it to center on explorerPos.
  Element.prototype.scrollTo = vi.fn()

  const findCell = (container: HTMLElement, cx: number, cy: number) =>
    Array.from(container.querySelectorAll("g")).find(
      el => el.getAttribute("transform") === `translate(${cx}, ${cy})`
    )

  it("puts a clickable target at the near end of a long visible corridor, routed to the far corner", () => {
    // fork(0,0) -- visible -- visible -- reachable corner(0,3). Only the corner has a real
    // click target normally; a long run like this could scroll it off screen entirely.
    const onClick = vi.fn()
    const grid = makeGrid([
      [
        fork("completed", ["e"]),
        straightCorridor("visible", ["e", "w"]),
        straightCorridor("visible", ["e", "w"]),
        straightCorridor("reachable", ["n", "e"]),
      ],
    ])
    const { container } = render(<SiteMapView grid={grid} onCellClick={onClick} explorerPos={[0, 0]} />)
    const nearCell = findCell(container, 110, 66)
    expect(nearCell?.style.cursor).toBe("pointer")
    fireEvent.click(nearCell!)
    expect(onClick).toHaveBeenCalledWith(0, 3)
  })

  it("does not reroute a corridor that's already its own corner", () => {
    const onClick = vi.fn()
    const grid = makeGrid([[fork("completed", ["e"]), corridor("reachable", true)]])
    const { container } = render(<SiteMapView grid={grid} onCellClick={onClick} explorerPos={[0, 0]} />)
    fireEvent.click(findCell(container, 110, 66)!)
    expect(onClick).toHaveBeenCalledWith(0, 1)
  })

  it("renders the near-end marker as a direction arrow, not a plain dot", () => {
    const grid = makeGrid([
      [fork("completed", ["e"]), straightCorridor("visible", ["e", "w"]), straightCorridor("reachable", ["n", "e"])],
    ])
    const { container } = render(<SiteMapView grid={grid} explorerPos={[0, 0]} />)
    const nearCell = findCell(container, 110, 66)
    expect(nearCell?.querySelector("polygon")).toBeTruthy()
    expect(nearCell?.querySelector("circle")).toBeNull()
  })

  it("hides the run-target marker the instant the explorer starts traveling elsewhere", () => {
    // The marker tracks the dot's *visual* (settled) position, not the raw explorerPos
    // prop — so as soon as a move is in flight, the old junction's markers disappear
    // immediately instead of lingering until the glide finishes.
    const grid = makeGrid([
      [fork("completed", ["e"]), straightCorridor("visible", ["e", "w"]), straightCorridor("reachable", ["n", "e"])],
    ])
    const { container, rerender } = render(<SiteMapView grid={grid} explorerPos={[0, 0]} />)
    expect(findCell(container, 110, 66)?.querySelector("polygon")).toBeTruthy()

    rerender(<SiteMapView grid={grid} explorerPos={[0, 2]} />)
    expect(findCell(container, 110, 66)?.querySelector("polygon")).toBeNull()
  })
})
