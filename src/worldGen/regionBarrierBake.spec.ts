import { describe, expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig } from "@/game/siteTypes"
import {
  offRouteSluiceFloor,
  onRouteSluiceFloor,
  strandingSluiceFloor,
  unwinnableSluiceFloor,
} from "@/game/testSupport/regionBarrierFixtures"
import { refusal } from "./carveSeedSearch"

const SEEDS = Array.from({ length: 6 }, (_, n) => (n + 1) * 7919)

// Every seed that carves, taken as if it had carved on the first attempt, so the walk is what is asked.
const verdicts = (make: () => FloorConfig) =>
  SEEDS.flatMap(seed => {
    const result = assembleFloor("test", make(), seed)
    return result.success ? [refusal({ ...result, attempt: 0 })] : []
  })

describe("the bake's verdict on a floor with a region barrier", () => {
  it("accepts floors where every shut state can still be worked out of", () => {
    for (const make of [offRouteSluiceFloor, onRouteSluiceFloor]) {
      const found = verdicts(make)

      expect(found.length).toBeGreaterThan(0)
      expect(found.every(verdict => verdict === null)).toBe(true)
    }
  })

  it("refuses a floor whose barriers leave the way out shut in every state", () => {
    const found = verdicts(unwinnableSluiceFloor)

    expect(found.length).toBeGreaterThan(0)
    expect(found).toEqual(
      found.map(() => ({ criterion: "lock walks sound", detail: "no sequence of moves reaches the way out" }))
    )
  })

  it("refuses a floor where one reachable press floods the way out for good", () => {
    const found = verdicts(strandingSluiceFloor)

    expect(found.length).toBeGreaterThan(0)
    for (const verdict of found) {
      expect(verdict?.criterion).toBe("lock walks sound")
      expect(verdict?.detail).toMatch(/^from at \d+,\d+, obstacle \d+,\d+ at wet, nothing reaches the way out$/)
    }
  })
})
