import { describe, expect, it } from "vitest"
import type { FloorConfig, SideSection } from "@/game/siteTypes"
import { BINDING } from "@/game/testSupport/lockFixtures"
import { leverLock } from "@/game/testSupport/floorLockFixtures"
import type { Lock } from "@/game/lockAuthoring"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { layoutInfeasible, prepareLayout } from "./layoutFeasibility"

const section = (over: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 2,
  difficulty: "expert",
  end: "treasure",
  ...over,
})

const floor = (over: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [{ lock: leverLock() }],
  realisations: BINDING,
  ...over,
})

const prepared = (config: FloorConfig) =>
  prepareLayout("site", config, 7, {
    resolveEncounter: resolveEncounterMeta,
    resolveKeyRequirements,
    floorRef: { journeyId: "site", floorIndex: 0 },
  })

const gated = section({ gate: { type: "tomb-key", wardKeyId: "ward" } })

describe(layoutInfeasible, () => {
  it("a lock standing before the floor's content is asked for no puzzle, even on a floor with none", () => {
    const lock = leverLock()
    const before: Lock = {
      ...lock,
      regions: { foyer: { takes: "nothing" }, hall: { takes: "nothing" }, landing: { takes: "free" } },
    }
    const config = floor({ pathPuzzles: 0, sideSections: [gated], locks: [{ lock: before }] })
    expect(layoutInfeasible(config, prepared(config))).toEqual([])
  })

  it("a lock floor whose main path or an open section holds a puzzle is feasible", () => {
    expect(layoutInfeasible(floor({ pathPuzzles: 1 }), prepared(floor({ pathPuzzles: 1 })))).toEqual([])
    const open = floor({ sideSections: [section()] })
    expect(layoutInfeasible(open, prepared(open))).toEqual([])
  })

  it("a lock floor whose only content is a trapped side path is not infeasible", () => {
    const trapped = floor({ sideSections: [section({ pathPuzzles: 1, sealed: true, encounter: "trap" })] })
    expect(layoutInfeasible(trapped, prepared(trapped))).toEqual([])
  })

  it("a floor with no lock needs no puzzle", () => {
    const bare = floor({ locks: undefined, realisations: undefined })
    expect(layoutInfeasible(bare, prepared(bare))).toEqual([])
  })

  it("a one-way naming a missing section is infeasible", () => {
    const config = floor({
      pathPuzzles: 1,
      locks: undefined,
      realisations: undefined,
      oneWays: [{ from: "main", to: "nowhere" }],
    })
    const found = layoutInfeasible(config, prepared(config))
    expect(found).toHaveLength(1)
    expect(found[0].criterion).toBe("carves")
    expect(found[0].detail).toContain("oneWayUnsatisfied")
  })

  it("more lock regions asking for puzzles than the floor has puzzles is infeasible", () => {
    const lock = leverLock()
    const hungry: Lock = {
      ...lock,
      regions: { ...lock.regions, foyer: { takes: "puzzles" }, hall: { takes: "puzzles" } },
    }
    const config = floor({ pathPuzzles: 1, locks: [{ lock: hungry }] })
    const found = layoutInfeasible(config, prepared(config))
    expect(found.map(f => f.criterion)).toEqual(["lock holds an encounter"])
    expect(found[0].detail).toContain("lever.foyer")
  })
})
