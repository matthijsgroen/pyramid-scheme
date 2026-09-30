import { describe, expect, it } from "vitest"
import type { AssemblerResult, FloorConfig, FloorGrid } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { searchCarveSeed, seedAtOffset, STAMPED_SEED_RANGE } from "./carveSeedSearch"

const grid = {} as FloorGrid
const carvedAt = (attempt: number): AssemblerResult => ({ success: true, grid, attempt })
const failed: AssemblerResult = { success: false, reasons: [] }

describe(searchCarveSeed, () => {
  it("keeps the base seed when it carves on the first attempt", () => {
    const found = searchCarveSeed(100, () => carvedAt(0), 5, Infinity)
    expect(found).toMatchObject({ found: true, seed: 100, offset: 0, baseRefusal: null })
  })

  it("moves past a base seed that only carves late, and says so", () => {
    const found = searchCarveSeed(100, seed => (seed < 103 ? carvedAt(9) : carvedAt(0)), 5, Infinity)
    expect(found).toMatchObject({ found: true, seed: 103, offset: 3, baseRefusal: "attempt 0" })
  })

  it("gives only the base seed the whole ladder and every other seed one attempt", () => {
    const asked: [number, number][] = []
    searchCarveSeed(
      10,
      (seed, attempts) => {
        asked.push([seed, attempts])
        return failed
      },
      3,
      60
    )
    expect(asked).toEqual([
      [10, 60],
      [11, 1],
      [12, 1],
      [13, 1],
    ])
  })

  it("fails by name when no seed ever carves on the first attempt", () => {
    const missing = searchCarveSeed(1, () => carvedAt(4), 6, Infinity)
    expect(missing).toMatchObject({ found: false, hardest: "attempt 0", tried: 7, baseRefusal: "attempt 0" })
    expect(missing.found ? "" : missing.detail).toContain("attempt 4")
  })

  it("names a floor that never carves as such", () => {
    expect(searchCarveSeed(1, () => failed, 2, Infinity)).toMatchObject({ found: false, hardest: "carves" })
  })

  it("carves a real floor on its first attempt at the seed it finds", () => {
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [],
    }
    const found = searchCarveSeed(
      42,
      (seed, maxAttempts) => assembleFloor("site", { ...config, seed }, 0, undefined, { maxAttempts }),
      10,
      Infinity
    )
    if (!found.found) throw new Error("no seed")
    const again = assembleFloor("site", { ...config, seed: found.seed }, 0)
    expect(again).toMatchObject({ success: true, attempt: 0 })
  })

  describe("a base seed past Number.MAX_SAFE_INTEGER", () => {
    const unsafeBase = 9109538588672898
    const budget = 100

    it("is really unsafe, and plain addition off it collides", () => {
      expect(Number.isSafeInteger(unsafeBase)).toBe(false)
      const plain = Array.from({ length: budget + 1 }, (_, offset) => unsafeBase + offset)
      expect(new Set(plain).size).toBeLessThan(plain.length)
    })

    it("asks every try at a distinct, safe seed in the stamped range, the base itself untouched", () => {
      const asked: number[] = []
      searchCarveSeed(
        unsafeBase,
        seed => {
          asked.push(seed)
          return failed
        },
        budget,
        1
      )
      expect(asked).toHaveLength(budget + 1)
      expect(asked[0]).toBe(unsafeBase)
      expect(new Set(asked).size).toBe(asked.length)
      for (const seed of asked.slice(1)) {
        expect(Number.isSafeInteger(seed)).toBe(true)
        expect(seed).toBeGreaterThanOrEqual(0)
        expect(seed).toBeLessThan(STAMPED_SEED_RANGE)
      }
    })

    it("reduces before adding, so the offset is never lost to rounding", () => {
      for (let offset = 1; offset <= budget; offset++)
        expect(seedAtOffset(unsafeBase, offset)).toBe(((unsafeBase % STAMPED_SEED_RANGE) + offset) % STAMPED_SEED_RANGE)
    })

    it("pins a seed that reproduces its own carve when written as a literal and read back", () => {
      const config: FloorConfig = {
        pathPuzzles: 1,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [],
      }
      const dirsOf = (result: AssemblerResult) => {
        if (!result.success) throw new Error("did not carve")
        return result.grid.cells.map(row => row.map(cell => ("dirs" in cell ? [...cell.dirs].sort().join("") : "")))
      }
      const carve = (seed: number, maxAttempts: number) =>
        assembleFloor("site", { ...config, seed }, unsafeBase, undefined, { maxAttempts })
      // Offset 0 (the unsafe base) is refused by this stand-in, so the search is forced onto a stamped seed.
      const found = searchCarveSeed(
        unsafeBase,
        (seed, maxAttempts) => (seed === unsafeBase ? failed : carve(seed, maxAttempts)),
        budget,
        Infinity
      )
      if (!found.found) throw new Error("no seed")
      expect(found.offset).toBeGreaterThan(0)
      expect(Number.isSafeInteger(found.seed)).toBe(true)
      const literal = Number(String(found.seed))
      expect(literal).toBe(found.seed)
      expect(dirsOf(carve(literal, Infinity))).toEqual(dirsOf({ success: true, grid: found.grid, attempt: 0 }))
    })
  })
})
