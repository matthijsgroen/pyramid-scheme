import { describe, expect, it } from "vitest"
import { reachableFloorsInSite } from "./reachability"
import type { FloorConfig } from "./types"
import { MOD_REACHABILITY_SUPPORT } from "../mods/registeredMods"

const REF = { journeyId: "bake", levelIndex: 0 }

const floor = (oneWayRealisation?: string): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lower" },
  ],
  oneWays: [{ from: "upper", to: "lower" }],
  ...(oneWayRealisation ? { oneWayRealisation } : {}),
})

// The support the bake itself hands buildConfigs, so reachability binds one-ways as the runtime does.
const walk = (config: FloorConfig, seed: number) =>
  reachableFloorsInSite(REF, [config], new Set(), seed, undefined, undefined, MOD_REACHABILITY_SUPPORT)

describe("a bake binds one-ways through the registry, as play does", () => {
  it("refuses a floor whose one-way is bound to no realisation, naming the one-way", () => {
    expect(() => walk(floor(), 1)).toThrow(/oneWayRealisationRefused.*"from":"upper","to":"lower".*"why":"unbound"/)
  })

  it("refuses a realisation no registered mod declares", () => {
    expect(() => walk(floor("headwind"), 1)).toThrow(/"realisation":"headwind","why":"unknown"/)
  })

  it("lets a one-way bound to a declared realisation through to the carve", () => {
    const outcomes = Array.from({ length: 60 }, (_, seed) => {
      try {
        walk(floor("zipline"), seed + 1)
        return "assembled"
      } catch (error) {
        return String(error)
      }
    })
    expect(outcomes).toContain("assembled")
    expect(outcomes.filter(outcome => outcome.includes("oneWayRealisationRefused"))).toEqual([])
  })
})
