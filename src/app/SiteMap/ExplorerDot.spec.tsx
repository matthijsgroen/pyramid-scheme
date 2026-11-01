// @vitest-environment jsdom
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import { ExplorerDot } from "./ExplorerDot"
import { findPath, revealAll } from "@/game/gridNavigation"
import { CELL, COL_PITCH, ROW_PITCH, cellCenter } from "./mapScale"
import { PREFAB_FORK, PREFAB_PILLARS, floorFrom, prefabForkFloor } from "./floorFixtures.testing"
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

describe("ExplorerDot in a prefab room", () => {
  const grid = revealAll(prefabForkFloor())
  const claims = buildRoomClaims(grid)
  const standAt = (r: number, c: number) => standingOffset(grid, claims, r, c)
  const waypointsOf = (
    route: ReadonlyArray<readonly [number, number]>,
    fromWaypoint?: readonly [number, number],
    toWaypoint?: readonly [number, number]
  ) => walkPoints(grid, route, standAt, fromWaypoint, toWaypoint)
  const stop = roomStop(grid, ...PREFAB_FORK)!
  const stopAt = `${cellCenter(...stop).cx},${cellCenter(...stop).cy}`
  const inPiece = ([x, y]: number[]) =>
    PREFAB_PILLARS.some(([r, c]) => {
      const { cx, cy } = cellCenter(r, c)
      return Math.abs(x - cx) < CELL / 2 && Math.abs(y - cy) < CELL / 2
    })
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

  it("walks round a pillar from the west door to the stop, never inside one", () => {
    const { container, frame, onArrive } = walk([4, 0], PREFAB_FORK)
    const seen: number[][] = []
    while (!onArrive.mock.calls.length) {
      frame()
      seen.push(at(container))
    }
    expect(seen.filter(inPiece)).toEqual([])
    expect(waypointsOf(findPath(grid, [4, 0], PREFAB_FORK)).filter(p => p.inRoom).length).toBeGreaterThan(2)
    expect(at(container).join(",")).toBe(stopAt)
  })

  const standing = (pos: readonly [number, number], waypoint?: readonly [number, number]) => {
    const frames = handFrames()
    const onArrive = vi.fn()
    const dot = (to: readonly [number, number], spot?: readonly [number, number]) => (
      <ExplorerDot
        grid={grid}
        pos={to}
        waypoint={spot}
        segmentDuration={STEP_MS}
        standAt={standAt}
        waypointsOf={waypointsOf}
        onArrive={onArrive}
      />
    )
    const view = render(dot(pos, waypoint))
    onArrive.mockClear()
    const walkTo = (to: readonly [number, number], spot?: readonly [number, number]) => {
      view.rerender(dot(to, spot))
      const seen: number[][] = []
      while (!onArrive.mock.calls.length) {
        frames.frame()
        seen.push(at(view.container))
      }
      onArrive.mockClear()
      return seen
    }
    return { container: view.container, walkTo }
  }

  it("walks from the stop to a waypoint round what stands in the room, arrives on it, and walks back", () => {
    const { container, walkTo } = standing(PREFAB_FORK)
    const there = walkTo(PREFAB_FORK, PREFAB_FORK)
    expect(there.length).toBeGreaterThan(2 * (STEP_MS / FRAME_MS))
    expect(there.filter(inPiece)).toEqual([])
    expect(at(container)).toEqual([cellCenter(...PREFAB_FORK).cx, cellCenter(...PREFAB_FORK).cy])

    const back = walkTo(PREFAB_FORK)
    expect(back.length).toBeGreaterThan(2 * (STEP_MS / FRAME_MS))
    expect(at(container).join(",")).toBe(stopAt)
  })

  it("sets out from the waypoint he stands on when he walks out of the room", () => {
    const { walkTo } = standing(PREFAB_FORK, [6, 6])
    // From 6,6 the south door is straight ahead: down the column, never by the stop.
    const out = walkTo([9, 6])
    expect(out.length).toBeGreaterThan(2 * (STEP_MS / FRAME_MS))
    expect(out.every(([x, y]) => x === cellCenter(6, 6).cx && y >= cellCenter(6, 6).cy)).toBe(true)
  })

  it("walks in by a door to the waypoint he comes to stand on, never by the stop", () => {
    const { container, walkTo } = standing([9, 6])
    const seen = walkTo(PREFAB_FORK, [5, 6])
    expect(seen.length).toBeGreaterThan(2 * (STEP_MS / FRAME_MS))
    expect(seen.every(([x]) => x === cellCenter(5, 6).cx)).toBe(true)
    expect(at(container)).toEqual([cellCenter(5, 6).cx, cellCenter(5, 6).cy])
  })

  it("comes to rest at the room's stop when the room is the destination", () => {
    const { container, frame, onArrive } = walk([4, 0], PREFAB_FORK)
    while (!onArrive.mock.calls.length) frame()
    expect(at(container).join(",")).toBe(stopAt)
  })

  it("never shows him inside a pillar when a second tap lands mid-walk", () => {
    const { container, frame, rerender, dot, onArrive } = walk([4, 0], [4, 12])
    for (let i = 0; i < 25; i++) frame()
    expect(onArrive).not.toHaveBeenCalled()
    rerender(dot(PREFAB_FORK))
    const seen: number[][] = []
    while (!onArrive.mock.calls.length) {
      frame()
      seen.push(at(container))
    }
    expect(seen.filter(inPiece)).toEqual([])
    expect(at(container).join(",")).toBe(stopAt)
  })

  it("walks the next tap normally after a mid-walk re-route has settled", () => {
    const { container, frame, rerender, dot, onArrive } = walk([4, 0], [4, 12])
    for (let i = 0; i < 25; i++) frame()
    rerender(dot(PREFAB_FORK))
    while (!onArrive.mock.calls.length) frame()
    onArrive.mockClear()

    rerender(dot([9, 6]))
    expect(at(container).join(",")).toBe(stopAt)
    let frames = 0
    while (!onArrive.mock.calls.length) {
      frame()
      frames++
    }
    expect(frames).toBeGreaterThan(STEP_MS / FRAME_MS)
    expect(at(container)).toEqual([cellCenter(9, 6).cx, cellCenter(9, 6).cy])
  })

  it("takes as long per step in a room as in a corridor", () => {
    const { frame, onArrive } = walk([4, 0], [4, 12])
    const points = waypointsOf(findPath(grid, [4, 0], [4, 12]))
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

  it("keeps one pace round a corner of a pillar, never slowing to it", () => {
    // From the west door round the west pillar to the south door, and on out of the room.
    const { container, frame, onArrive } = walk([4, 0], [9, 6])
    const seen: number[][] = []
    while (!onArrive.mock.calls.length) {
      frame()
      seen.push(at(container))
    }
    const roomPoints = waypointsOf(findPath(grid, [4, 0], [9, 6])).filter(p => p.inRoom)
    expect(roomPoints.length).toBeGreaterThan(2)
    const corner = roomPoints[1]
    const k = seen.findIndex(([x, y]) => x === corner.x && y === corner.y)
    expect(k).toBeGreaterThan(2)
    const pace = (a: number[], b: number[]) => Math.hypot((a[0] - b[0]) / COL_PITCH, (a[1] - b[1]) / ROW_PITCH)
    expect(pace(seen[k - 2], seen[k - 1])).toBeCloseTo(pace(seen[k + 1], seen[k + 2]), 6)
    expect(pace(seen[k - 2], seen[k - 1])).toBeCloseTo(FRAME_MS / STEP_MS, 6)
  })

  it("announces each room waypoint once, and never in a corridor", () => {
    const onWaypoint = vi.fn()
    const { frame, onArrive } = walk([4, 0], [4, 10], { onWaypoint })
    while (!onArrive.mock.calls.length) frame()
    const roomPoints = waypointsOf(findPath(grid, [4, 0], [4, 10])).filter(p => p.inRoom)
    expect(roomPoints.length).toBeGreaterThan(1)
    expect(onWaypoint.mock.calls.map(([p]) => p)).toEqual(roomPoints)

    const ending = vi.fn()
    const second = walk([4, 0], PREFAB_FORK, { onWaypoint: ending })
    while (!second.onArrive.mock.calls.length) second.frame()
    expect(ending.mock.calls.at(-1)?.[0]).toEqual({
      x: cellCenter(...stop).cx,
      y: cellCenter(...stop).cy,
      inRoom: true,
    })
  })

  it("announces null once he sets out from a corridor point after a room, and never before one", () => {
    const onWaypoint = vi.fn()
    const { frame, onArrive } = walk([4, 12], [4, 0], { onWaypoint })
    while (!onArrive.mock.calls.length) frame()
    const roomPoints = waypointsOf(findPath(grid, [4, 12], [4, 0])).filter(p => p.inRoom)
    expect(onWaypoint.mock.calls.map(([p]) => p)).toEqual([...roomPoints, null])

    const plain = vi.fn()
    const first = walk([4, 0], [4, 1], { onWaypoint: plain })
    while (!first.onArrive.mock.calls.length) first.frame()
    expect(plain).not.toHaveBeenCalled()
  })

  it("walks a route through no prefab room on exactly the frames it walks without waypointsOf", () => {
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
