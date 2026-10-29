// @vitest-environment jsdom
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import { ExplorerDot } from "./ExplorerDot"
import { findPath, revealAll } from "@/game/gridNavigation"
import { CELL, COL_PITCH, ROW_PITCH, cellCenter } from "./mapScale"
import { GROWN_FORK, GROWN_PIECE, floorFrom, grownForkFloor } from "./floorFixtures.testing"
import { buildRoomClaims } from "./roomClaims"
import { roomStop, walkPoints, walkSteps } from "./roomWalk"
import { standingOffset } from "./standingSpot"

const corridor = (dirs: string[]): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs) as GridCell extends { dirs: infer D } ? D : never,
  state: "completed",
})

const grid: FloorGrid = {
  cells: [[corridor(["e"]), corridor(["w", "e"]), corridor(["w"])]],
  rows: 1,
  cols: 3,
  entrancePos: [0, 0],
  exitPos: [0, 2],
  siteId: "test-site",
  staircases: {},
}

describe("ExplorerDot", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // The map keys this component by floor, so arriving downstairs mounts a fresh dot already standing
  // where it belongs. It has to say so: the map offers nowhere to walk until it hears the dot has
  // arrived, which left a deeper floor with no corridor arrows at all.
  it("announces arrival on mount, so a map remounted on a new floor knows where the dot is", () => {
    const onArrive = vi.fn()

    render(<ExplorerDot grid={grid} pos={[0, 1]} onArrive={onArrive} />)

    expect(onArrive).toHaveBeenCalled()
  })

  // Guards the other half: announcing on mount must not become the only time it announces. The walk
  // itself is driven by animation frames, so the clock has to be run out for the dot to get there.
  it("announces arrival again once it has walked somewhere", () => {
    const onArrive = vi.fn()
    const { rerender } = render(<ExplorerDot grid={grid} pos={[0, 1]} onArrive={onArrive} />)
    onArrive.mockClear()

    rerender(<ExplorerDot grid={grid} pos={[0, 2]} onArrive={onArrive} />)
    act(() => void vi.advanceTimersByTime(2000))

    expect(onArrive).toHaveBeenCalled()
  })

  it("rests at the spot its room stands it on, off the node's centre, and walks off from there", () => {
    const standAt = (r: number, c: number) => (r === 0 && c === 1 ? { dx: 10, dy: 20 } : { dx: 0, dy: 0 })
    const at = (container: HTMLElement) => container.querySelector("[data-explorer]")?.getAttribute("data-at")
    const { container, rerender } = render(<ExplorerDot grid={grid} pos={[0, 1]} standAt={standAt} />)
    const node = cellCenter(0, 1)
    expect(at(container)).toBe(`${node.cx + 10},${node.cy + 20}`)

    rerender(<ExplorerDot grid={grid} pos={[0, 2]} standAt={standAt} />)
    act(() => void vi.advanceTimersByTime(2000))

    const next = cellCenter(0, 2)
    expect(at(container)).toBe(`${next.cx},${next.cy}`)
  })
})

// Animation frames run by hand, FRAME_MS apart, so a walk is counted in frames and never timed.
const FRAME_MS = 10
const STEP_MS = 100
const handFrames = () => {
  let queue: FrameRequestCallback[] = []
  let now = 0
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => queue.push(cb))
  vi.stubGlobal("cancelAnimationFrame", () => void (queue = []))
  const frame = () => {
    const due = queue
    queue = []
    now += FRAME_MS
    act(() => due.forEach(cb => cb(now)))
  }
  return { frame, pending: () => queue.length > 0 }
}

describe("ExplorerDot in a grown room", () => {
  const grid = revealAll(grownForkFloor())
  const claims = buildRoomClaims(grid)
  const standAt = (r: number, c: number) => standingOffset(grid, claims, r, c)
  const waypointsOf = (route: ReadonlyArray<readonly [number, number]>) => walkPoints(grid, route, standAt)
  const stop = roomStop(grid, ...GROWN_FORK)!
  const stopAt = `${cellCenter(...stop).cx},${cellCenter(...stop).cy}`
  const nw = cellCenter(GROWN_PIECE.top, GROWN_PIECE.left)
  const se = cellCenter(GROWN_PIECE.top + GROWN_PIECE.rows - 1, GROWN_PIECE.left + GROWN_PIECE.cols - 1)
  const inPiece = ([x, y]: number[]) =>
    x > nw.cx - CELL / 2 && x < se.cx + CELL / 2 && y > nw.cy - CELL / 2 && y < se.cy + CELL / 2
  const at = (container: HTMLElement) =>
    container.querySelector("[data-explorer]")!.getAttribute("data-at")!.split(",").map(Number)

  afterEach(() => vi.unstubAllGlobals())

  const walk = (from: readonly [number, number], to: readonly [number, number], props = {}) => {
    const frames = handFrames()
    const onArrive = vi.fn()
    const dot = (pos: readonly [number, number]) => (
      <ExplorerDot
        grid={grid}
        pos={pos}
        segmentDuration={STEP_MS}
        standAt={standAt}
        waypointsOf={waypointsOf}
        onArrive={onArrive}
        {...props}
      />
    )
    const view = render(dot(from))
    onArrive.mockClear()
    view.rerender(dot(to))
    return { ...view, ...frames, onArrive, dot }
  }

  it("walks round the piece from one door to the other, never inside it", () => {
    const { container, frame, onArrive } = walk([2, 0], [2, 7])
    const seen: number[][] = []
    while (!onArrive.mock.calls.length) {
      frame()
      seen.push(at(container))
    }
    expect(seen.filter(inPiece)).toEqual([])
    expect(seen.some(([, y]) => y > se.cy + CELL / 2)).toBe(true)
    expect(at(container)).toEqual([cellCenter(2, 7).cx, cellCenter(2, 7).cy])
  })

  it("comes to rest at the room's stop when the room is the destination", () => {
    const { container, frame, onArrive } = walk([2, 0], GROWN_FORK)
    while (!onArrive.mock.calls.length) frame()
    expect(at(container).join(",")).toBe(stopAt)
  })

  it("never shows him under the piece when a second tap lands mid-walk", () => {
    const { container, frame, rerender, dot, onArrive } = walk([2, 0], [2, 7])
    for (let i = 0; i < 25; i++) frame()
    expect(onArrive).not.toHaveBeenCalled()
    rerender(dot(GROWN_FORK))
    const seen: number[][] = []
    while (!onArrive.mock.calls.length) {
      frame()
      seen.push(at(container))
    }
    expect(seen.filter(inPiece)).toEqual([])
    expect(at(container).join(",")).toBe(stopAt)
  })

  it("walks the next tap normally after a mid-walk re-route has settled", () => {
    const { container, frame, rerender, dot, onArrive } = walk([2, 0], [2, 7])
    for (let i = 0; i < 25; i++) frame()
    rerender(dot(GROWN_FORK))
    while (!onArrive.mock.calls.length) frame()
    onArrive.mockClear()

    rerender(dot([5, 4]))
    expect(at(container).join(",")).toBe(stopAt)
    let frames = 0
    while (!onArrive.mock.calls.length) {
      frame()
      frames++
    }
    expect(frames).toBeGreaterThan(STEP_MS / FRAME_MS)
    expect(at(container)).toEqual([cellCenter(5, 4).cx, cellCenter(5, 4).cy])
  })

  it("takes as long per step in a room as in a corridor", () => {
    const { frame, onArrive } = walk([2, 0], [2, 7])
    const points = waypointsOf(findPath(grid, [2, 0], [2, 7]))
    let frames = 0
    while (!onArrive.mock.calls.length) {
      frame()
      frames++
    }
    // One frame to set out, then STEP_MS / FRAME_MS a step, each segment rounding up to a whole frame.
    const perStep = STEP_MS / FRAME_MS
    expect(frames).toBeGreaterThanOrEqual(1 + walkSteps(points) * perStep)
    expect(frames).toBeLessThanOrEqual(1 + walkSteps(points) * perStep + points.length)
    expect(walkSteps(points)).toBeGreaterThan(points.length - 1)
  })

  it("keeps one pace round a corner of the piece, never slowing to it", () => {
    const { container, frame, onArrive } = walk([2, 0], [2, 7])
    const seen: number[][] = []
    while (!onArrive.mock.calls.length) {
      frame()
      seen.push(at(container))
    }
    const corner = cellCenter(GROWN_PIECE.top + GROWN_PIECE.rows, GROWN_PIECE.left - 1)
    const k = seen.findIndex(([x, y]) => x === corner.cx && y === corner.cy)
    expect(k).toBeGreaterThan(2)
    const pace = (a: number[], b: number[]) => Math.hypot((a[0] - b[0]) / COL_PITCH, (a[1] - b[1]) / ROW_PITCH)
    expect(pace(seen[k - 2], seen[k - 1])).toBeCloseTo(pace(seen[k + 1], seen[k + 2]), 6)
    expect(pace(seen[k - 2], seen[k - 1])).toBeCloseTo(FRAME_MS / STEP_MS, 6)
  })

  it("announces each room waypoint once, and never in a corridor", () => {
    const onWaypoint = vi.fn()
    const { frame, onArrive } = walk([2, 0], [2, 7], { onWaypoint })
    while (!onArrive.mock.calls.length) frame()
    const roomPoints = waypointsOf(findPath(grid, [2, 0], [2, 7])).filter(p => p.inRoom)
    expect(roomPoints.length).toBeGreaterThan(1)
    expect(onWaypoint.mock.calls.map(([p]) => p)).toEqual(roomPoints)

    const ending = vi.fn()
    const second = walk([2, 0], GROWN_FORK, { onWaypoint: ending })
    while (!second.onArrive.mock.calls.length) second.frame()
    expect(ending.mock.calls.at(-1)?.[0]).toEqual({
      x: cellCenter(...stop).cx,
      y: cellCenter(...stop).cy,
      inRoom: true,
    })
  })

  it("walks a route through no grown room on exactly the frames it walks without waypointsOf", () => {
    const plain = revealAll(floorFrom(["E..", "  .", "  R"]))
    const offset = (r: number, c: number) => (r === 2 && c === 2 ? { dx: 7, dy: -3 } : { dx: 0, dy: 1 })
    const trace = (props: object) => {
      const frames = handFrames()
      const onArrive = vi.fn()
      const dot = (pos: readonly [number, number]) => (
        <ExplorerDot grid={plain} pos={pos} segmentDuration={STEP_MS} standAt={offset} onArrive={onArrive} {...props} />
      )
      const { container, rerender, unmount } = render(dot([0, 0]))
      rerender(dot([2, 2]))
      const seen = [at(container)]
      while (frames.pending()) {
        frames.frame()
        seen.push(at(container))
      }
      unmount()
      vi.unstubAllGlobals()
      return seen
    }
    const today = trace({})
    expect(today.length).toBeGreaterThan(30)
    expect(
      trace({ waypointsOf: (route: ReadonlyArray<readonly [number, number]>) => walkPoints(plain, route, offset) })
    ).toEqual(today)
  })
})

describe("ExplorerFigure, carrying", () => {
  afterEach(() => vi.doUnmock("./tileAssets"))

  const figure = async (frames: Record<string, string[]>) => {
    vi.resetModules()
    vi.doMock("./tileAssets", async original => ({
      ...(await original<typeof import("./tileAssets")>()),
      sharedTileFrames: (prefix: string) => frames[prefix] ?? [],
    }))
    return (await import("./ExplorerDot")).ExplorerFigure
  }

  it("draws the carrying frames of its facing", async () => {
    const Figure = await figure({ "explorer-e": ["walk.png"], "explorer-carry-e": ["carry.png"] })
    const { container } = render(<Figure facing="w" carrying />)
    expect(container.querySelector("img")?.getAttribute("src")).toBe("carry.png")
  })

  it("falls back to the walking frames while a facing has no carrying art", async () => {
    const Figure = await figure({ "explorer-n": ["walk.png"] })
    const { container } = render(<Figure facing="n" carrying />)
    expect(container.querySelector("img")?.getAttribute("src")).toBe("walk.png")
  })

  it("the walking explorer is drawn carrying while a stone is in hand", async () => {
    vi.resetModules()
    vi.doMock("./tileAssets", async original => ({
      ...(await original<typeof import("./tileAssets")>()),
      sharedTileFrames: (prefix: string) =>
        ({ "explorer-s": ["walk.png"], "explorer-carry-s": ["carry.png"] })[prefix] ?? [],
    }))
    const { ExplorerDot: Dot } = await import("./ExplorerDot")
    const { container } = render(<Dot grid={grid} pos={[0, 1]} carrying />)
    expect(container.querySelector("img")?.getAttribute("src")).toBe("carry.png")
  })
})
