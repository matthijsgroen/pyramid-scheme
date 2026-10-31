import { describe, expect, it } from "vitest"
import { bittenRooms, claimsFloorAt, isChamber, roomsMerge } from "./roomFootprint"
import { assembleAt, chamberFloor } from "./carve/carveFixtures"
import type { Direction, FloorGrid, GridCell } from "./siteTypes"

const portal = (...dirs: Direction[]) => ({ roomType: "portal" as const, dirs: new Set(dirs) })

describe("isChamber", () => {
  it("makes a portal with more than one way out a chamber, whatever kind of portal it is", () => {
    for (const kind of ["stairhead", "entrance", "exit"]) {
      expect(isChamber(portal("n", "s"), kind)).toBe(true)
      expect(isChamber(portal("n", "e", "s"), kind)).toBe(true)
    }
  })

  it("leaves a portal with one way out as it was: a stairhead or exit is a chamber, a door in is not", () => {
    expect(isChamber(portal("n"), "stairhead")).toBe(true)
    expect(isChamber(portal("n"), "exit")).toBe(true)
    expect(isChamber(portal("n"), "entrance")).toBe(false)
  })

  it("makes a pass-through chamber a chamber, whatever activity it was given", () => {
    expect(isChamber({ roomType: "chamber", dirs: new Set<Direction>(["e", "w"]) }, "fork")).toBe(true)
  })

  it("leaves a puzzle standing where a branch hangs off it a stop in the corridor", () => {
    expect(isChamber({ roomType: "encounter", dirs: new Set<Direction>(["n", "e", "s"]) }, "puzzle")).toBe(false)
  })
})

describe("claimsFloorAt", () => {
  it("agrees with the chamber rule on every room of a carved floor", () => {
    const result = assembleAt(
      "claims",
      chamberFloor({ sideSections: [{ pathPuzzles: 1, difficulty: "junior", end: "treasure" }] }),
      3
    )
    if (!result.success) throw new Error(JSON.stringify(result.reasons))
    const grid = result.grid
    const claims: boolean[] = []
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.cells[r][c]
        if (cell.type !== "room") {
          expect(claimsFloorAt(grid, r, c)).toBe(false)
          continue
        }
        const deadEnd = cell.dirs.size === 1
        const isEntrance = r === grid.entrancePos[0] && c === grid.entrancePos[1]
        const treasureLike =
          cell.roomType === "encounter" && (cell.tags?.includes("treasure") || cell.tags?.includes("shop"))
        const expected =
          cell.roomType === "fork" ||
          cell.roomType === "chamber" ||
          cell.authoredActivity !== undefined ||
          (cell.roomType === "portal" && cell.dirs.size > 1) ||
          (deadEnd && (!!treasureLike || (cell.roomType === "portal" && !isEntrance)))
        expect(claimsFloorAt(grid, r, c)).toBe(expected)
        claims.push(expected)
      }
    expect(claims).toContain(true)
    expect(claims).toContain(false)
  })
})

/**
 * A grid drawn as text: `F` a fork, `T` a treasure dead end, `G` a gate room, `.` a corridor, each open toward every
 * drawn neighbour. A cell's section is `main` unless `sections` names another for its `r,c`.
 */
const sketch = (rows: string[], sections: Record<string, string> = {}): FloorGrid => {
  const cols = Math.max(...rows.map(row => row.length))
  const drawn = (r: number, c: number) => (rows[r]?.[c] ?? " ") !== " "
  const MOVES: [Direction, number, number][] = [
    ["n", -1, 0],
    ["s", 1, 0],
    ["w", 0, -1],
    ["e", 0, 1],
  ]
  const cells = rows.map((_, r) =>
    Array.from({ length: cols }, (_, c): GridCell => {
      const at = rows[r][c] ?? " "
      if (at === " ") return { type: "empty" }
      const dirs = new Set(MOVES.filter(([, dr, dc]) => drawn(r + dr, c + dc)).map(([dir]) => dir))
      const base = { dirs, state: "fogged" as const, sectionAddress: sections[`${r},${c}`] ?? "main" }
      if (at === ".") return { type: "corridor", ...base }
      if (at === "F") return { type: "room", roomType: "fork", ...base }
      if (at === "G") return { type: "room", roomType: "encounter", tags: ["gate"], ...base }
      return { type: "room", roomType: "encounter", tags: ["treasure"], ...base }
    })
  )
  return { siteId: "site", rows: rows.length, cols, entrancePos: [0, 0], exitPos: [0, 0], staircases: {}, cells }
}

describe("roomsMerge", () => {
  it("diagonal same-section rooms merge through the pillar only when a corner joins them", () => {
    expect(roomsMerge(sketch(["F..", "  .", "  F"]), 0, 0, 2, 2)).toBe(true)
    expect(roomsMerge(sketch(["F  ", ".  ", "..F"]), 0, 0, 2, 2)).toBe(true)
    // No corner node, a corner open to one of them only, and a gate in the corner.
    expect(roomsMerge(sketch(["..F  ", "     ", "  F.."]), 0, 2, 2, 4)).toBe(false)
    expect(roomsMerge(sketch(["..F..", "     ", "  F.."]), 0, 2, 2, 4)).toBe(false)
    expect(roomsMerge(sketch(["F.G", "  .", "  F"]), 0, 0, 2, 2)).toBe(false)
  })

  it("never merges two rooms of different sections across a diagonal, whatever joins them", () => {
    expect(roomsMerge(sketch(["F..", "  .", "  F"], { "2,2": "s0" }), 0, 0, 2, 2)).toBe(false)
  })

  it("never merges two rooms through a corner a door may stand in, whether or not one stands there", () => {
    expect(roomsMerge(sketch(["F..", "  .", "  F"]), 0, 0, 2, 2, new Set(["0,2"]))).toBe(false)
    expect(roomsMerge(sketch(["F  ", ".  ", "..F"]), 0, 0, 2, 2, new Set(["0,2"]))).toBe(true)
  })

  it("merges two ortho rooms a passage joins, and keeps two it does not apart", () => {
    expect(roomsMerge(sketch(["F.F"]), 0, 0, 0, 2)).toBe(true)
    expect(roomsMerge(sketch(["F F", ". .", "..."]), 0, 0, 0, 2)).toBe(false)
  })
})

describe("bittenRooms", () => {
  it("names the two rooms that claim floor one node apart without merging", () => {
    expect(bittenRooms(sketch(["T T", ". .", "..."]))).toEqual(["0,0", "0,2"])
    expect(bittenRooms(sketch(["T  ", ".  ", "..T"]))).toBeUndefined()
    expect(bittenRooms(sketch(["F.F", ". .", "..."]))).toBeUndefined()
  })

  it("reads a corner a door may stand in as shut, so a door standing there or not refuses alike", () => {
    expect(bittenRooms(sketch(["T..", "  .", "  T"]), new Set(["0,2"]))).toEqual(["0,0", "2,2"])
    expect(bittenRooms(sketch(["T.G", "  .", "  T"]), new Set(["0,2"]))).toEqual(["0,0", "2,2"])
  })
})
