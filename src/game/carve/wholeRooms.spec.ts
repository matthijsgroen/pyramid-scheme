import { describe, expect, it } from "vitest"
import { carvedFloorDigest } from "@/data/tierFingerprints"
import { claimsFloorAt, roomsMerge } from "../roomFootprint"
import { assembleFloor } from "../siteAssembler"
import type { FloorConfig, FloorGrid, SideSection } from "../siteTypes"
import { plainFloor } from "./carveFixtures"
import { NEAR_NODES } from "./grid"

const side = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})

const FLOORS: Record<string, FloorConfig> = {
  "four short side paths": plainFloor({ pathPuzzles: 2, sideSections: [side(), side(), side(), side()] }),
  "a gated side path beside a longer one": plainFloor({
    pathPuzzles: 2,
    sideSections: [side(), side({ pathPuzzles: 1 }), side({ gate: { type: "floor-key" } })],
  }),
  "side paths hanging off a side path": plainFloor({
    pathPuzzles: 3,
    sideSections: [side(), side(), side({ sideSections: [side(), side()] })],
  }),
}
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]

const carved = new Map<string, FloorGrid[]>()
const carvesOf = (name: string): FloorGrid[] => {
  if (!carved.has(name))
    carved.set(
      name,
      SEEDS.flatMap(seed => {
        const result = assembleFloor("whole-rooms", FLOORS[name], seed)
        return result.success ? [result.grid] : []
      })
    )
  return carved.get(name)!
}

type Pair = { a: [number, number]; b: [number, number]; ortho: boolean; sameSection: boolean; merged: boolean }

/** Every two rooms that claim floor one node apart, each pair once. */
const nearPairs = (grid: FloorGrid): Pair[] => {
  const pairs: Pair[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      if (!claimsFloorAt(grid, r, c)) continue
      for (const [dr, dc] of NEAR_NODES) {
        const [r2, c2] = [r + dr, c + dc]
        if (r2 * grid.cols + c2 <= r * grid.cols + c || !claimsFloorAt(grid, r2, c2)) continue
        const a = grid.cells[r][c]
        const b = grid.cells[r2][c2]
        if (a.type !== "room" || b.type !== "room") continue
        pairs.push({
          a: [r, c],
          b: [r2, c2],
          ortho: dr === 0 || dc === 0,
          sameSection: a.sectionAddress === b.sectionAddress,
          merged: roomsMerge(grid, r, c, r2, c2),
        })
      }
    }
  return pairs
}

const pairsOf = (filter: (pair: Pair) => boolean) =>
  Object.keys(FLOORS).flatMap(name => carvesOf(name).flatMap(nearPairs).filter(filter))

describe("rooms that claim floor are never bitten", { timeout: 120_000 }, () => {
  it("carves every floor on most seeds", () => {
    for (const name of Object.keys(FLOORS)) expect(carvesOf(name).length, name).toBeGreaterThanOrEqual(6)
  })

  it("two rooms of different sections never stand one node apart", () => {
    // The one exception is a side path's own room at its fork's door: the passage between them makes them one space.
    const apart = pairsOf(pair => !pair.sameSection)
    expect(apart.filter(pair => !pair.ortho || !pair.merged)).toEqual([])
  })

  it("an unjoined same-section pair is kept apart", () => {
    expect(pairsOf(pair => pair.sameSection && !pair.merged)).toEqual([])
    expect(pairsOf(pair => pair.sameSection).length).toBeGreaterThan(0)
  })

  it("the backstop refuses a bitten room naming both rooms", () => {
    const refused = SEEDS.flatMap(seed => {
      const result = assembleFloor("whole-rooms", FLOORS["four short side paths"], seed, undefined, { maxAttempts: 8 })
      return result.success ? [] : result.reasons.flatMap(reason => (reason.type === "roomsBite" ? [reason] : []))
    })
    expect(refused.length).toBeGreaterThan(0)
    for (const { rooms } of refused) {
      const [[r1, c1], [r2, c2]] = rooms.map(room => room.split(",").map(Number))
      expect(rooms[0]).not.toBe(rooms[1])
      expect(Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2))).toBe(2)
    }
  })

  it("a bitten floor carves the same twice", () => {
    const bitten = SEEDS.find(seed => {
      const result = assembleFloor("whole-rooms", FLOORS["four short side paths"], seed, undefined, { maxAttempts: 8 })
      return !result.success && result.reasons.some(reason => reason.type === "roomsBite")
    })
    expect(bitten).toBeDefined()
    const twice = [0, 1].map(() => assembleFloor("whole-rooms", FLOORS["four short side paths"], bitten!))
    const [first, second] = twice.map(result => (result.success ? carvedFloorDigest(result.grid) : undefined))
    expect(first).toBeDefined()
    expect(second).toBe(first)
  })
})
