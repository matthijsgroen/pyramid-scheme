import { describe, expect, it } from "vitest"
import { roomlessRouteStubs } from "./routeStubs"
import type { CorridorCell, Direction, FloorGrid, GridCell, PrefabRoom, RoomCell } from "./siteTypes"

// A row: the route's node at 1,1 holding a made-up room whose rect is the node alone and whose one door in use is
// 1,2; past the door the lock's hall reaches nothing else.
const den: PrefabRoom = {
  name: "den",
  layout: 0,
  mirrored: false,
  rect: { top: 1, left: 1, rows: 1, cols: 1 },
  stop: [1, 1],
  objects: [],
  blocked: [],
  doors: [[1, 2]],
}

const floor = (prefabRoom?: PrefabRoom): FloorGrid => {
  const node: RoomCell = {
    type: "room",
    roomType: "encounter",
    dirs: new Set<Direction>(["w", "e"]),
    state: "fogged",
    sectionAddress: "main",
    region: "x.hall",
    ...(prefabRoom ? { prefabRoom } : {}),
  }
  const corridor = (sectionAddress: string): CorridorCell => ({
    type: "corridor",
    dirs: new Set<Direction>(["w", "e"]),
    state: "fogged",
    sectionAddress,
    region: "x.hall",
  })
  const row: GridCell[] = [corridor("main"), node, corridor("lock:x.hall")]
  return {
    siteId: "site",
    rows: 3,
    cols: 3,
    entrancePos: [1, 0],
    exitPos: [1, 0],
    staircases: {},
    cells: [0, 1, 2].map(r => (r === 1 ? row : [0, 1, 2].map((): GridCell => ({ type: "empty" })))),
  }
}

describe("roomlessRouteStubs", () => {
  it("a room's own floor and doors count as its room", () => {
    expect(roomlessRouteStubs(floor(den))).toEqual([])
    expect(roomlessRouteStubs(floor())).toEqual(["lock:x.hall"])
  })
})
