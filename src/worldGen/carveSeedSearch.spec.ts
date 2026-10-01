import { describe, expect, it } from "vitest"
import type { AssemblerResult, FloorConfig, FloorGrid } from "@/game/siteTypes"
import { assembleFloor, PACKING_CEILING } from "@/game/siteAssembler"
import {
  packingAtRung,
  searchCarvePair,
  seedAtOffset,
  STAMPED_SEED_RANGE,
  type CarvePairOptions,
} from "./carveSeedSearch"

const grid = {} as FloorGrid
const carvedAt = (attempt: number): AssemblerResult => ({ success: true, grid, attempt })
const failed: AssemblerResult = { success: false, reasons: [] }
const options = (over: Partial<CarvePairOptions> = {}): CarvePairOptions => ({
  authoredPacking: 0.1,
  ceiling: 0.2,
  seedBudget: 5,
  fullLadder: Infinity,
  ...over,
})

describe(packingAtRung, () => {
  it("starts at the authored value and rises by one step a rung, without float drift", () => {
    expect([0, 1, 2, 3, 7].map(rung => packingAtRung(0.1, rung))).toEqual([0.1, 0.12, 0.14, 0.16, 0.24])
  })
})

describe(searchCarvePair, () => {
  it("keeps the authored pair when the base seed carves on the first attempt", () => {
    const found = searchCarvePair(100, () => carvedAt(0), options())
    expect(found).toMatchObject({ found: true, seed: 100, packing: 0.1, offset: 0, baseRefusal: null })
  })

  it("moves the seed before it raises the packing, and says the base refused late", () => {
    const found = searchCarvePair(100, seed => (seed < 103 ? carvedAt(9) : carvedAt(0)), options())
    expect(found).toMatchObject({ found: true, seed: 103, packing: 0.1, offset: 3, baseRefusal: "attempt 0" })
  })

  it("raises the packing one step only after every seed at the lower one is spent", () => {
    const asked: [number, number][] = []
    searchCarvePair(
      10,
      (seed, packing) => {
        asked.push([seed, packing])
        return failed
      },
      options({ seedBudget: 1, ceiling: 0.14 })
    )
    expect(asked).toEqual([
      [10, 0.1],
      [11, 0.1],
      [10, 0.12],
      [11, 0.12],
      [10, 0.14],
      [11, 0.14],
    ])
  })

  it("settles on the smallest packing any seed carves at, and the seed that did", () => {
    const found = searchCarvePair(
      50,
      (seed, packing) => (packing >= 0.14 && seed === 52 ? carvedAt(0) : carvedAt(3)),
      options({ ceiling: 0.5 })
    )
    expect(found).toMatchObject({ found: true, seed: 52, packing: 0.14, offset: 2, baseRefusal: "attempt 0" })
  })

  it("gives only the authored packing's base seed the whole ladder and every other try one attempt", () => {
    const asked: [number, number, number][] = []
    searchCarvePair(
      10,
      (seed, packing, attempts) => {
        asked.push([seed, packing, attempts])
        return failed
      },
      options({ seedBudget: 1, ceiling: 0.12, fullLadder: 60 })
    )
    expect(asked).toEqual([
      [10, 0.1, 60],
      [11, 0.1, 1],
      [10, 0.12, 1],
      [11, 0.12, 1],
    ])
  })

  it("never asks for a packing past the ceiling", () => {
    const asked: number[] = []
    searchCarvePair(
      1,
      (_seed, packing) => {
        asked.push(packing)
        return failed
      },
      options({ seedBudget: 0, ceiling: 0.16 })
    )
    expect(asked).toEqual([0.1, 0.12, 0.14, 0.16])
  })

  it("fails by name when no pair ever carves on the first attempt, and says how high it went", () => {
    const missing = searchCarvePair(1, () => carvedAt(4), options({ seedBudget: 6 }))
    expect(missing).toMatchObject({
      found: false,
      hardest: "attempt 0",
      tried: 42,
      reached: 0.2,
      baseRefusal: "attempt 0",
    })
    expect(missing.found ? "" : missing.detail).toContain("attempt 4")
  })

  it("names the true failure of the authored pair, not the ladder's late carve", () => {
    const missing = searchCarvePair(1, (_seed, _packing, attempts) => (attempts > 1 ? carvedAt(5) : failed), options())
    expect(missing).toMatchObject({ found: false, hardest: "carves", baseRefusal: "attempt 0" })
  })

  it("names a floor that never carves as such", () => {
    expect(searchCarvePair(1, () => failed, options({ seedBudget: 2 }))).toMatchObject({
      found: false,
      hardest: "carves",
      baseRefusal: "carves",
    })
  })

  it("carves a real floor on its first attempt at the pair it finds", () => {
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [],
    }
    const found = searchCarvePair(
      42,
      (seed, packing, maxAttempts) =>
        assembleFloor("site", { ...config, seed, packing }, 0, undefined, { maxAttempts }),
      options({ seedBudget: 10, ceiling: PACKING_CEILING })
    )
    if (!found.found) throw new Error("no pair")
    const again = assembleFloor("site", { ...config, seed: found.seed, packing: found.packing }, 0)
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
      searchCarvePair(
        unsafeBase,
        seed => {
          asked.push(seed)
          return failed
        },
        options({ seedBudget: budget, ceiling: 0.1, fullLadder: 1 })
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
      const found = searchCarvePair(
        unsafeBase,
        (seed, _packing, maxAttempts) => (seed === unsafeBase ? failed : carve(seed, maxAttempts)),
        options({ seedBudget: budget, ceiling: 0.1 })
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
