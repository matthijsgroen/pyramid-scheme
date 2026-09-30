import { describe, expect, it } from "vitest"
import type { AssemblerResult, FloorConfig, FloorGrid } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { searchCarveSeed } from "./carveSeedSearch"

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
})
