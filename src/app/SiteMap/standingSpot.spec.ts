import { describe, expect, it } from "vitest"
import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { COL_PITCH, ROW_PITCH, cellCenter } from "./mapScale"
import { GROWN_FORK, GROWN_PIECE, grownForkFloor } from "./floorFixtures.testing"
import { roomStop } from "./roomWalk"
import { buildRoomClaims } from "./roomClaims"
import { occupantOffset, standingOffset } from "./standingSpot"
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

describe("where the explorer stands in a grown room", () => {
  const grid = grownForkFloor()
  const stop = roomStop(grid, ...GROWN_FORK)!
  const offsetTo = ([r, c]: readonly [number, number], [tr, tc]: readonly [number, number]) => ({
    dx: cellCenter(tr, tc).cx - cellCenter(r, c).cx,
    dy: cellCenter(tr, tc).cy - cellCenter(r, c).cy,
  })

  it("stands a grown room's explorer at its stop", () => {
    expect(offsetAt(grid, ...GROWN_FORK)).toEqual(offsetTo(GROWN_FORK, stop))
  })

  it("draws an explorer on an absorbed cell at its room's stop", () => {
    const absorbed: [number, number][] = [
      [2, 3],
      [2, 5],
      [4, 4],
    ]
    for (const [r, c] of absorbed) expect(offsetAt(grid, r, c)).toEqual(offsetTo([r, c], stop))
  })

  it("stands an occupant beside the stop, off the piece", () => {
    const { dx, dy } = occupantOffset(grid, buildRoomClaims(grid), ...GROWN_FORK)
    const [r, c] = [GROWN_FORK[0] + dy / ROW_PITCH, GROWN_FORK[1] + dx / COL_PITCH]
    expect([r, c]).toEqual([stop[0], stop[1] + 1])
    const { top, left, rows, cols } = GROWN_PIECE
    expect(r >= top && r < top + rows && c >= left && c < left + cols).toBe(false)
  })

  it("stands an occupant west of the stop when east of it is off the room", () => {
    const narrow = grownForkFloor({
      grownRoom: { rect: { top: 1, left: 2, rows: 4, cols: 3 }, piece: { kind: "basin", ...GROWN_PIECE } },
    })
    const at = roomStop(narrow, ...GROWN_FORK)!
    const { dx, dy } = occupantOffset(narrow, buildRoomClaims(narrow), ...GROWN_FORK)
    expect([GROWN_FORK[0] + dy / ROW_PITCH, GROWN_FORK[1] + dx / COL_PITCH]).toEqual([at[0], at[1] - 1])
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
    expect(occupantOffset(grid, buildRoomClaims(grid), 1, 1)).toEqual(nodeArtOffset(new Set(["n"])))
  })
})
