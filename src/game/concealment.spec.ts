import { describe, expect, it } from "vitest"
import type { CorridorCell, FloorGrid, GridCell, RoomCell } from "./siteTypes"
import { concealShutGround, concealedBehindBarriers } from "./concealment"

const KEY = "obstacle:test:door"
const way = (...dirs: ("w" | "e")[]): CorridorCell => ({ type: "corridor", dirs: new Set(dirs), state: "completed" })
const span: CorridorCell = {
  type: "corridor",
  dirs: new Set(),
  state: "completed",
  obstacle: { dir: "e", kind: "zipline" },
}
const lever: RoomCell = {
  type: "room",
  roomType: "encounter",
  dirs: new Set(["e"]),
  state: "completed",
  mechanism: {
    states: ["off", "on"],
    initial: "off",
    returnsToInitial: true,
    positions: [{ state: "on", gateKeyId: KEY }],
  },
}
const door: RoomCell = {
  type: "room",
  roomType: "encounter",
  dirs: new Set(["w", "e"]),
  state: "reachable",
  tags: ["gate"],
  requiredKeyId: KEY,
  regionBarrier: { region: "vault", entrance: "hall", realisation: "water" },
}
const end: RoomCell = { type: "room", roomType: "portal", dirs: new Set(["w"]), state: "reachable" }

// One row: a lever, ground, a drop east, ground, a region barrier's door the lever owns, ground, a room.
const row: GridCell[] = [lever, way("w", "e"), way("w"), span, way("e"), way("w", "e"), door, way("w", "e"), end]
const grid: FloorGrid = {
  cells: [row],
  rows: 1,
  cols: row.length,
  entrancePos: [0, 0],
  exitPos: [0, row.length - 1],
  siteId: "test",
  staircases: {},
}

describe("concealedBehindBarriers on a drop with a region barrier past it", () => {
  it("ground only a drop already taken has cut off is not hidden, while the ground behind the shut barrier is", () => {
    expect([...concealedBehindBarriers(grid, [0, 5])].sort()).toEqual(["0,7", "0,8"])
  })

  it("the door itself stays in view, and the span of the drop is seen from the landing", () => {
    const hidden = concealedBehindBarriers(grid, [0, 5])
    expect(hidden.has("0,6")).toBe(false)
    expect(hidden.has("0,3")).toBe(false)
  })

  it("an edge gate the lever owns hides nothing, because only a region barrier conceals", () => {
    const edge: RoomCell = { ...door, regionBarrier: undefined }
    const edged = { ...grid, cells: [row.map(cell => (cell === door ? edge : cell))] }
    expect(concealedBehindBarriers(edged, [0, 5]).size).toBe(0)
  })

  it("a gate no mechanism owns hides nothing", () => {
    const ward: RoomCell = { ...door, requiredKeyId: "ward:tomb" }
    const warded = { ...grid, cells: [row.map(cell => (cell === door ? ward : cell))] }
    expect(concealedBehindBarriers(warded, [0, 5]).size).toBe(0)
  })
})

describe("concealShutGround keeps seen ground of a flooded region in view", () => {
  const vault = (state: CorridorCell["state"]): CorridorCell => ({ ...way("w", "e"), region: "vault", state })
  const drawn = (cell: CorridorCell) => {
    const cells = [row.map((c, i) => (i === 7 ? cell : c))]
    return concealShutGround({ ...grid, cells }, [0, 5]).cells[0].filter(
      c => c.type !== "empty" && c.state === "fogged"
    )
  }

  it("draws a seen cell of the flooded region as it is, and still hides ground past it outside the region", () => {
    expect(drawn(vault("completed"))).toHaveLength(1)
  })

  it("keeps a never-seen cell of the flooded region as fog", () => {
    expect(drawn(vault("fogged"))).toHaveLength(2)
  })

  it("hides seen ground outside the flooded region", () => {
    expect(drawn(way("w", "e"))).toHaveLength(2)
  })
})
