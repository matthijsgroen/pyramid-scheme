import { describe, expect, it } from "vitest"
import { isChamber, portalKindOf } from "../roomFootprint"
import type { FloorConfig, FloorGrid, RoomCell } from "../siteTypes"
import { assembleFloor } from "./assembleFloor"
import { chamberFloor, graphDistance } from "./carveFixtures"

const SEEDS = [1, 2, 3, 4, 5, 6]

const carved = (config: FloorConfig, seed: number): FloorGrid => {
  const result = assembleFloor(`chamber-site-${seed}`, config, seed)
  if (!result.success) throw new Error(JSON.stringify(result.reasons))
  return result.grid
}

const roomsWhere = (grid: FloorGrid, test: (cell: RoomCell) => boolean) =>
  grid.cells.flatMap((row, r) => row.flatMap((cell, c) => (cell.type === "room" && test(cell) ? [{ r, c, cell }] : [])))

const chambersOf = (grid: FloorGrid) => roomsWhere(grid, cell => cell.roomType === "chamber")
const puzzleAt = (grid: FloorGrid, k: number) =>
  roomsWhere(grid, cell => cell.roomType === "encounter" && cell.pathIndex === k && cell.sectionAddress === "main")[0]

const roomySide = {
  pathPuzzles: 2,
  difficulty: "junior" as const,
  end: "treasure" as const,
  decorations: ["pillar" as const],
}

const expectOnlyWidened = (without: FloorGrid, withChambers: FloorGrid) => {
  const chambers = new Set(chambersOf(withChambers).map(({ r, c }) => `${r},${c}`))
  withChambers.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      const before = without.cells[r][c]
      if (chambers.has(`${r},${c}`)) {
        expect(before.type).toBe("corridor")
        if (before.type !== "empty" && cell.type !== "empty") expect(cell.dirs).toEqual(before.dirs)
      } else {
        expect(cell.type).toBe(before.type)
        if (cell.type === "room" && before.type === "room") {
          expect([cell.roomType, cell.pathIndex, cell.familyOrdinal, [...cell.dirs]]).toEqual([
            before.roomType,
            before.pathIndex,
            before.familyOrdinal,
            [...before.dirs],
          ])
        }
      }
    })
  )
}

describe("seatChambers", () => {
  it("moves no wall and no puzzle: a chamber only widens a node that was corridor", () => {
    for (const seed of SEEDS) {
      const withChambers = carved(chamberFloor({ chambers: 2 }), seed)
      expect(chambersOf(withChambers)).toHaveLength(2)
      expectOnlyWidened(carved(chamberFloor(), seed), withChambers)
    }
  })

  it("seats what fits of the count on the side paths too and carves on, moving no wall", () => {
    const spilling = { pathPuzzles: 1, packing: 1 as const, sideSections: [roomySide] }
    const seated = SEEDS.map(seed => {
      const withChambers = carved(chamberFloor({ ...spilling, chambers: 40 }), seed)
      expectOnlyWidened(carved(chamberFloor(spilling), seed), withChambers)
      return chambersOf(withChambers).map(({ cell }) => cell.sectionAddress)
    })
    for (const addresses of seated) expect(addresses.length).toBeLessThan(40)
    expect(seated.flat()).toContain("s0")
  })

  it("seats none of the count on a side path authored with no props, so every chamber it seats is dressed", () => {
    const bare = { pathPuzzles: 1, packing: 1 as const, sideSections: [{ ...roomySide, decorations: undefined }] }
    for (const seed of SEEDS) {
      const chambers = chambersOf(carved(chamberFloor({ ...bare, chambers: 40 }), seed))
      expect(chambers.map(({ cell }) => cell.sectionAddress)).not.toContain("s0")
      for (const { cell } of chambers) expect(cell.decoration).toBeDefined()
    }
  })

  it("stands the chamber authored after a puzzle on the way from that puzzle to the next", () => {
    for (const seed of SEEDS) {
      const grid = carved(chamberFloor({ chambersByIndex: { 1: true } }), seed)
      const [chamber] = chambersOf(grid)
      const [from, to] = [puzzleAt(grid, 1), puzzleAt(grid, 2)]
      const via =
        graphDistance(grid, [from.r, from.c], [chamber.r, chamber.c]) +
        graphDistance(grid, [chamber.r, chamber.c], [to.r, to.c])
      expect(via).toBe(graphDistance(grid, [from.r, from.c], [to.r, to.c]))
    }
  })

  it("seats a chamber authored on a side path in that path's own gap, filed under its section", () => {
    const side = { ...roomySide, chambersByIndex: { 0: true as const } }
    for (const seed of SEEDS) {
      const grid = carved(chamberFloor({ sideSections: [side] }), seed)
      expect(chambersOf(grid).map(({ cell }) => cell.sectionAddress)).toEqual(["s0"])
    }
  })

  it("is a room the player passes through, two ways out, with no other room claiming floor beside it", () => {
    for (const seed of SEEDS) {
      const grid = carved(chamberFloor({ chambers: 3 }), seed)
      for (const { r, c, cell } of chambersOf(grid)) {
        expect(cell.dirs.size).toBe(2)
        for (const dr of [-2, 0, 2])
          for (const dc of [-2, 0, 2]) {
            if (dr === 0 && dc === 0) continue
            const near = grid.cells[r + dr]?.[c + dc]
            if (near?.type !== "room") continue
            const kind = near.roomType === "portal" ? portalKindOf(grid, r + dr, c + dc, near) : "room"
            expect(isChamber(near, kind)).toBe(false)
          }
      }
    }
  })

  it("seats its chambers where it would without a story's activity on a puzzle, whatever claims a diagonal", () => {
    const storied = { 0: "weighing", 1: "weighing", 2: "weighing" } as const
    const SPREAD = [...SEEDS, 7, 8, 9, 10, 11, 12]
    const at = (grid: FloorGrid) => chambersOf(grid).map(({ r, c }) => `${r},${c}`)
    const nearStory = SPREAD.filter(seed => {
      const plain = carved(chamberFloor({ chambers: 3 }), seed)
      const story = carved(chamberFloor({ chambers: 3, activitiesByIndex: storied }), seed)
      expect(at(story)).toEqual(at(plain))
      return chambersOf(story).some(({ r, c }) =>
        [0, 1, 2].some(k => {
          const puzzle = puzzleAt(story, k)
          return Math.abs(puzzle.r - r) <= 2 && Math.abs(puzzle.c - c) <= 2
        })
      )
    })
    expect(nearStory.length).toBeGreaterThan(0)
  })

  it("dresses a chamber for the activity it was authored for", () => {
    const grid = carved(chamberFloor({ chambersByIndex: { 0: "weighing" } }), 1)
    const [{ cell }] = chambersOf(grid)
    expect(cell.authoredActivity).toBe("weighing")
    expect(cell.activity).toBe("weighing")
    expect(["scale", "weightsTable"]).toContain(cell.decoration)
  })

  it("dresses a chamber left to the carve from the pool's filler where no activity is furnished", () => {
    const grid = carved(chamberFloor({ chambers: 1, decorations: ["pillar"] }), 1)
    const [{ cell }] = chambersOf(grid)
    expect(cell.activity).toBeUndefined()
    expect(cell.decoration).toBe("pillar")
  })

  it("refuses a floor whose chamber authored after a puzzle finds no free node in that puzzle's gap", () => {
    const result = assembleFloor("chamber-site", chamberFloor({ chambersByIndex: { 3: true } }), 1)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.reasons.map(reason => reason.type)).toContain("chambersNotSeated")
  })
})
