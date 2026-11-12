import { describe, expect, it } from "vitest"
import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { COL_PITCH, ROW_PITCH, cellCenter } from "./mapScale"
import { PREFAB_CHEST, PREFAB_FORK, fitForkFloor, prefabChestFloor, prefabForkFloor } from "./floorFixtures.testing"
import { roomStop } from "./roomWalk"
import { buildRoomClaims } from "./roomClaims"
import { nodeArtStep, occupantOffset, prefabArtOffset, standingOffset } from "./standingSpot"
import { nodeArtOffset } from "./nodeArt"

const state: CellState = "completed"
const empty: GridCell = { type: "empty" }
const corridor = (dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state })
const stair = (dirs: Direction[]): GridCell => ({
  type: "room",
  roomType: "portal",
  stairId: "s1",
  dirs: new Set(dirs),
  state,
})

const floor = (cells: GridCell[][]): FloorGrid => ({
  siteId: "site",
  rows: cells.length,
  cols: cells[0].length,
  entrancePos: [0, 0],
  exitPos: [0, 0],
  staircases: {},
  cells,
})

const offsetAt = (grid: FloorGrid, r: number, c: number) => standingOffset(grid, buildRoomClaims(grid), r, c)

describe("where the explorer stands in a stair's room", () => {
  it("stands in the bare cell beside the stair, a full cell off its node", () => {
    const grid = floor([
      [empty, corridor(["s"]), empty],
      [empty, stair(["n"]), empty],
      [empty, empty, empty],
    ])
    expect(offsetAt(grid, 1, 1)).toEqual({ dx: COL_PITCH, dy: 0 })
  })

  it("stands in front of the stair when neither side is the room's floor", () => {
    const grid = floor([
      [corridor(["e"]), corridor(["w", "s"]), corridor(["w"])],
      [corridor(["s"]), stair(["n"]), corridor(["s"])],
      [corridor(["n"]), empty, corridor(["n"])],
    ])
    expect(offsetAt(grid, 1, 1)).toEqual({ dx: 0, dy: ROW_PITCH })
  })

  it("never stands on the cell the room's prop stands on", () => {
    const grid = floor([
      [corridor(["e"]), corridor(["w", "s"]), corridor(["w"])],
      [corridor(["s"]), { ...stair(["n"]), decoration: "shelf", activity: "storage" } as GridCell, empty],
      [corridor(["n"]), empty, empty],
    ])
    const claims = buildRoomClaims(grid)
    const propAt = [...claims.decorationAt.keys()]
    expect(propAt).toHaveLength(1)
    const { dx, dy } = standingOffset(grid, claims, 1, 1)
    const standsOn = `${1 + dy / ROW_PITCH},${1 + dx / COL_PITCH}`
    expect(standsOn).not.toBe(propAt[0])
    expect(claims.claimedBy.get(standsOn)).toBe("1,1")
  })

  it("stays on the node of a room that is not a stair", () => {
    const grid = floor([
      [empty, corridor(["s"]), empty],
      [empty, { type: "room", roomType: "encounter", dirs: new Set<Direction>(["n"]), state }, empty],
      [empty, empty, empty],
    ])
    expect(offsetAt(grid, 1, 1)).toEqual({ dx: 0, dy: 0 })
  })

  it("stays on the node of a stair whose room has no bare floor", () => {
    const grid = floor([
      [corridor(["e", "s"]), corridor(["w", "s", "e"]), corridor(["w", "s"])],
      [corridor(["n", "s"]), stair(["n"]), corridor(["n", "s"])],
      [corridor(["n", "e"]), corridor(["w", "e"]), corridor(["w", "n"])],
    ])
    expect(offsetAt(grid, 1, 1)).toEqual({ dx: 0, dy: 0 })
  })
})

describe("where the explorer stands in a prefab room", () => {
  const grid = prefabForkFloor()
  const stop = roomStop(grid, ...PREFAB_FORK)!
  const offsetTo = ([r, c]: readonly [number, number], [tr, tc]: readonly [number, number]) => ({
    dx: cellCenter(tr, tc).cx - cellCenter(r, c).cx,
    dy: cellCenter(tr, tc).cy - cellCenter(r, c).cy,
  })
  const cellOf = ([r, c]: readonly [number, number], { dx, dy }: { dx: number; dy: number }) => [
    r + dy / ROW_PITCH,
    c + dx / COL_PITCH,
  ]

  it("stands a prefab room's explorer at its stop", () => {
    expect(offsetAt(grid, ...PREFAB_FORK)).toEqual(offsetTo(PREFAB_FORK, stop))
  })

  it("draws an explorer on an absorbed cell at its room's stop", () => {
    const absorbed: [number, number][] = [
      [4, 5],
      [4, 7],
      [6, 6],
    ]
    for (const [r, c] of absorbed) expect(offsetAt(grid, r, c)).toEqual(offsetTo([r, c], stop))
  })

  it("somebody in a fit room stands north of the stop; elsewhere beside the node", () => {
    const fit = fitForkFloor()
    const fitStop = roomStop(fit, ...PREFAB_FORK)!
    expect(cellOf(PREFAB_FORK, occupantOffset(fit, buildRoomClaims(fit), ...PREFAB_FORK))).toEqual([
      fitStop[0] - 1,
      fitStop[1],
    ])
    expect(cellOf(PREFAB_FORK, occupantOffset(grid, buildRoomClaims(grid), ...PREFAB_FORK))).toEqual([
      stop[0],
      stop[1] + 1,
    ])
    const plain = floor([
      [empty, corridor(["s"]), empty],
      [empty, { type: "room", roomType: "encounter", dirs: new Set<Direction>(["n"]), state }, empty],
      [empty, empty, empty],
    ])
    expect(occupantOffset(plain, buildRoomClaims(plain), 1, 1)).toEqual(
      nodeArtStep(plain, buildRoomClaims(plain), 1, 1)
    )
  })

  it("the chest art stands at the stop, stepped aside as on a corridor node where there is floor to step to", () => {
    const vault = prefabChestFloor()
    const stop = standingOffset(vault, buildRoomClaims(vault), ...PREFAB_CHEST)
    const step = nodeArtOffset(undefined)
    // The stop is on the room's south row, so the step south would point at its wall.
    expect(prefabArtOffset(vault, buildRoomClaims(vault), ...PREFAB_CHEST)).toEqual({
      dx: stop.dx + step.dx,
      dy: stop.dy,
    })
  })
})

describe("where somebody the room is for stands", () => {
  const talk = (dirs: Direction[]): GridCell => ({ type: "room", roomType: "encounter", dirs: new Set(dirs), state })

  it("stands in a bare cell of the room beside the node, so the explorer at the marker meets them", () => {
    const grid = floor([
      [empty, corridor(["s"]), empty],
      [empty, stair(["n"]), empty],
      [empty, empty, empty],
    ])
    expect(occupantOffset(grid, buildRoomClaims(grid), 1, 1)).toEqual({ dx: COL_PITCH, dy: 0 })
  })

  it("takes the furniture's corner when the room has no floor to spare", () => {
    const grid = floor([
      [empty, corridor(["s"]), empty],
      [empty, talk(["n"]), empty],
      [empty, empty, empty],
    ])
    expect(occupantOffset(grid, buildRoomClaims(grid), 1, 1)).toEqual(nodeArtStep(grid, buildRoomClaims(grid), 1, 1))
  })
})

describe("where a node's furniture stands in its cell", () => {
  const talk = (dirs: Direction[]): GridCell => ({ type: "room", roomType: "encounter", dirs: new Set(dirs), state })
  const step = nodeArtOffset(undefined)

  it("steps away from its doorways toward floor it is open to", () => {
    const grid = floor([
      [empty, empty, empty],
      [corridor(["e"]), talk(["w", "e"]), corridor(["w"])],
      [empty, empty, empty],
    ])
    // Across, the exits cancel and it steps east, onto the open corridor; the step south meets no floor.
    expect(nodeArtStep(grid, buildRoomClaims(grid), 1, 1)).toEqual({ dx: step.dx, dy: 0 })
  })

  it("stands centred on an axis whose step would point at a wall", () => {
    const grid = floor([
      [empty, empty, empty, empty],
      // Doors east and south step it north-west: west is another room's floor with a wall between.
      [talk(["s"]), corridor([]), talk(["e", "s"]), corridor(["w"])],
      [corridor(["n"]), empty, corridor(["n"]), empty],
    ])
    expect(nodeArtStep(grid, buildRoomClaims(grid), 1, 2)).toEqual({ dx: 0, dy: 0 })
  })
})
