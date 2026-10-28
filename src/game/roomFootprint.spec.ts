import { describe, expect, it } from "vitest"
import { claimsFloorAt, isChamber } from "./roomFootprint"
import { assembleAt, chamberFloor } from "./carve/carveFixtures"
import type { Direction } from "./siteTypes"

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
