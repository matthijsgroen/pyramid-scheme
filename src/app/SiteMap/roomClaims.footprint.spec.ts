import { describe, expect, it, vi } from "vitest"
import type {
  CellState,
  DecorationKind,
  Direction,
  FloorGrid,
  GridCell,
  PropFootprint,
  RoomCell,
} from "@/game/siteTypes"
import { buildRoomClaims } from "./roomClaims"

// Every kind counts as authored and painted, so the companion rule is exercised without reading the world.
vi.mock("./authoredKinds", async importOriginal => {
  const actual = await importOriginal<typeof import("./authoredKinds")>()
  const { DECORATION_KINDS } = await import("@/game/siteTypes")
  return { ...actual, authoredKindsFor: () => ({ props: [...DECORATION_KINDS], wallItems: [], scatter: [] }) }
})
vi.mock("./tileAssets", async importOriginal => {
  const actual = await importOriginal<typeof import("./tileAssets")>()
  return { ...actual, tileUrl: () => "painted.png" }
})

const state: CellState = "completed"
const empty: GridCell = { type: "empty" }
const corridor = (dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state })
const fork = (dirs: Direction[], over: Partial<RoomCell> = {}): RoomCell => ({
  type: "room",
  roomType: "fork",
  dirs: new Set(dirs),
  state,
  ...over,
})

// Made-up footprints: `shelf` lies two cells across, everything else is one cell.
const WIDE: PropFootprint = { cols: 2, rows: 1, tall: 0 }
const footprints =
  (wide: readonly DecorationKind[]) =>
  (kind: DecorationKind): PropFootprint =>
    wide.includes(kind) ? WIDE : { cols: 1, rows: 1, tall: 0 }

const floor = (cells: GridCell[][]): FloorGrid => ({
  siteId: "site",
  rows: cells.length,
  cols: cells[0].length,
  entrancePos: [0, 0],
  exitPos: [0, 0],
  staircases: {},
  cells,
})

/** A junction on an east-west passage: its 3x3 footprint has free floor both north and south of it. */
const eastWest = (room: Partial<RoomCell>): FloorGrid =>
  floor([
    [empty, empty, empty, empty, empty],
    [empty, empty, empty, empty, empty],
    [corridor(["e"]), corridor(["e", "w"]), fork(["e", "w"], room), corridor(["e", "w"]), corridor(["w"])],
    [empty, empty, empty, empty, empty],
    [empty, empty, empty, empty, empty],
  ])

/** A junction on a north-south passage, three cells wide: no two of its free cells sit side by side. */
const northSouth = (room: Partial<RoomCell>): GridCell[][] => [
  [empty, corridor(["s"]), empty],
  [empty, corridor(["n", "s"]), empty],
  [empty, fork(["n", "s"], room), empty],
  [empty, corridor(["n", "s"]), empty],
  [empty, corridor(["n"]), empty],
]

describe("a prop wider than one cell", () => {
  it("stands where its east neighbour is the room's own free floor, covering both cells", () => {
    const claims = buildRoomClaims(eastWest({ decoration: "shelf" }), footprints(["shelf"]))
    expect(claims.decorationAt.get("1,2")).toBe("shelf")
    expect(claims.decorationAt.has("1,3")).toBe(false)
    expect(claims.decorationCells).toContain("1,3")
  })

  it("stands a single-cell kind on one cell, as before", () => {
    const claims = buildRoomClaims(eastWest({ decoration: "shelf" }), footprints([]))
    expect(claims.decorationAt.get("1,2")).toBe("shelf")
    expect([...claims.decorationCells].sort()).toEqual([...claims.decorationAt.keys()].sort())
  })

  it("stands the room's single-cell fallback where its east neighbour is wall", () => {
    const claims = buildRoomClaims(
      floor(northSouth({ decoration: "shelf", decorationFallback: "jarRack" })),
      footprints(["shelf"])
    )
    expect([...claims.decorationAt.values()]).toEqual(["jarRack"])
    expect(claims.decorationCells.size).toBe(1)
  })

  it("stands nothing when it does not fit and the room has no fallback", () => {
    const claims = buildRoomClaims(floor(northSouth({ decoration: "shelf" })), footprints(["shelf"]))
    expect(claims.decorationAt.size).toBe(0)
    expect(claims.decorationCells.size).toBe(0)
  })

  it("never reaches into another room's footprint", () => {
    // Two north-south junctions side by side: the west one's free cells meet the east one's claims.
    const west = northSouth({ decoration: "shelf", decorationFallback: "jarRack" })
    const east = northSouth({ decoration: "shelf", decorationFallback: "basin" })
    const claims = buildRoomClaims(floor(west.map((row, r) => [...row, ...east[r]])), footprints(["shelf"]))
    expect([...claims.decorationAt.values()].sort()).toEqual(["basin", "jarRack"])
    for (const [anchor] of claims.decorationAt) {
      const owner = claims.claimedBy.get(anchor)
      for (const cell of claims.decorationCells) if (claims.claimedBy.get(cell) === owner) expect(cell).toBe(anchor)
    }
  })

  it("never overlaps another decoration: a god's pair stands on the cells the first one left", () => {
    const claims = buildRoomClaims(eastWest({ decoration: "statue", patronRoom: true }), footprints(["statue"]))
    expect([...claims.decorationAt.values()]).toEqual(["statue", "statue"])
    expect(claims.decorationCells.size).toBe(4)
  })

  it("leaves out a wide companion that finds no free pair once the leader has stood, keeping the leader", () => {
    // Free floor north of the junction (three across) and one cell south of it, flanked by passages.
    const claims = buildRoomClaims(
      floor([
        [empty, empty, empty, empty, empty],
        [empty, empty, empty, empty, empty],
        [
          corridor(["e"]),
          corridor(["e", "w"]),
          fork(["e", "w"], { decoration: "statue", patronRoom: true }),
          corridor(["e", "w"]),
          corridor(["w"]),
        ],
        [empty, corridor(["n", "s"]), empty, corridor(["n", "s"]), empty],
        [empty, corridor(["n", "s"]), empty, corridor(["n", "s"]), empty],
      ]),
      footprints(["statue"])
    )
    expect([...claims.decorationAt]).toEqual([["1,2", "statue"]])
    expect([...claims.decorationCells].sort()).toEqual(["1,2", "1,3"])
  })
})

describe("a companion stands against stone or not at all", () => {
  // A stairhead on the map's top row: the leader takes the one free cell with wall above it; the rest of
  // its floor lies under the stair or a passage. "a" is a site whose hash gives this room a companion.
  const stairhead = (eastOfStair: "stone" | "passage"): FloorGrid => {
    const portal: RoomCell = {
      type: "room",
      roomType: "portal",
      stairId: "down",
      stairGoes: "down",
      dirs: new Set<Direction>(["w"]),
      state,
      decoration: "shelf",
      activity: "storage",
    }
    const below = eastOfStair === "passage" ? [corridor(["s"]), corridor(["n"])] : [empty, empty]
    return {
      ...floor([
        [corridor(["e"]), portal, empty],
        [empty, empty, below[0]],
        [empty, empty, below[1]],
      ]),
      siteId: "a",
      staircases: { down: [0, 1] },
    }
  }

  it("stands a companion on a free cell with wall above it", () => {
    const claims = buildRoomClaims(stairhead("stone"), footprints([]))
    expect([...claims.decorationAt.keys()]).toEqual(["0,2", "1,2"])
  })

  it("leaves the companion out when the only cells left have floor above them, keeping the leader", () => {
    const claims = buildRoomClaims(stairhead("passage"), footprints([]))
    expect([...claims.decorationAt]).toEqual([["0,2", "shelf"]])
  })
})
