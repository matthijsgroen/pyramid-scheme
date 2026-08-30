import { render, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SiteMapView } from "./SiteMapView"
import { CELL, WALL_THICKNESS } from "./mapScale"
import { MAX_ZOOM, MIN_ZOOM } from "./useMapZoom"
import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"

// PAD === CELL in SiteMapView, so a cell at (row, col) always centers at this pixel —
// derived from the shared scale constant rather than hardcoded, so a future EM change
// doesn't silently break every position assumption in this file.
const cellCenter = (row: number, col: number) => ({
  cx: CELL + col * CELL + CELL / 2,
  cy: CELL + row * CELL + CELL / 2,
})

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
  roomType: "encounter",
  family: "sumplete",
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
  roomType: "encounter",
  family: "treasure-chest",
  dirs: new Set(dirs),
  state,
})

const straightCorridor = (state: CellState, dirs: Direction[]): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state,
})

// A portal room. With a stairId it renders as a stairhead (a staircase); without, entrance/exit by
// position.
const portal = (state: CellState, stairId?: string): GridCell => ({
  type: "room",
  roomType: "portal",
  stairId,
  dirs: new Set<Direction>(["s"]),
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
// wall rect on the given relative edge. North and west walls (and south and east) share
// an x,y origin — only width/height tell them apart — so all four dimensions are matched,
// not just position.
const hasWallRect = (container: HTMLElement, cx: number, cy: number, edge: "n" | "s" | "e" | "w") => {
  const g = Array.from(container.querySelectorAll("g")).find(
    el => el.getAttribute("transform") === `translate(${cx}, ${cy})`
  )
  if (!g) throw new Error(`no cell group at (${cx}, ${cy})`)
  const half = CELL / 2
  const rect = {
    n: { x: -half, y: -half, w: CELL, h: WALL_THICKNESS },
    s: { x: -half, y: half - WALL_THICKNESS, w: CELL, h: WALL_THICKNESS },
    w: { x: -half, y: -half, w: WALL_THICKNESS, h: CELL },
    e: { x: half - WALL_THICKNESS, y: -half, w: WALL_THICKNESS, h: CELL },
  }[edge]
  return Array.from(g.querySelectorAll('rect[fill="#080502"]')).some(
    r =>
      r.getAttribute("x") === String(rect.x) &&
      r.getAttribute("y") === String(rect.y) &&
      r.getAttribute("width") === String(rect.w) &&
      r.getAttribute("height") === String(rect.h)
  )
}

describe("SiteMapView — junction merging", () => {
  // Grid layout: fork | void | fork, 1 row.
  it("opens the wall between two forks that each claim a side of the void between them", () => {
    // Neither fork has a real graph edge to the other; each claims its own adjacent void
    // cell, and the shared boundary should render with no wall on either side.
    const { container } = render(<SiteMapView grid={makeGrid([[fork("visible"), empty, fork("visible")]])} />)
    expect(hasWallRect(container, cellCenter(0, 1).cx, cellCenter(0, 1).cy, "e")).toBe(false)
    expect(hasWallRect(container, cellCenter(0, 2).cx, cellCenter(0, 2).cy, "w")).toBe(false)
  })

  it("does not merge non-junction rooms sharing a claimed void the same way", () => {
    // puzzle rooms don't claim void at all, so the shared cell renders as nothing and
    // each room keeps its own wall facing the gap.
    const { container } = render(<SiteMapView grid={makeGrid([[room("visible"), empty, room("visible")]])} />)
    expect(hasWallRect(container, cellCenter(0, 0).cx, cellCenter(0, 0).cy, "e")).toBe(true)
    expect(hasWallRect(container, cellCenter(0, 2).cx, cellCenter(0, 2).cy, "w")).toBe(true)
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

    const forkFill = floorFillAt(hidden.container, cellCenter(2, 2).cx, cellCenter(2, 2).cy)
    expect(floorFillAt(hidden.container, cellCenter(1, 1).cx, cellCenter(1, 1).cy)).toBe(forkFill)
    expect(floorFillAt(revealed.container, cellCenter(1, 1).cx, cellCenter(1, 1).cy)).toBe(forkFill)
  })

  it("breaks an exact flank-strength tie in favor of the fork, regardless of either room's state", () => {
    // fork(2,0), dirs {n} -- (1,0) corridor -- (1,1) contested void -- (0,1) corridor -- treasure(0,2), dirs {w}
    // Here BOTH claimants have exactly one real-edge flank (fork's north, treasure's west)
    // plus one same-pass claimed-void flank (fork's east neighbor (2,1), treasure's south
    // neighbor (1,2)) — a genuine tie in flank strength. A first fix broke this tie by
    // progression state (completed > reachable), but that reintroduced the same instability
    // one level up: once the treasure was ALSO completed (its chest opened), both claimants
    // tied on state too and ownership flipped again. Room type doesn't change mid-session,
    // so ranking by that — fork over leaf room — must hold no matter what state either is in.
    //
    // Fork winning means (1,1) opens toward its own flanks, (1,0) [west] and (2,1) [south];
    // treasure winning would instead open (1,1) toward (0,1) [north] and (1,2) [east]. Wall
    // presence on a fixed side is used instead of floor tint, since matching states (as in
    // the "both completed" case) give both owners the identical tint either way.
    const buildGrid = (treasureState: CellState, forkState: CellState): FloorGrid =>
      makeGrid([
        [empty, straightCorridor(treasureState, ["e"]), leafTreasure(treasureState, ["w"])],
        [straightCorridor(treasureState, ["n", "s"]), empty, empty],
        [fork(forkState, ["n"]), empty, empty],
      ])

    for (const [treasureState, forkState] of [
      ["reachable", "completed"],
      ["completed", "completed"],
    ] as const) {
      const { container } = render(<SiteMapView grid={buildGrid(treasureState, forkState)} />)
      expect(hasWallRect(container, cellCenter(1, 1).cx, cellCenter(1, 1).cy, "n")).toBe(true)
      expect(hasWallRect(container, cellCenter(1, 1).cx, cellCenter(1, 1).cy, "w")).toBe(false)
    }
  })
})

describe("SiteMapView — portals never render as completed", () => {
  // A staircase/entrance/exit is a transition, not a task — the entrance is always marked explored
  // and used staircases complete, but they must not show the ✓ badge that implies a solved room.
  it("does not badge a completed stairhead (staircase) with the ✓", () => {
    // stairhead at (0,1); entrancePos is (0,0), so this is unambiguously a stairhead, not the entrance.
    const { container } = render(<SiteMapView grid={makeGrid([[room("reachable"), portal("completed", "s:main")]])} />)
    expect(container.textContent).not.toContain("✓")
  })

  it("still badges a completed regular room with the ✓ (control)", () => {
    const { container } = render(<SiteMapView grid={makeGrid([[room("completed"), empty]])} />)
    expect(container.textContent).toContain("✓")
  })
})

describe("SiteMapView — explorer dot snaps on floor switch", () => {
  Element.prototype.scrollTo = vi.fn()

  const dotAt = (container: HTMLElement) => container.querySelector('circle[fill="#ffd060"]')

  it("places the dot at the new floor's entrance immediately instead of animating a walk", () => {
    const floor0 = makeGrid([[room("completed"), room("reachable")]])
    const { container, rerender } = render(<SiteMapView grid={floor0} explorerPos={[0, 1]} currentFloor={0} />)

    // Floor switch: new grid + new currentFloor key → the dot remounts and snaps to (0,0),
    // rather than gliding from the previous floor's (0,1).
    const floor1 = makeGrid([[room("reachable"), room("reachable")]])
    rerender(<SiteMapView grid={floor1} explorerPos={[0, 0]} currentFloor={1} />)

    const { cx, cy } = cellCenter(0, 0)
    expect(dotAt(container)?.getAttribute("cx")).toBe(String(cx))
    expect(dotAt(container)?.getAttribute("cy")).toBe(String(cy))
  })
})

describe("SiteMapView — long corridor click target", () => {
  // jsdom doesn't implement scrollTo; SiteMapView calls it to center on explorerPos.
  Element.prototype.scrollTo = vi.fn()

  // ExplorerDot animates a move over real requestAnimationFrame callbacks. Left alone, a
  // rerender that changes explorerPos schedules one that's still pending when this test
  // file's environment tears down, and it fires afterward against a torn-down jsdom —
  // an unhandled exception that fails the whole run despite every test having passed.
  // Advancing a fake clock each call converges the animation synchronously instead.
  let mockRafTime = 0
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(cb => {
    mockRafTime += 50
    cb(mockRafTime)
    return 0
  })

  const findCell = (container: HTMLElement, cx: number, cy: number) =>
    Array.from(container.querySelectorAll("g")).find(el => el.getAttribute("transform") === `translate(${cx}, ${cy})`)

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
    const nearCell = findCell(container, cellCenter(0, 1).cx, cellCenter(0, 1).cy)
    expect(nearCell?.style.cursor).toBe("pointer")
    fireEvent.click(nearCell!)
    expect(onClick).toHaveBeenCalledWith(0, 3)
  })

  it("does not reroute a corridor that's already its own corner", () => {
    const onClick = vi.fn()
    const grid = makeGrid([[fork("completed", ["e"]), corridor("reachable", true)]])
    const { container } = render(<SiteMapView grid={grid} onCellClick={onClick} explorerPos={[0, 0]} />)
    fireEvent.click(findCell(container, cellCenter(0, 1).cx, cellCenter(0, 1).cy)!)
    expect(onClick).toHaveBeenCalledWith(0, 1)
  })

  it("renders the near-end marker as a direction arrow, not a plain dot", () => {
    const grid = makeGrid([
      [fork("completed", ["e"]), straightCorridor("visible", ["e", "w"]), straightCorridor("reachable", ["n", "e"])],
    ])
    const { container } = render(<SiteMapView grid={grid} explorerPos={[0, 0]} />)
    const nearCell = findCell(container, cellCenter(0, 1).cx, cellCenter(0, 1).cy)
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
    expect(findCell(container, cellCenter(0, 1).cx, cellCenter(0, 1).cy)?.querySelector("polygon")).toBeTruthy()

    rerender(<SiteMapView grid={grid} explorerPos={[0, 2]} />)
    expect(findCell(container, cellCenter(0, 1).cx, cellCenter(0, 1).cy)?.querySelector("polygon")).toBeNull()
  })
})

describe("SiteMapView — zoom", () => {
  Element.prototype.scrollTo = vi.fn()

  // The zoom is applied to the DOM directly (see useMapZoom): the map scales by transform, and the
  // sizer box around it carries the scaled footprint that the scroll area measures.
  const mapScale = (container: HTMLElement) => {
    const transform = container.querySelector("svg")!.style.transform
    return Number(/scale\(([\d.]+)\)/.exec(transform)?.[1])
  }
  const sizerSize = (container: HTMLElement) => {
    const sizer = container.querySelector("svg")!.parentElement!
    return { width: parseFloat(sizer.style.width), height: parseFloat(sizer.style.height) }
  }
  const scrollArea = (container: HTMLElement) => container.firstElementChild as HTMLElement

  const wheel = (container: HTMLElement, deltaY: number, times = 1) => {
    for (let i = 0; i < times; i++) {
      fireEvent.wheel(scrollArea(container), { deltaY, ctrlKey: true, clientX: 0, clientY: 0 })
    }
  }

  const twoByTwo = () =>
    makeGrid([
      [room("reachable"), room("reachable")],
      [room("reachable"), room("reachable")],
    ])

  it("scales the map up on a ctrl + wheel zoom-in, and grows its footprint to match", () => {
    const { container } = render(<SiteMapView grid={twoByTwo()} />)
    const before = sizerSize(container)
    expect(mapScale(container)).toBe(1)

    wheel(container, -100)

    const scale = mapScale(container)
    expect(scale).toBeGreaterThan(1)
    expect(sizerSize(container).width).toBeCloseTo(before.width * scale)
    expect(sizerSize(container).height).toBeCloseTo(before.height * scale)
  })

  it("leaves a plain wheel to scroll the map instead of zooming it", () => {
    const { container } = render(<SiteMapView grid={twoByTwo()} />)

    fireEvent.wheel(scrollArea(container), { deltaY: -100, clientX: 0, clientY: 0 })

    expect(mapScale(container)).toBe(1)
  })

  it("stops zooming at the limits, so the map can't be lost off either end", () => {
    const { container } = render(<SiteMapView grid={twoByTwo()} />)

    wheel(container, -400, 20)
    expect(mapScale(container)).toBeCloseTo(MAX_ZOOM)

    wheel(container, 400, 40)
    expect(mapScale(container)).toBeCloseTo(MIN_ZOOM)
  })

  it("keeps the zoom across a re-render, which would otherwise reset the footprint it wrote", () => {
    const { container, rerender } = render(<SiteMapView grid={twoByTwo()} />)
    wheel(container, -100)
    const zoomed = { scale: mapScale(container), sizer: sizerSize(container) }

    rerender(<SiteMapView grid={twoByTwo()} explorerPos={[0, 0]} />)

    expect(mapScale(container)).toBe(zoomed.scale)
    expect(sizerSize(container)).toEqual(zoomed.sizer)
  })
})

describe("SiteMapView — pinch zoom", () => {
  Element.prototype.scrollTo = vi.fn()

  const mapScale = (container: HTMLElement) =>
    Number(/scale\(([\d.]+)\)/.exec(container.querySelector("svg")!.style.transform)?.[1])
  const scrollArea = (container: HTMLElement) => container.firstElementChild as HTMLElement
  const fingers = (spread: number) => [
    { clientX: 100 - spread, clientY: 100 },
    { clientX: 100 + spread, clientY: 100 },
  ]

  it("grows the map as two fingers spread apart", () => {
    const { container } = render(<SiteMapView grid={makeGrid([[room("reachable"), room("reachable")]])} />)

    fireEvent.touchStart(scrollArea(container), { touches: fingers(50) })
    fireEvent.touchMove(scrollArea(container), { touches: fingers(100) })

    expect(mapScale(container)).toBeCloseTo(2)
  })

  it("ignores a one-finger drag, which still scrolls the map", () => {
    const { container } = render(<SiteMapView grid={makeGrid([[room("reachable"), room("reachable")]])} />)

    fireEvent.touchStart(scrollArea(container), { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchMove(scrollArea(container), { touches: [{ clientX: 140, clientY: 100 }] })

    expect(mapScale(container)).toBe(1)
  })
})

describe("SiteMapView — zoom reset", () => {
  Element.prototype.scrollTo = vi.fn()

  const mapScale = (container: HTMLElement) =>
    Number(/scale\(([\d.]+)\)/.exec(container.querySelector("svg")!.style.transform)?.[1])
  const scrollArea = (container: HTMLElement) => container.firstElementChild as HTMLElement

  it("returns to the default zoom on a double-click, however far the map was zoomed", () => {
    const { container } = render(<SiteMapView grid={makeGrid([[room("reachable"), room("reachable")]])} />)

    fireEvent.wheel(scrollArea(container), { deltaY: -300, ctrlKey: true, clientX: 0, clientY: 0 })
    expect(mapScale(container)).toBeGreaterThan(1)

    fireEvent.dblClick(scrollArea(container), { clientX: 0, clientY: 0 })

    expect(mapScale(container)).toBe(1)
  })
})

describe("SiteMapView — a wall only opens onto something drawn", () => {
  // A room's own graph edge is not enough: the cell it leads to may still be fogged (nothing is
  // drawn for it), and an opening onto nothing reads as a doorway the player can walk through.
  it("keeps the wall toward a neighbour that is still fogged", () => {
    const eastward: GridCell = {
      type: "room",
      roomType: "encounter",
      family: "sumplete",
      dirs: new Set<Direction>(["e"]),
      state: "reachable",
    }
    const { container } = render(
      <SiteMapView grid={makeGrid([[eastward, straightCorridor("fogged", ["w", "e"]), empty]])} />
    )
    expect(hasWallRect(container, cellCenter(0, 0).cx, cellCenter(0, 0).cy, "e")).toBe(true)
  })

  // Same hole, other cause, opposite cure: the corridor east is real and lit, and only invisible
  // because a fork further on had absorbed it into a footprint that is itself still fogged. The
  // passage is genuinely there — it draws on its own state, and the doorway onto it stays open.
  it("draws a lit corridor claimed by a room that is still fogged, and keeps the way in open", () => {
    const eastward: GridCell = {
      type: "room",
      roomType: "encounter",
      family: "sumplete",
      dirs: new Set<Direction>(["e"]),
      state: "reachable",
    }
    const { container } = render(
      <SiteMapView grid={makeGrid([[eastward, straightCorridor("visible", ["w"]), fork("fogged", ["w"])]])} />
    )
    const { cx, cy } = cellCenter(0, 1)
    expect(
      Array.from(container.querySelectorAll("g")).some(el => el.getAttribute("transform") === `translate(${cx}, ${cy})`)
    ).toBe(true)
    expect(hasWallRect(container, cellCenter(0, 0).cx, cellCenter(0, 0).cy, "e")).toBe(false)
  })
})
