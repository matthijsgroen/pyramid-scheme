import { describe, expect, it } from "vitest"
import type { Direction, FloorGrid, GridCell, RoomCell } from "./siteTypes"
import { describeFloorWalkFailure, walkFloorLock } from "./floorLockWalk"

const LEVER_KEY = "obstacle:spec#0#0:door"

type Room = Partial<Omit<RoomCell, "type" | "dirs" | "state">>

const lever: Room = {
  mechanism: {
    states: ["rest", "thrown"],
    initial: "rest",
    returnsToInitial: true,
    positions: [{ state: "thrown", gateKeyId: LEVER_KEY }],
  },
}
const leverDoor: Room = { tags: ["gate"], requiredKeyId: LEVER_KEY }
const tableau: Room = { family: "tableau", requiredKeyIds: ["hiero:a", "hiero:b"] }
const unmintedFloorKey: Room = { tags: ["gate"], requiredKeyId: "floorkey:none", gateVariant: "floor-key" }
const ward: Room = { tags: ["gate"], requiredKeyId: "ward:x", gateVariant: "tomb-key" }

/** One row walked west to east: the entrance, then each room with a corridor before it; the last room is the exit. */
const row = (rooms: Room[]): FloorGrid => {
  const dirs = new Set<Direction>(["e", "w"])
  const cells: GridCell[] = [{ type: "corridor", dirs, state: "fogged" }]
  rooms.forEach((extra, i) => {
    if (i > 0) cells.push({ type: "corridor", dirs, state: "fogged" })
    cells.push({
      type: "room",
      roomType: "encounter",
      dirs,
      state: "fogged",
      sectionAddress: `s${i}`,
      pathIndex: i,
      ...extra,
    } as RoomCell)
  })
  return {
    cells: [cells],
    rows: 1,
    cols: cells.length,
    entrancePos: [0, 0],
    exitPos: [0, cells.length - 1],
    siteId: "off-floor",
    staircases: {},
  }
}

describe("a door opened off the floor", () => {
  it("lets a lock floor whose exit lies past a tableau walk sound", () => {
    expect(walkFloorLock(row([lever, leverDoor, tableau, {}]))?.sound).toBe(true)
  })

  it("lets a lock floor whose exit lies past a ward gate walk sound", () => {
    expect(walkFloorLock(row([lever, leverDoor, ward, {}]))?.sound).toBe(true)
  })

  it("refuses a lock whose own lever stands past a door opened off the floor", () => {
    const walk = walkFloorLock(row([ward, lever, leverDoor, {}]))
    if (!walk || walk.sound) throw new Error("expected the lock leaning on a ward key to be refused")
    expect(walk.failure).toEqual({ type: "leansOffFloor", mechanism: "obstacle 0,3" })
    expect(describeFloorWalkFailure(walk.failure)).toBe("obstacle 0,3 is worked only past a door opened off this floor")
  })

  it("refuses a lock whose lever stands past a tableau", () => {
    const walk = walkFloorLock(row([tableau, lever, leverDoor, {}]))
    expect(walk?.sound).toBe(false)
  })

  it("lets a lock behind a tableau on the floor's own ground walk sound: the lock is solved from its start", () => {
    const inLock = (room: Room): Room => ({ ...room, region: "madeUp.hall" })
    const walk = walkFloorLock(row([{ ...tableau, region: "entrance" }, inLock(lever), inLock(leverDoor), {}]))
    expect(walk?.sound).toBe(true)
  })

  it("lets a lock hold a side way behind a ward gate that no control of it stands past", () => {
    const sideWard: Room = { ...ward, region: "madeUp.hall" }
    const grid = row([lever, leverDoor, {}])
    const [r, c] = [1, 2]
    const cells = [grid.cells[0].map(cell => ({ ...cell })), grid.cells[0].map((): GridCell => ({ type: "empty" }))]
    ;(cells[0][c] as RoomCell).dirs = new Set<Direction>(["e", "w", "s"])
    cells[r][c] = {
      type: "room",
      roomType: "encounter",
      dirs: new Set<Direction>(["n", "s"]),
      state: "fogged",
      sectionAddress: "w",
      pathIndex: 9,
      ...sideWard,
    } as RoomCell
    cells.push(grid.cells[0].map((): GridCell => ({ type: "empty" })))
    cells[2][c] = {
      type: "room",
      roomType: "encounter",
      dirs: new Set<Direction>(["n"]),
      state: "fogged",
      sectionAddress: "x",
      pathIndex: 10,
    } as RoomCell
    expect(walkFloorLock({ ...grid, cells, rows: 3 })?.sound).toBe(true)
  })
})

describe("a door no mechanism opens and no one earns off the floor", () => {
  it("stays shut, so a floor key nothing mints still leaves the way out unreachable", () => {
    const walk = walkFloorLock(row([lever, leverDoor, unmintedFloorKey, {}]))
    if (!walk || walk.sound) throw new Error("expected the unminted floor key to shut the way out")
    expect(walk.failure).toEqual({ type: "unsolvable" })
  })
})
