import { render, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SiteMapView, buildRoomClaims, tileRegionsFor } from "./SiteMapView"
import { ExplorerFigure } from "./ExplorerDot"
import type { Rect, StateGroups } from "./tileRegions"
import { ARCH_RISE, CELL, SIDE_W, WALL_H, cellCenter, cellLeft, cellTop } from "./mapScale"
import { MAX_ZOOM, MIN_ZOOM } from "./useMapZoom"
import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"

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
