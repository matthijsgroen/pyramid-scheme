import { describe, expect, it } from "vitest"
import type { CorridorCell, FloorGrid, GridCell, RoomCell } from "./siteTypes"
import { PEEK_CELLS, concealShutGround, concealedBehindBarriers } from "./concealment"
import { walkableFrom } from "./gridNavigation"

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

  it("shows a never-seen cell of the flooded region beside a door in view, and still hides ground past it outside the region", () => {
    expect(drawn(vault("fogged"))).toHaveLength(1)
  })

  it("hides seen ground outside the flooded region", () => {
    expect(drawn(way("w", "e"))).toHaveLength(2)
  })
})

describe("concealShutGround lets the player see PEEK_CELLS deep into a flooded region", () => {
  const ground = (state: CorridorCell["state"], region?: string): CorridorCell => ({
    ...way("w", "e"),
    state,
    ...(region ? { region } : {}),
  })
  const shutDoor = (over: Partial<RoomCell> = {}): RoomCell => ({ ...door, ...over })
  // A lever, ground, the vault's shut door, then four cells east: vault ground never seen unless `past` says otherwise.
  const floor = (doorCell: RoomCell, past: Record<number, GridCell> = {}): FloorGrid => {
    const east: GridCell[] = [0, 1, 2, 3].map(i => past[i] ?? ground("fogged", "vault"))
    const last = east[3] as CorridorCell
    const cells: GridCell[] = [lever, way("w", "e"), doorCell, ...east.slice(0, 3), { ...last, dirs: new Set(["w"]) }]
    return { ...grid, cells: [cells], cols: cells.length, exitPos: [0, cells.length - 1] }
  }
  const fogged = (g: FloorGrid) => g.cells[0].map(cell => cell.type !== "empty" && cell.state === "fogged")

  it("is two cells", () => {
    expect(PEEK_CELLS).toBe(2)
  })

  it("draws the two vault cells past a door in view as seen and the ground beyond them as fog", () => {
    const drawn = concealShutGround(floor(shutDoor()), [0, 1])
    expect(fogged(drawn)).toEqual([false, false, false, false, false, true, true])
    expect(drawn.cells[0][3]).toMatchObject({ state: "visible" })
  })

  it("keeps a vault cell already seen past the peek in view", () => {
    const drawn = concealShutGround(floor(shutDoor(), { 2: ground("completed", "vault") }), [0, 1])
    expect(fogged(drawn)).toEqual([false, false, false, false, false, false, true])
  })

  it("stops at the edge of the region", () => {
    const drawn = concealShutGround(floor(shutDoor(), { 1: ground("fogged") }), [0, 1])
    expect(fogged(drawn)).toEqual([false, false, false, false, true, true, true])
  })

  it("never looks onto or past another barrier", () => {
    const second = shutDoor({
      state: "fogged",
      regionBarrier: { region: "vault", entrance: "annex", realisation: "water" },
    })
    const drawn = concealShutGround(floor(shutDoor(), { 1: second }), [0, 1])
    expect(fogged(drawn)).toEqual([false, false, false, false, true, true, true])
  })

  it("sees nothing past a door still in fog", () => {
    const drawn = concealShutGround(floor(shutDoor({ state: "fogged" })), [0, 1])
    expect(fogged(drawn)).toEqual([false, false, true, true, true, true, true])
  })

  it("draws an open barrier's floor as it is", () => {
    const open = floor(shutDoor({ requiredKeyId: undefined }))
    expect(concealShutGround(open, [0, 1])).toBe(open)
  })

  it("offers no walk onto the cells it shows, and leaves the grid it was given as it was", () => {
    const given = floor(shutDoor())
    const walkable = walkableFrom(concealShutGround(given, [0, 1]), [0, 1])
    expect(walkable.has("0,3") || walkable.has("0,4")).toBe(false)
    expect(fogged(given)).toEqual([false, false, false, true, true, true, true])
  })
})
