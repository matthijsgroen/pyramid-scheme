import { describe, expect, it } from "vitest"
import { buildRoomClaims, cellTileset, floorTier } from "./roomClaims"
import type { CellState, Direction, FloorGrid, GridCell, RoomCell } from "@/game/siteTypes"

const state: CellState = "completed"
const empty: GridCell = { type: "empty" }
const corridor = (dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state })

describe("cellTileset", () => {
  const room = (over: Partial<RoomCell>): RoomCell => ({
    type: "room",
    roomType: "encounter",
    dirs: new Set<Direction>(),
    state,
    ...over,
  })
  const grid = (over: Partial<FloorGrid>): FloorGrid => ({
    siteId: "site",
    rows: 0,
    cols: 0,
    entrancePos: [0, 0],
    exitPos: [0, 0],
    staircases: {},
    cells: [],
    ...over,
  })

  it("draws a cell in its section's difficulty when nothing names a tileset", () => {
    expect(cellTileset(room({ difficulty: "junior" }), grid({ difficulty: "starter" }))).toBe("junior")
  })

  it("draws a cell in the floor's tileset over its section's difficulty", () => {
    expect(cellTileset(room({ difficulty: "junior" }), grid({ difficulty: "starter", tileset: "cave" }))).toBe("cave")
  })

  it("draws a cell in its own tileset over the floor's", () => {
    expect(cellTileset(room({ difficulty: "junior", tileset: "master" }), grid({ tileset: "cave" }))).toBe("master")
  })

  it("draws a cell that names nothing in the floor's difficulty, else starter", () => {
    expect(cellTileset(room({}), grid({ difficulty: "wizard" }))).toBe("wizard")
    expect(cellTileset(room({}), grid({}))).toBe("starter")
  })

  it("builds a floor of its tileset, else its difficulty", () => {
    expect(floorTier(grid({ difficulty: "expert", tileset: "cave" }))).toBe("cave")
    expect(floorTier(grid({ difficulty: "expert" }))).toBe("expert")
  })
})

// The map stands a prop only on an empty cell the room claims.
describe("where a dressed room's prop stands", () => {
  it("stands nothing for a room that claims no floor, though the carve dressed it", () => {
    const puzzle: GridCell = {
      type: "room",
      roomType: "encounter",
      family: "sumplete",
      dirs: new Set<Direction>(["e", "w"]),
      state,
      decoration: "shelf",
      activity: "storage",
    }
    const grid: FloorGrid = {
      siteId: "site",
      rows: 3,
      cols: 5,
      entrancePos: [1, 0],
      exitPos: [1, 4],
      staircases: {},
      cells: [
        [empty, empty, empty, empty, empty],
        [corridor(["e"]), corridor(["e", "w"]), puzzle, corridor(["e", "w"]), corridor(["w"])],
        [empty, empty, empty, empty, empty],
      ],
    }
    expect(buildRoomClaims(grid).decorationAt.size).toBe(0)
  })

  it("stands a story room's prop beside it in the corridor, its authored activity making it a chamber", () => {
    const story: GridCell = {
      type: "room",
      roomType: "encounter",
      family: "conversation",
      dirs: new Set<Direction>(["e", "w"]),
      state,
      decoration: "shelf",
      activity: "ledger",
      authoredActivity: "ledger",
    }
    const grid: FloorGrid = {
      siteId: "site",
      rows: 3,
      cols: 5,
      entrancePos: [1, 0],
      exitPos: [1, 4],
      staircases: {},
      cells: [
        [empty, empty, empty, empty, empty],
        [corridor(["e"]), corridor(["e", "w"]), story, corridor(["e", "w"]), corridor(["w"])],
        [empty, empty, empty, empty, empty],
      ],
    }
    expect([...buildRoomClaims(grid).decorationAt.values()]).toEqual(["shelf"])
  })

  // A portal on the map's bottom row with passages above every free cell of its floor.
  const underPassages = (portal: Partial<RoomCell>): FloorGrid => ({
    siteId: "site",
    rows: 2,
    cols: 3,
    entrancePos: [0, 0],
    exitPos: [1, 1],
    staircases: portal.stairId ? { [portal.stairId]: [1, 1] } : {},
    cells: [
      [corridor(["e"]), corridor(["e", "w", "s"]), corridor(["w"])],
      [
        empty,
        { type: "room", roomType: "portal", dirs: new Set<Direction>(["n"]), state, decoration: "pillar", ...portal },
        empty,
      ],
    ],
  })

  it("stands no prop in a stairhead where the only floor for it has floor behind it", () => {
    expect(buildRoomClaims(underPassages({ stairId: "down" })).decorationAt.size).toBe(0)
  })

  it("still stands a way out's prop with floor behind it, a dead end nobody walks past", () => {
    expect([...buildRoomClaims(underPassages({})).decorationAt.values()]).toEqual(["pillar"])
  })

  it("never stands a stairhead's prop on the stair's own cell", () => {
    const stairhead: GridCell = {
      type: "room",
      roomType: "portal",
      stairId: "down",
      dirs: new Set<Direction>(["n"]),
      state,
      decoration: "jarRack",
      activity: "storage",
    }
    const grid: FloorGrid = {
      siteId: "site",
      rows: 4,
      cols: 3,
      entrancePos: [0, 1],
      exitPos: [2, 1],
      staircases: { down: [2, 1] },
      cells: [
        [empty, corridor(["s"]), empty],
        [empty, corridor(["n", "s"]), empty],
        [empty, stairhead, empty],
        [empty, empty, empty],
      ],
    }
    const decorationAt = buildRoomClaims(grid).decorationAt
    expect([...decorationAt.values()]).toContain("jarRack")
    expect(decorationAt.has("2,1")).toBe(false)
  })
})

describe("two rooms on diagonal nodes", () => {
  const fork = (dirs: Direction[], sectionAddress = "main"): GridCell => ({
    type: "room",
    roomType: "fork",
    dirs: new Set(dirs),
    state,
    sectionAddress,
  })
  const passage = (dirs: Direction[]): GridCell => ({
    type: "corridor",
    dirs: new Set(dirs),
    state,
    sectionAddress: "main",
  })
  // Two forks a corner node joins, the corner the L the player walks between them.
  const cornered = (lowerSection: string): FloorGrid => ({
    siteId: "site",
    rows: 3,
    cols: 3,
    entrancePos: [0, 0],
    exitPos: [2, 2],
    staircases: {},
    cells: [
      [fork(["e"]), passage(["e", "w"]), passage(["w", "s"])],
      [empty, empty, passage(["n", "s"])],
      [empty, empty, fork(["n"], lowerSection)],
    ],
  })

  it("opens the pillar they share to both where they merge", () => {
    expect(buildRoomClaims(cornered("main")).joinedOwners).toContain("0,0|2,2")
  })

  it("keeps the pillar walled where they stand in two sections", () => {
    expect(buildRoomClaims(cornered("s0")).joinedOwners).not.toContain("0,0|2,2")
  })
})
