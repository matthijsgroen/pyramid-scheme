import { describe, expect, it } from "vitest"
import { sluiceLock } from "../game/testSupport/lockFixtures"
import { buildTombConfigsFor } from "./configBuilder"
import { journey, tomb } from "./dsl"
import type { TombJourneyDef } from "./types"

const madeUpTomb = (levelCount: number): TombJourneyDef => ({ id: "t", tier: "starter", floorCount: 1, levelCount })

describe("buildTombConfigsFor", () => {
  it("builds one site per tomb level, the tomb's rules on the last", () => {
    const configs = buildTombConfigsFor(
      [madeUpTomb(2)],
      [
        journey("t").pyramid("first", { floors: [{ pathPuzzles: 2, encounter: "puzzle" }] }),
        tomb("t", { encounter: "tomb-puzzle", floorCount: 1, floors: [{ mainEndReward: "tombTreasure" }] }),
      ]
    )
    expect(configs.t).toHaveLength(2)
    expect(configs.t[0][0].encounter).toBe("puzzle")
    expect(configs.t[0][0].sideSections.some(s => s.gate?.type === "tomb-key")).toBe(false)
    expect(configs.t[1][0].encounter).toBe("tomb-puzzle")
  })

  it("refuses an earlier level that authors no floors", () => {
    expect(() => buildTombConfigsFor([madeUpTomb(2)], [tomb("t", { floorCount: 1 })])).toThrow(/must author its floors/)
  })

  it("passes an authored tomb floor's locks and difficulty through", () => {
    const configs = buildTombConfigsFor(
      [madeUpTomb(1)],
      [
        tomb("t", {
          floorCount: 1,
          floors: [{ difficulty: "junior", locks: [{ lock: sluiceLock() }], realisations: { toggle: "handle" } }],
        }),
      ]
    )
    expect(configs.t[0][0].difficulty).toBe("junior")
    expect(configs.t[0][0].locks).toHaveLength(1)
    expect(configs.t[0][0].realisations).toBeDefined()
  })
})
