import { render, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SiteMapView, approachCells, buildRoomClaims, footprintPath, tileRegionsFor } from "./SiteMapView"
import { NODE_OVER_ART_OPACITY, STANDING_ROOM_CLIP } from "./nodeArt"
import { ExplorerFigure, LIGHT_POOL_ID } from "./ExplorerDot"
import type { Rect, StateGroups } from "./tileRegions"
import { ARCH_H, ARCH_RISE, CELL, SIDE_W, WALL_H, cellCenter, cellLeft, cellTop } from "./mapScale"
import { ALL_STATES } from "./tileRegions"
import { MAX_ZOOM, MIN_ZOOM } from "./useMapZoom"
import type { CellState, DecorationKind, Direction, FloorGrid, GridCell } from "@/game/siteTypes"

// Cell positions come from mapScale's own geometry (the pitch is stretched to give every wall a
// place of its own), so a change there can't silently break every position assumption in this file.

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

// A portal room whose only way out runs east — the side approach, which takes the flight that walks
// across X rather than the one that comes toward the viewer.
const portalEast = (state: CellState, stairId?: string): GridCell => ({
  type: "room",
  roomType: "portal",
  stairId,
  dirs: new Set<Direction>(["e"]),
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

/** The cell between two chambers: a way through when linked, a dead end beside them when not. */
const corridorBetween = (linked: boolean): GridCell => ({
  type: "corridor",
  dirs: new Set<Direction>(linked ? ["w", "e"] : []),
  state: "completed",
})

const gateRoom = (dirs: Direction[], state: CellState = "reachable"): GridCell => ({
  type: "room",
  roomType: "encounter",
  family: "key-gate",
  tags: ["gate"],
  dirs: new Set(dirs),
  state,
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

// Walls are cells, not edges (see tileRegions.ts), so "is there a wall here" is a question about
// which region a CELL landed in — asserted on the region data rather than sniffed out of rendered SVG.
const regionsOf = (grid: FloorGrid) => tileRegionsFor(grid, buildRoomClaims(grid))

const coversSquare = (rects: readonly Rect[], row: number, col: number) =>
  rects.some(([x, y, w, h]) => x === cellLeft(col) && y === cellTop(row) && w === CELL && h === CELL)

// What the map draws in the thin gap on a cell's west side — floor where the way is open, wall where
// it is not, and nothing at all where it is the mouth of a passage still in the dark.
const westGapOf = (grid: FloorGrid, row: number, col: number): "floor" | "wall" | "nothing" => {
  const isGap = ([x, y, w, h]: Rect) => x === cellLeft(col) - SIDE_W && y === cellTop(row) && w === SIDE_W && h === CELL
  if (allRects(grid, g => [g.floorRoom, g.floorCorridor]).some(isGap)) return "floor"
  if (allRects(grid, g => [g.wallMass, g.wallFace]).some(isGap)) return "wall"
  return "nothing"
}

// Regions are grouped per tier now (a gated pocket is built of its own stone), and these assertions
// are about geometry rather than material, so they look across every tier the floor holds.
const allRects = (grid: FloorGrid, pick: (g: StateGroups) => Record<string, Rect[]>[]): Rect[] =>
  [...regionsOf(grid).values()].flatMap(groups => pick(groups).flatMap(part => Object.values(part).flat()))

const isWall = (grid: FloorGrid, row: number, col: number) =>
  coversSquare(
    allRects(grid, g => [g.wallMass, g.wallFace]),
    row,
    col
  )

// The state group a drawn cell landed in. A claimed cell borrows its owner's state, so this is how
// the map says which room owns a contested void cell.
const floorStateOf = (grid: FloorGrid, row: number, col: number) => {
  for (const tierGroups of regionsOf(grid).values()) {
    for (const part of [tierGroups.floorRoom, tierGroups.floorCorridor]) {
      for (const [state, rects] of Object.entries(part)) {
        if (coversSquare(rects, row, col)) return state
      }
    }
  }
  return null
}

describe("SiteMapView — junction merging", () => {
  // Grid layout: fork | void | fork, 1 row.
  it("opens the wall between two forks that each claim a side of the void between them", () => {
    // Neither fork has a real graph edge to the other; each claims its own adjacent void
    // cell, and the shared boundary should render with no wall on either side.
    const grid = makeGrid([[fork("visible"), empty, fork("visible")]])
    expect(isWall(grid, 0, 1)).toBe(false)
    expect(floorStateOf(grid, 0, 1)).toBe("visible")
  })

  it("does not merge non-junction rooms sharing a claimed void the same way", () => {
    // puzzle rooms don't claim void at all, so the shared cell renders as nothing and
    // each room keeps its own wall facing the gap.
    const grid = makeGrid([[room("visible"), empty, room("visible")]])
    expect(isWall(grid, 0, 1)).toBe(true)
    expect(floorStateOf(grid, 0, 1)).toBe(null)
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

  it("keeps the fork's claim on the shared diagonal cell once the hidden treasure is revealed", () => {
    // Distinct states put the fork and the treasure in distinct floor groups, so whichever one owns
    // cell (1,1) is named by the group that cell lands in.
    const hidden = buildGrid(empty)
    const revealed = buildGrid(leafTreasure("visible", ["s"]))

    const forkState = floorStateOf(hidden, 2, 2)
    expect(floorStateOf(hidden, 1, 1)).toBe(forkState)
    expect(floorStateOf(revealed, 1, 1)).toBe(forkState)
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
    // Fork winning means (1,1) joins the fork's footprint and takes the fork's state with it. Only
    // the differing-states case can say so: when both owners are in the SAME state the two
    // outcomes are pixel-for-pixel identical, so there is nothing left to assert.
    const buildGrid = (treasureState: CellState, forkState: CellState): FloorGrid =>
      makeGrid([
        [empty, straightCorridor(treasureState, ["e"]), leafTreasure(treasureState, ["w"])],
        [straightCorridor(treasureState, ["n", "s"]), empty, empty],
        [fork(forkState, ["n"]), empty, empty],
      ])

    const grid = buildGrid("reachable", "completed")
    expect(floorStateOf(grid, 1, 1)).toBe("completed")
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

describe("SiteMapView — explorer snaps on floor switch", () => {
  Element.prototype.scrollTo = vi.fn()

  // The explorer group carries the position, whether it drew as a character sprite or as the fallback
  // dot — so this asserts where the explorer IS without caring which of the two it got.
  const explorerAt = (container: HTMLElement) => container.querySelector("[data-explorer]")

  it("places the explorer at the new floor's entrance immediately instead of animating a walk", () => {
    const floor0 = makeGrid([[room("completed"), room("reachable")]])
    const { container, rerender } = render(<SiteMapView grid={floor0} explorerPos={[0, 1]} currentFloor={0} />)

    // Floor switch: new grid + new currentFloor key → the dot remounts and snaps to (0,0),
    // rather than gliding from the previous floor's (0,1).
    const floor1 = makeGrid([[room("reachable"), room("reachable")]])
    rerender(<SiteMapView grid={floor1} explorerPos={[0, 0]} currentFloor={1} />)

    const { cx, cy } = cellCenter(0, 0)
    expect(explorerAt(container)?.getAttribute("transform")).toBe(`translate(${cx}, ${cy})`)
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
    // No dot — only the invisible disc that catches the tap, which every marker carries.
    const circles = Array.from(nearCell?.querySelectorAll("circle") ?? [])
    expect(circles.every(c => c.getAttribute("fill") === "transparent")).toBe(true)
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
  // Void a lit room does not claim is bare stone — nothing is ever drawn there, so an opening onto
  // it reads as a doorway the player can walk through and cannot.
  it("keeps the wall toward void no lit room claims", () => {
    const grid = makeGrid([[fork("fogged"), empty, fork("reachable")]])
    expect(isWall(grid, 0, 1)).toBe(true)
  })

  // Fog is not void, but nor is a passage's whole route the map's to give away: drawing an unlit
  // corridor as nothing traced it through the stone, direction and length readable without walking it.
  // The passage is walled; only its MOUTH stays open, and that opening is what says the way carries on.
  it("hides an unexplored passage and leaves only its mouth open", () => {
    const eastward: GridCell = {
      type: "room",
      roomType: "encounter",
      family: "sumplete",
      dirs: new Set<Direction>(["e"]),
      state: "reachable",
    }
    const grid = makeGrid([[eastward, straightCorridor("fogged", ["w", "e"]), empty]])
    expect(isWall(grid, 0, 1)).toBe(true)
    expect(floorStateOf(grid, 0, 1)).toBe(null)
    // Between the lit room and the dark passage: the mouth.
    expect(westGapOf(grid, 0, 1)).toBe("nothing")
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
    const grid = makeGrid([[eastward, straightCorridor("visible", ["w"]), fork("fogged", ["w"])]])
    expect(floorStateOf(grid, 0, 1)).toBe("visible")
    expect(isWall(grid, 0, 1)).toBe(false)
  })
})

// ── Archways ──────────────────────────────────────────────────────────────────
// An arch stands at the way into a CHAMBER — a room with a footprint — and only where the bands either
// side of the opening are wall, so its jambs have corners to stand on. It is the one thing on the map
// painted OVER the explorer, which is what makes the player walk under it rather than over it.

const archesIn = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<SVGImageElement>("image")).filter(el =>
    (el.getAttribute("href") ?? "").includes("arch")
  )

// A dead-end treasure chamber. Its `treasure` tag is what makes it claim the cells around it — a footprint
// is what separates a place from a station on the way (see canClaimVoid).
const chamber = (state: CellState): GridCell => ({
  type: "room",
  roomType: "encounter",
  family: "treasure-chest",
  tags: ["treasure"],
  dirs: new Set<Direction>(["n"]),
  state,
})

// A corridor running down into that chamber: the chamber claims the cells around it, the mouth of the
// corridor included, so the way in is the gap at (1,1) — with stone either side to stand jambs on.
const doorwayGrid = () =>
  makeGrid([
    [empty, corridor("completed", false), empty],
    [empty, corridor("completed", false), empty],
    [empty, chamber("completed"), empty],
  ])

describe("archways", () => {
  it("stands an arch at the way into a chamber", () => {
    const { container } = render(<SiteMapView grid={doorwayGrid()} />)
    const arches = archesIn(container)
    expect(arches).toHaveLength(1)
    expect(arches[0].getAttribute("y")).toBe(String(cellTop(1) - WALL_H - ARCH_RISE))
    // A corner wide on each side of the doorway: the jambs stand in the wall's own thickness.
    expect(arches[0].getAttribute("x")).toBe(String(cellLeft(1) - SIDE_W))
    expect(arches[0].getAttribute("opacity")).toBe("1")
  })

  it("paints an arch after the explorer, so a doorway passes in front of the player", () => {
    // Only the air is above it (see the mood layer): weather is between the player and the world, an arch
    // is part of the world and stands in front of them in it.
    const { container } = render(<SiteMapView grid={doorwayGrid()} explorerPos={[2, 1]} />)
    const arch = archesIn(container)[0].parentElement!
    const explorer = container.querySelector("[data-explorer]")!
    expect(explorer.compareDocumentPosition(arch) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("fades the arch the player is standing in, either side of it", () => {
    for (const pos of [
      [0, 1],
      [1, 1],
    ] as const) {
      const { container } = render(<SiteMapView grid={doorwayGrid()} explorerPos={pos} />)
      const opacity = Number(archesIn(container)[0].getAttribute("opacity"))
      expect(opacity, `explorer at ${pos}`).toBeLessThan(1)
    }
  })

  it("stands its jambs on the floor with a shadow, drawn under the explorer", () => {
    // The arch is painted over the player because they walk UNDER it. They walk OVER its shadow, so the
    // shadow belongs with the floor: darkening their feet as they crossed the doorway would read as the
    // gateway lying on top of them.
    const grid = makeGrid([
      [empty, corridor("completed", false), empty],
      [empty, corridor("completed", false), empty],
      [empty, chamber("completed"), empty],
    ])
    const { container } = render(<SiteMapView grid={grid} explorerPos={[1, 1]} />)
    const shadow = container.querySelector<SVGPathElement>("[data-arch-shadow]")
    expect(shadow, "an arch casts on the floor it stands on").toBeTruthy()
    // One band under each jamb, and both at the arch's foot — ARCH_DROP below the wall line it pierces.
    const foot = Number(archesIn(container)[0].getAttribute("y")) + ARCH_H
    const bands = shadow!.getAttribute("d")!.match(/M\d+ (\d+)/g) ?? []
    expect(bands).toHaveLength(2)
    expect(bands.every(b => Number(b.split(" ")[1]) === foot)).toBe(true)
    // Before the explorer in document order, so the player walks over it rather than under it.
    const explorer = container.querySelector("[data-explorer]")
    expect(shadow!.compareDocumentPosition(explorer!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("draws no arch around an encounter node, which is a station and not a place", () => {
    // A puzzle room on the way through claims nothing, so it is not a chamber. Arching it put a gateway
    // either side of every puzzle in the world — a corridor with doors across it every second step.
    const station = makeGrid([
      [empty, corridor("completed", false), empty],
      [empty, room("completed"), empty],
      [empty, corridor("completed", false), empty],
    ])
    expect(archesIn(render(<SiteMapView grid={station} />).container)).toHaveLength(0)
  })

  it("gives a ward gate one STONE, with the arch standing on its sill", () => {
    // A doorway that is ALSO a rank seam: the chamber beyond is junior, the corridor into it starter. Both
    // the arch and the sill land in this one gap. The arch's middle is transparent so the sill shows
    // through it — without one the jambs stop in mid-air and the reveal runs straight into floor. What
    // must NOT happen is the two using different tiers' stone: a sandstone threshold inside a grey
    // gateway, which is what the ward gate used to look like.
    const seam = makeGrid([
      [empty, corridor("completed", false), empty],
      [empty, corridor("completed", false), empty],
      [empty, { ...chamber("completed"), difficulty: "junior" } as GridCell, empty],
    ])
    const { container } = render(<SiteMapView grid={seam} />)
    const arches = archesIn(container)
    expect(arches).toHaveLength(1)
    // The stone of the band it stands in, which here is the tier being entered.
    expect(arches[0].getAttribute("href")).toContain("junior")
    const sills = Array.from(container.querySelectorAll<SVGPathElement>("path")).filter(el =>
      (el.getAttribute("fill") ?? "").includes("sill")
    )
    expect(sills).toHaveLength(1)
    // The arch's stone, not the entered tier's — one opening, one material.
    // A gap between two rows takes the horizontal pattern; the vertical one is the same step turned.
    expect(sills[0].getAttribute("fill")).toContain("sill-h-junior")
  })

  it("draws no arch into the fog", () => {
    const fogged = makeGrid([
      [empty, corridor("fogged", false), empty],
      [empty, corridor("fogged", false), empty],
      [empty, chamber("completed"), empty],
    ])
    expect(archesIn(render(<SiteMapView grid={fogged} />).container)).toHaveLength(0)
  })
})

// ── Mood ──────────────────────────────────────────────────────────────────────
// The air is overlay only: a wash, drifting motes, and scarabs on the floor (moodSettings.ts). It must
// never be a second set of art, and never stand where there is no floor.

// ── The explorer ──────────────────────────────────────────────────────────────

// ── Torchlight ────────────────────────────────────────────────────────────────

describe("the place the explorer stands is lit", () => {
  // Both washes are one path each, so the cells they cover are countable by the moves in the `d`.
  // Cell squares only: the path also carries the bands joining one lit cell to the next.
  const litCounts = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<SVGPathElement>("[data-torch]")).map(
      el => (el.getAttribute("d")?.match(/h56v56h-56z/g) ?? []).length
    )

  it("lights the whole corridor RUN, not the tile stood on", () => {
    // A straight passage: standing in the middle lights it end to end, because a torch carried along a
    // corridor lights the corridor. Lighting one cell drew a bright square on a floor with no edge to it.
    const grid = makeGrid([
      [
        straightCorridor("completed", ["e"]),
        straightCorridor("completed", ["e", "w"]),
        straightCorridor("completed", ["e", "w"]),
        straightCorridor("completed", ["w"]),
      ],
    ])
    const { container } = render(<SiteMapView grid={grid} explorerPos={[0, 1]} revealAllCells />)
    const [lit] = litCounts(container)
    expect(lit).toBe(4)
  })

  it("lights a chamber's whole footprint from its own cell", () => {
    // Standing on the room's OWN cell, not one it claims: `claimedBy` has no entry for the owner, and
    // looking the owner up and stopping there lit a single square in the middle of the player's chamber.
    const grid = makeGrid([
      [empty, straightCorridor("completed", ["s"]), empty],
      [empty, chamber("completed"), empty],
      [empty, empty, empty],
    ])
    const { container } = render(<SiteMapView grid={grid} explorerPos={[1, 1]} revealAllCells />)
    const [lit] = litCounts(container)
    expect(lit).toBeGreaterThanOrEqual(1)
  })

  it("crossfades: both the place left and the place entered are drawn during a move", () => {
    // A path cannot tween between two shapes, so the fade is between two of them — the old place going
    // out and the new one coming in. Without it the wash snapped from one room to the next on arrival.
    const grid = makeGrid([
      [straightCorridor("completed", ["s"]), empty],
      [corridor("completed"), empty],
      [straightCorridor("completed", ["n"]), empty],
    ])
    const { container, rerender } = render(<SiteMapView grid={grid} explorerPos={[0, 0]} revealAllCells />)
    expect(container.querySelectorAll("[data-torch]")).toHaveLength(1)
    rerender(<SiteMapView grid={grid} explorerPos={[2, 0]} revealAllCells />)
    expect(container.querySelectorAll("[data-torch]")).toHaveLength(2)
  })

  it("draws no light when no one is on the floor", () => {
    const grid = makeGrid([[corridor("completed"), corridor("completed")]])
    const { container } = render(<SiteMapView grid={grid} revealAllCells />)
    expect(litCounts(container)).toEqual([])
  })
})

describe("the explorer stands in the room", () => {
  const spriteIn = (container: HTMLElement) => container.querySelector<SVGImageElement>("[data-explorer] image")

  it("stands taller than its cell, so its head is against the wall behind it", () => {
    // The question this answers: walking a corridor, is the character in FRONT of the wall at the far
    // side of it? The figure is bottom-anchored on the cell's floor line and taller than the cell, so its
    // head reaches into the band above — the face of that wall — and the explorer is drawn after the tile
    // layers, so it covers it. Standing in front of the back wall is what that overlap IS.
    const { container } = render(<SiteMapView grid={makeGrid([[corridor("completed", false)]])} explorerPos={[0, 0]} />)
    const sprite = spriteIn(container)!
    const height = Number(sprite.getAttribute("height"))
    expect(height).toBeGreaterThan(CELL)
    // Bottom on the floor line, top inside the band above it.
    const { cy } = cellCenter(0, 0)
    const top = cy + CELL / 2 - height
    expect(top).toBeLessThan(cy - CELL / 2)
    expect(top).toBeGreaterThanOrEqual(cy - CELL / 2 - WALL_H)

    // Drawn after the walls: the tile layer is the first child, the explorer comes later.
    const svg = container.querySelector("svg")!
    const explorer = container.querySelector("[data-explorer]")!
    expect(svg.firstElementChild!.compareDocumentPosition(explorer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("walks through the frames its facing has", () => {
    // One counter, taken modulo whatever the facing was drawn with — so this holds for the side view's
    // three frames and the front's four alike.
    const frames = new Set<string>()
    for (const step of [0, 1, 2, 3]) {
      const { container } = render(
        <svg>
          <ExplorerFigure facing="s" step={step} />
        </svg>
      )
      frames.add(container.querySelector("image")!.getAttribute("href")!)
    }
    expect(frames.size).toBeGreaterThan(1)
  })

  it("hands the walk cycle to CSS, so it keeps time without a render per frame", () => {
    // Every frame side by side inside a clip one frame wide, slid a whole frame at a time. If the span and
    // the step count ever disagree with how many frames were laid out, the legs land between two poses.
    const { container } = render(
      <svg>
        <ExplorerFigure facing="s" walking />
      </svg>
    )
    const strip = container.querySelector<SVGGElement>("g[style*='steps']")!
    const laidOut = strip.querySelectorAll("image").length
    expect(laidOut).toBeGreaterThan(1)
    expect(strip.style.animationTimingFunction).toBe(`steps(${laidOut})`)
    expect(strip.style.getPropertyValue("--walk-span")).toBe(`${-laidOut * 40}px`)
  })
})

describe("two chambers you can already walk between are one space", () => {
  // A footprint is several cells wide, and only the one cell-pair carrying the graph edge was open —
  // so the rest of the shared boundary stayed walled and a partition ran partway into a room the
  // player can walk straight across. Nothing about walkability or either footprint's shape changes;
  // the wall between them is the only thing that goes.
  const treasureRoom = (dirs: Direction[]): GridCell => ({
    type: "room",
    roomType: "encounter",
    family: "treasure-chest",
    tags: ["treasure"],
    dirs: new Set<Direction>(dirs),
    state: "completed",
  })

  /** Two claiming chambers with one corridor cell between them. Whether they are JOINED is whether
   * anything actually opens across that cell — the rooms' OWN dirs count, not just the corridor's, so
   * an "unlinked" pair has to face away from each other as well. */
  const twoChambers = (linked: boolean) =>
    makeGrid([
      [empty, empty, empty, empty, empty],
      [empty, treasureRoom([linked ? "e" : "n"]), corridorBetween(linked), treasureRoom([linked ? "w" : "n"]), empty],
      [empty, empty, empty, empty, empty],
    ])

  /** Is anything walled in the band between the two footprints — the side wall at column 3, a row
   * below the rooms' own cells so it is claim against claim rather than room against room? */
  const partitioned = (linked: boolean) => {
    const grid = twoChambers(linked)
    const claims = buildRoomClaims(grid)
    const regions = tileRegionsFor(grid, claims)
    const gap = [cellLeft(3) - SIDE_W, cellTop(2), SIDE_W, CELL]
    return [...regions.values()].some(groups =>
      ALL_STATES.some(state =>
        [...groups.wallMass[state], ...groups.wallFace[state]].some(rect => rect.every((n, i) => n === gap[i]))
      )
    )
  }

  it("drops the partition between them", () => {
    expect(buildRoomClaims(twoChambers(true)).joinedOwners.size).toBe(1)
    expect(partitioned(true)).toBe(false)
  })

  it("keeps it between two chambers that merely sit side by side", () => {
    expect(buildRoomClaims(twoChambers(false)).joinedOwners.size).toBe(0)
    expect(partitioned(false)).toBe(true)
  })
})

describe("a kind that lies on the floor still dresses a room", () => {
  // `mat` and `rubble` are named BOTH in the ranks' authored prop pools and in the scatter layer's own
  // kinds, and the two mean different objects: scatter lies on cells the player walks over, a room's
  // dressing stands on an empty claimed cell nobody walks. For a long while the prop layer simply
  // dropped these, so 77 authored dressing slots across the world drew nothing at all.
  const withDecoration = (decoration: DecorationKind) => {
    const room = chamber("completed")
    if (room.type !== "room") throw new Error("the chamber fixture stopped being a room")
    return makeGrid([
      [empty, corridor("completed", false), empty],
      [empty, { ...room, decoration }, empty],
      [empty, empty, empty],
    ])
  }
  // The scatter layer is bottom-anchored in the same box a prop uses, so a box count alone cannot tell
  // the two apart. Counting a floor kind AGAINST a standing one can: the scatter is identical between
  // the two renders, so any difference is the prop.
  const propBoxes = (decoration: DecorationKind) =>
    Array.from(
      render(
        <SiteMapView grid={withDecoration(decoration)} explorerPos={[0, 1]} revealAllCells />
      ).container.querySelectorAll("image")
    ).filter(el => el.getAttribute("height") === String(CELL + WALL_H)).length

  it("draws it standing, the same as any other prop", () => {
    expect(propBoxes("mat")).toBe(propBoxes("statue"))
    expect(propBoxes("rubblePile")).toBe(propBoxes("statue"))
  })
})

describe("a prop that carries a flame lights the floor", () => {
  // One pool belongs to the explorer's torch; a lit prop adds a second. Counting them is what separates
  // "the lamp glows" from "the explorer is standing next to it".
  const pools = (grid: FloorGrid) =>
    render(<SiteMapView grid={grid} explorerPos={[0, 1]} revealAllCells />).container.querySelectorAll(
      "[data-light-pool]"
    ).length

  const withProp = (decoration: DecorationKind) => {
    // Narrowed rather than cast: `chamber` is typed as the whole GridCell union, and spreading that
    // union offers `decoration` to EmptyCell as well.
    const room = chamber("completed")
    if (room.type !== "room") throw new Error("the chamber fixture stopped being a room")
    return makeGrid([
      [empty, corridor("completed", false), empty],
      [empty, { ...room, decoration }, empty],
      [empty, empty, empty],
    ])
  }

  it("draws a pool under a lamp and none under a prop with no flame", () => {
    expect(pools(withProp("lamp"))).toBe(pools(withProp("shelf")) + 1)
  })

  it("fills every pool from one shared gradient, however many are drawn", () => {
    // A lamp in every third chamber redeclaring the same gradient id is the failure this guards: the
    // definition belongs to the map, not to each pool.
    const { container } = render(<SiteMapView grid={withProp("lamp")} explorerPos={[0, 1]} revealAllCells />)
    expect(container.querySelectorAll(`#${LIGHT_POOL_ID}`)).toHaveLength(1)
    for (const pool of container.querySelectorAll("[data-light-pool]"))
      expect(pool.getAttribute("fill")).toBe(`url(#${LIGHT_POOL_ID})`)
  })
})

describe("the air on a floor", () => {
  const litGrid = () => makeGrid([[corridor("completed", false)], [chamber("completed")]])

  it("carries the rank's own air, and the hour it authors", () => {
    const { container } = render(<SiteMapView grid={litGrid()} />)
    expect(container.querySelectorAll(".map-mote").length).toBeGreaterThan(0)
    // Starter is the rank with vermin in it.
    expect(container.querySelectorAll(".map-scarab").length).toBeGreaterThan(0)

    const night = render(<SiteMapView grid={{ ...litGrid(), theme: "night" }} />)
    const washOf = (c: HTMLElement) =>
      Array.from(c.querySelectorAll<SVGRectElement>("svg > g > rect")).pop()?.getAttribute("fill")
    expect(washOf(night.container)).not.toBe(washOf(container))
  })

  it("keeps a scarab where it was as more of the floor is explored", () => {
    // The bug this is here for: a scarab picked its cell by index into the LIT cells, so every reveal
    // lengthened that list and every scarab landed somewhere else — they teleported across the map each
    // time the player opened up another corridor. The beetle was always there; the player had not seen
    // that corner yet.
    const halfLit = makeGrid([
      [corridor("completed", false), corridor("fogged", false)],
      [corridor("completed", false), corridor("fogged", false)],
      [chamber("completed"), corridor("fogged", false)],
    ])
    const fullyLit = makeGrid([
      [corridor("completed", false), corridor("completed", false)],
      [corridor("completed", false), corridor("completed", false)],
      [chamber("completed"), corridor("completed", false)],
    ])
    const spots = (grid: FloorGrid) =>
      Array.from(render(<SiteMapView grid={grid} />).container.querySelectorAll(".map-scarab")).map(
        el => `${el.getAttribute("x")},${el.getAttribute("y")}`
      )

    const before = spots(halfLit)
    const after = spots(fullyLit)
    // Exploring can only ever REVEAL one: every scarab visible before is in the same place after.
    expect(before.length).toBeGreaterThan(0)
    expect(after).toEqual(expect.arrayContaining(before))
  })

  it("puts nothing living where there is no lit floor", () => {
    // Fog is not a place a beetle can be: it is what the player has not seen.
    const dark = makeGrid([[corridor("fogged", false)], [chamber("fogged")]])
    expect(render(<SiteMapView grid={dark} />).container.querySelectorAll(".map-scarab")).toHaveLength(0)
  })
})

describe("a treasure room stands its own chest beside the marker", () => {
  // The node marker is centred on the cell and so is the explorer, so a chest drawn square on the cell
  // is a chest the player is standing inside. The art says what the room holds; the marker still says
  // whether it can be reached.
  const chestsIn = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<SVGImageElement>("image")).filter(el =>
      (el.getAttribute("href") ?? "").includes("chestProp")
    )

  const gridWith = (cell: GridCell) =>
    makeGrid([
      [empty, corridor("completed", false), empty],
      [empty, cell, empty],
    ])

  it("draws the chest in MAP space, not inside the cell's own transform", () => {
    // THE BUG THIS EXISTS FOR: clip-path resolves in the element's own transformed space, so art
    // nested inside a node's `<g transform="translate(cx, cy)">` was clipped by rectangles offset by
    // that cell's position — every chest in the game was cut away, and jsdom, which never rasterises,
    // reported them present. What catches it is the ancestry, not the element.
    const { container } = render(<SiteMapView grid={gridWith(chamber("reachable"))} revealAllCells />)
    const chest = chestsIn(container)[0]
    expect(chest.closest("g[transform]")).toBeNull()
    expect(chest.closest("g[clip-path]")).not.toBeNull()
    // In map space a sprite sits at its own cell, so its x is a map coordinate rather than a small
    // offset from the cell's centre.
    expect(Number(chest.getAttribute("x"))).toBeGreaterThan(CELL)
  })

  it("draws the chest out of the doorway, in the prop's own box", () => {
    // The fixture's only way out is north, so the chest stands at the SOUTH end of the cell — the far
    // end from where the player walks in.
    const { container } = render(<SiteMapView grid={gridWith(chamber("reachable"))} revealAllCells />)
    const chests = chestsIn(container)
    expect(chests).toHaveLength(1)
    expect(Number(chests[0].getAttribute("y"))).toBeGreaterThan(CELL / 2 - (CELL + WALL_H))
    expect(chests[0].getAttribute("height")).toBe(String(CELL + WALL_H))
  })

  it("draws none for a shop, whose goods are a stall rather than a sealed chest", () => {
    // Narrowed rather than cast: spreading the whole GridCell union offers `tags` to EmptyCell too.
    const room = chamber("reachable")
    if (room.type !== "room") throw new Error("the chamber fixture stopped being a room")
    const shop: GridCell = { ...room, tags: ["shop"] }
    expect(chestsIn(render(<SiteMapView grid={gridWith(shop)} revealAllCells />).container)).toHaveLength(0)
  })

  it("eases the marker back where the chest is under it, and leaves every other node alone", () => {
    const opacityOf = (cell: GridCell) => {
      const { container } = render(<SiteMapView grid={gridWith(cell)} revealAllCells />)
      const marker = container.querySelector<SVGGElement>("g[opacity]")
      return marker?.getAttribute("opacity")
    }
    expect(opacityOf(chamber("reachable"))).toBe(String(NODE_OVER_ART_OPACITY))
    expect(opacityOf(room("reachable"))).toBe("1")
  })
})

describe("a node's furniture is cut by the walls around it", () => {
  // The sprite is a cell wide and stands off-centre, so without a clip it spills into the stone beside
  // its room — which is what made a merchant's chest lie half inside a wall.
  const chestIn = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<SVGImageElement>("image")).find(el =>
      (el.getAttribute("href") ?? "").includes("chestProp")
    )

  const grid = makeGrid([
    [empty, corridor("completed", false), empty],
    [empty, chamber("reachable"), empty],
  ])

  it("clips it to its OWN room, not to every floor cell on the map", () => {
    // The map-wide clip is the union of all floor: furniture offset toward a wall passed through it and
    // appeared in the corridor on the other side. A room's own footprint is the shape that stops it.
    const { container } = render(<SiteMapView grid={grid} revealAllCells />)
    const clipped = chestIn(container)!.closest("g[clip-path]")
    const id = clipped?.getAttribute("clip-path")
    expect(id).toMatch(/^url\(#room-clip-chest:/)
    expect(id).not.toBe(`url(#${STANDING_ROOM_CLIP})`)
    expect(container.querySelectorAll(`clipPath[id^="room-clip-"]`).length).toBeGreaterThan(0)
  })

  it("leaves the headroom above the floor open, so a tall thing still crosses the wall band", () => {
    const { container } = render(<SiteMapView grid={grid} revealAllCells />)
    // `#id path` does not match inside <clipPath> in jsdom; ask the clip element itself for its path.
    const clip = container.querySelector(`#${STANDING_ROOM_CLIP}`)!.querySelector("path")!.getAttribute("d")!
    // Every rectangle in the clip starts a prop's headroom above the floor cell it belongs to, so the
    // topmost edge of the clip is higher than the topmost floor line.
    const tops = [...clip.matchAll(/M-?[\d.]+ (-?[\d.]+)h/g)].map(m => Number(m[1]))
    expect(Math.min(...tops)).toBe(cellTop(0) - (CELL + WALL_H))
  })
})

describe("a staircase is drawn as the flight it is", () => {
  const stairGrid = (stairAt: "entrance" | "exit") => {
    const grid = makeGrid([
      [empty, portal("reachable", "s1"), empty],
      [empty, corridor("completed", false), empty],
    ])
    // The floor's entrance decides direction: a stairhead standing on it is the way back up.
    return { ...grid, entrancePos: stairAt === "entrance" ? ([0, 1] as const) : ([1, 1] as const) }
  }

  const stairsIn = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<SVGImageElement>("image")).filter(el =>
      (el.getAttribute("href") ?? "").includes("stair-")
    )

  it("draws the flight where the rank has one, and puts the marker away under it", () => {
    const { container } = render(<SiteMapView grid={stairGrid("exit")} revealAllCells />)
    expect(stairsIn(container)).toHaveLength(1)
    const marker = container.querySelector<SVGGElement>("g[opacity]")
    expect(marker?.getAttribute("opacity")).toBe("0")
  })

  // Invisible, not absent: the shape is what gives the node its clickable area, so a stairhead that
  // stopped rendering one would be a room the player could see and not walk to.
  it("is still clickable with its marker invisible", () => {
    const onClick = vi.fn()
    const { container } = render(<SiteMapView grid={stairGrid("exit")} revealAllCells onCellClick={onClick} />)
    // The stairhead is at 0,1 — asking for THAT cell is what makes this more than a corridor click.
    const targets = clickableIn(container)
    for (const el of targets) fireEvent.click(el)
    expect(onClick).toHaveBeenCalledWith(0, 1)
  })

  it("draws the same flight at a rank with no stair art of its own", () => {
    // The flights live in `tiles/default/`, the way the explorer and the sand do, so a rank that has
    // painted none of its own still shows one: `tileUrl` falls back <tier>/<name> to default/<name>.
    const grid = { ...stairGrid("exit"), difficulty: "wizard" as const }
    const { container } = render(<SiteMapView grid={grid} revealAllCells />)
    const drawn = stairsIn(container)
    expect(drawn).toHaveLength(1)
    expect(drawn[0].getAttribute("href")).toContain("default/")
  })

  // The two side flights are painted from where the player stands, and that puts them on OPPOSITE
  // hands: you meet the descending one at its top tread and the climbing one at its bottom tread. One
  // mirror rule for both had every east-approached climb running backwards, up into the wall the
  // player had just come through (starter_1's second floor, the starter tomb's).
  it("turns the climbing flight the other way from the descending one on the same approach", () => {
    const sideStairGrid = (stairAt: "entrance" | "exit") => {
      const grid = makeGrid([[portalEast("reachable", "s1"), straightCorridor("completed", ["w"])]])
      return { ...grid, entrancePos: stairAt === "entrance" ? ([0, 0] as const) : ([0, 1] as const) }
    }
    const facing = (stairAt: "entrance" | "exit") => {
      const { container } = render(<SiteMapView grid={sideStairGrid(stairAt)} revealAllCells />)
      const [flight] = stairsIn(container)
      expect(flight.getAttribute("href")).toContain("-side")
      return flight.getAttribute("transform")
    }
    expect(facing("entrance")).not.toBe(facing("exit"))
  })
})

describe("the player is drawn among the furniture, not always over it", () => {
  // Two things stand on a map: the explorer and what a room holds. Which occludes which is the FLOOR
  // LINE — a chest at the front of a chamber is nearer the viewer than a player at its back, and the
  // player should pass behind it. Sorting by the sprite's top instead would put a tall statue at the
  // back in front of a low chest at the front.
  const chamberAt = (row: number) => {
    const cells: GridCell[][] = [
      [empty, corridor("completed", false), empty],
      [empty, empty, empty],
      [empty, empty, empty],
    ]
    cells[row][1] = chamber("reachable")
    return makeGrid(cells)
  }

  const orderOf = (container: HTMLElement) => {
    const all = Array.from(container.querySelectorAll("image, [data-explorer]"))
    const chest = all.findIndex(el => (el.getAttribute("href") ?? "").includes("chestProp"))
    const explorer = all.findIndex(el => el.hasAttribute("data-explorer"))
    return { chest, explorer }
  }

  it("draws the player in front of a chest standing further back", () => {
    // Chest in the top row, player below it: the chest's floor line is higher up the page.
    const { container } = render(<SiteMapView grid={chamberAt(0)} explorerPos={[2, 1]} revealAllCells />)
    const { chest, explorer } = orderOf(container)
    expect(chest).toBeGreaterThanOrEqual(0)
    expect(explorer).toBeGreaterThan(chest)
  })

  it("draws the player behind a chest standing nearer the viewer", () => {
    const { container } = render(<SiteMapView grid={chamberAt(2)} explorerPos={[0, 1]} revealAllCells />)
    const { chest, explorer } = orderOf(container)
    expect(chest).toBeGreaterThanOrEqual(0)
    expect(chest).toBeGreaterThan(explorer)
  })
})

// The way OUT is a doorway cut in the same wall a ward is, so it is placed the same way — on the far
// side of its own cell — and it loses its marker for the stairhead's reason: the art IS the node, and
// unlike a gate it carries no key colour and no state to convey.
describe("the way out is drawn as a doorway", () => {
  const exitGrid = () => {
    const grid = makeGrid([
      [
        straightCorridor("completed", ["e"]),
        { type: "room", roomType: "portal", dirs: new Set<Direction>(["w"]), state: "reachable" },
      ],
    ])
    return { ...grid, entrancePos: [0, 0] as const, exitPos: [0, 1] as const }
  }

  it("draws the exit tile on the far side of its cell, away from the way in", () => {
    const { container } = render(<SiteMapView grid={exitGrid()} revealAllCells />)
    const img = Array.from(container.querySelectorAll<SVGImageElement>("image")).find(el =>
      (el.getAttribute("href") ?? "").includes("/exit")
    )
    expect(img, "the exit drew no art at all").toBeDefined()
    // Approached from the west, so the doorway is on the cell's EAST seam.
    expect(Number(img!.getAttribute("x"))).toBe(cellLeft(1) + CELL + SIDE_W / 2 - CELL / 2)
  })

  it("puts the marker away under it", () => {
    const { container } = render(<SiteMapView grid={exitGrid()} revealAllCells />)
    const marker = container.querySelector<SVGGElement>("g[opacity]")
    expect(marker?.getAttribute("opacity")).toBe("0")
  })
})

// TWO THIRDS OF THE GATES IN THE WORLD STAND ON A CORNER — only `ns` and `ew` run straight through —
// and on a corner the way you came in and the way that is sealed are at right angles. Aiming the bars
// "opposite the approach" therefore hung 331 of the 489 on a wall the pocket was not behind.
describe("a gate's bars face the pocket it shuts", () => {
  // entrance corridor, then a corner gate whose only other way out runs NORTH into a sealed pocket.
  const cornerGateGrid = () => {
    const grid = makeGrid([
      [empty, straightCorridor("reachable", ["s"])],
      [straightCorridor("completed", ["e"]), gateRoom(["w", "n"])],
    ])
    return { ...grid, entrancePos: [1, 0] as const }
  }

  const gateImage = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<SVGImageElement>("image")).find(el =>
      (el.getAttribute("href") ?? "").includes("/gate")
    )

  it("puts them on the sealed side, not on the side away from the player", () => {
    const { container } = render(<SiteMapView grid={cornerGateGrid()} revealAllCells />)
    const img = gateImage(container)
    expect(img, "the gate drew no art at all").toBeDefined()
    // North of its own cell: x on the cell's own column, and hung in the MIDDLE of the band above it —
    // its lower edge would put the grille below the opening, in the room rather than the doorway, and
    // its upper edge would lift it clear of the floor it is barring.
    expect(Number(img!.getAttribute("x"))).toBe(cellLeft(1))
    expect(Number(img!.getAttribute("y"))).toBe(cellTop(1) - WALL_H / 2 - (CELL + WALL_H))
  })

  // Sealed EAST: entrance corridor, the gate, then the pocket beyond it to the right.
  it("puts them on the east seam when the pocket is east", () => {
    const grid = {
      ...makeGrid([[straightCorridor("completed", ["e"]), gateRoom(["w", "e"]), straightCorridor("reachable", ["w"])]]),
      entrancePos: [0, 0] as const,
    }
    const { container } = render(<SiteMapView grid={grid} revealAllCells />)
    const img = Array.from(container.querySelectorAll<SVGImageElement>("image")).find(el =>
      (el.getAttribute("href") ?? "").includes("/gate")
    )
    expect(img, "the gate drew no art at all").toBeDefined()
    // The seam AFTER the gate's cell: it starts at cellLeft(c) + CELL and is SIDE_W wide, so the
    // sprite's centre is half a seam past the cell's right edge — to the RIGHT of its own marker.
    expect(Number(img!.getAttribute("x"))).toBe(cellLeft(1) + CELL + SIDE_W / 2 - CELL / 2)
    expect(img!.getAttribute("href")).toContain("-side")
  })

  it("draws the face-on tile for a pocket sealed to the north, not the side one", () => {
    const { container } = render(<SiteMapView grid={cornerGateGrid()} revealAllCells />)
    expect(gateImage(container)!.getAttribute("href")).not.toContain("-side")
  })

  // A gate is hung IN a doorway, so it is the nearer of the two: the arch is the masonry of the opening
  // and the gate is what has been fitted into it. Sorted by floor line among the furniture, the gate's
  // own head came out behind the beam of the arch it stands in.
  it("draws in front of the archway it is fitted into", () => {
    const grid = cornerGateGrid()
    const { container } = render(<SiteMapView grid={grid} revealAllCells />)
    const hrefs = Array.from(container.querySelectorAll<SVGImageElement>("image")).map(
      el => el.getAttribute("href") ?? ""
    )
    const gate = hrefs.findIndex(h => h.includes("/gate"))
    const arches = hrefs.map((h, i) => (h.includes("/arch") ? i : -1)).filter(i => i >= 0)
    expect(gate).toBeGreaterThanOrEqual(0)
    for (const arch of arches) expect(gate).toBeGreaterThan(arch)
  })

  // A gate is drawn across the mouth of a way through, so the player passes BEHIND it — and a barrier
  // that hid him would be a wall. The archway already does this for the two cells it spans.
  it("goes see-through while the player is standing in it", () => {
    const grid = cornerGateGrid()
    const clear = render(<SiteMapView grid={grid} revealAllCells explorerPos={[1, 0]} />)
    expect(gateImage(clear.container)!.getAttribute("opacity")).toBeNull()

    const under = render(<SiteMapView grid={grid} revealAllCells explorerPos={[1, 1]} />)
    expect(Number(gateImage(under.container)!.getAttribute("opacity"))).toBeLessThan(1)
  })
})

// Cells do not touch: the map leaves SIDE_W between columns and WALL_H between rows for the walls seen
// edge-on. A clip built from cell rects alone therefore has a hairline of nothing down every join, and
// the ward gate straddles a join on purpose — it stands on the sill laid there — so the strip holding
// its bars was cut away and its two jambs drew as separate posts.
describe("a footprint clip bridges the seams between its own cells", () => {
  const subpaths = (d: string) => d.split("M").length - 1

  it("adds a rect for the gap between two cells side by side", () => {
    expect(subpaths(footprintPath(["0,0", "0,1"]))).toBe(3)
    expect(subpaths(footprintPath(["0,0", "1,0"]))).toBe(3)
  })

  it("adds nothing between cells that do not touch", () => {
    expect(subpaths(footprintPath(["0,0", "0,2"]))).toBe(2)
  })

  it("counts each seam once, however the cells are ordered", () => {
    expect(subpaths(footprintPath(["0,1", "0,0"]))).toBe(3)
  })
})

// A gate's bars are drawn on the FAR side of its own square, so the map has to know which of a cell's
// neighbours you arrive from. Everything else on the map is drawn on its own square.
describe("the cell you approach a node from", () => {
  it("is the neighbour toward the entrance, not the one beyond", () => {
    // entrance ─ corridor ─ gate ─ corridor: the gate is entered from the WEST, and the corridor
    // BEYOND it must not be mistaken for the way you came.
    const grid = makeGrid([
      [
        straightCorridor("completed", ["e"]),
        straightCorridor("completed", ["w", "e"]),
        gateRoom(["w", "e"]),
        straightCorridor("fogged", ["w"]),
      ],
    ])
    const approach = approachCells(grid)
    expect(approach.get("0,2")).toEqual([0, 1])
    // and the cell beyond is approached THROUGH the gate, which is what makes it sealed.
    expect(approach.get("0,3")).toEqual([0, 2])
  })

  it("leaves the entrance itself with nothing in front of it", () => {
    const grid = makeGrid([[straightCorridor("completed", ["e"]), straightCorridor("completed", ["w"])]])
    expect(approachCells(grid).get("0,0")).toBeUndefined()
  })
})

describe("a stair's torch lights the floor beside it", () => {
  it("lays the pool at the flame, not at the middle of the cell", () => {
    // The cresset stands at the edge of the mouth. A pool at the cell's centre fell under the shaft —
    // the one part of the tile drawn near-black over it — so the torch lit nothing anyone could see.
    const grid = makeGrid([
      [empty, portal("reachable", "s1"), empty],
      [empty, corridor("completed", false), empty],
    ])
    const { container } = render(<SiteMapView grid={{ ...grid, entrancePos: [1, 1] }} revealAllCells />)
    const pools = Array.from(container.querySelectorAll("[data-light-pool]"))
    expect(pools.length).toBeGreaterThan(0)
    const moved = pools.some(pool => {
      const g = pool.closest("g[transform]")
      const m = /translate\(([-\d.]+), ([-\d.]+)\)/.exec(g?.getAttribute("transform") ?? "")
      if (!m) return false
      const { cx } = cellCenter(0, 1)
      return Math.abs(Number(m[1]) - cx) > CELL / 4
    })
    expect(moved).toBe(true)
  })

  // Only the two DESCENDING tiles have a cresset painted on them. The climbing flights were lit the
  // same way regardless, so a pool of torchlight lay on the floor beside a stair with nothing burning.
  it("lights no flight that has no flame painted on it", () => {
    const grid = makeGrid([
      [empty, portal("reachable", "s1"), empty],
      [empty, corridor("completed", false), empty],
    ])
    const { container } = render(<SiteMapView grid={{ ...grid, entrancePos: [0, 1] }} revealAllCells />)
    expect(container.querySelectorAll("[data-light-pool]")).toHaveLength(0)
  })
})

describe("furniture stops at the wall of its own room", () => {
  // Reported from starter_4: a chest offset toward the wall was visible on the far side of it, standing
  // in the corridor beyond. The clip was every floor cell on the map, so there was nothing to stop it.
  it("clips to the room's own cells and no others", () => {
    const room = chamber("reachable")
    if (room.type !== "room") throw new Error("the chamber fixture stopped being a room")
    // A chamber, a wall's width of stone, and a separate corridor beyond it.
    const grid = makeGrid([
      [empty, corridor("completed", false), empty, empty, straightCorridor("completed", ["n", "s"])],
      [empty, room, empty, empty, straightCorridor("completed", ["n", "s"])],
    ])
    const { container } = render(<SiteMapView grid={grid} revealAllCells />)
    const chest = Array.from(container.querySelectorAll<SVGImageElement>("image")).find(el =>
      (el.getAttribute("href") ?? "").includes("chestProp")
    )!
    const clipId = chest.closest("g[clip-path]")!.getAttribute("clip-path")!.slice(5, -1)
    const path = container
      .querySelector(`#${CSS.escape(clipId)}`)!
      .querySelector("path")!
      .getAttribute("d")!
    // The far corridor's own column must not appear in this room's clip.
    const farLeft = cellLeft(4)
    expect(path).not.toContain(`M${farLeft} `)
  })
})
