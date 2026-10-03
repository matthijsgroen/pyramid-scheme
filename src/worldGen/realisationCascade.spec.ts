import { describe, expect, it } from "vitest"
import { floorLock } from "../game/floorLock"
import type { RealisationBinding } from "../game/lockCompile"
import { walkLock } from "../game/lockWalk"
import { assembleFloor } from "../game/siteAssembler"
import type { FloorConfig as GameFloorConfig, FloorGrid } from "../game/siteTypes"
import { leverLock } from "../game/testSupport/floorLockFixtures"
import { resolveEncounterMeta, resolveKeyRequirements } from "../mods/allFamilyMeta"
import { buildSite } from "./buildSite"
import { resolvePyramidConstraint } from "./constraintResolver"
import { journey, tier } from "./dsl"
import type { FloorConstraint, PyramidConstraint, Rule } from "./dsl"
import { generateFile } from "./serializer"
import type { FloorConfig, SiteConfig } from "./types"

const JOURNEY = "spec_cascade_journey"
const TIER = "expert"
const LEVELS = 2

type Declared = {
  difficulty?: RealisationBinding
  journey?: RealisationBinding
  pyramid?: RealisationBinding
  floor?: RealisationBinding
  pyramidOneWay?: string
}

// Difficulty is the `tier(...)` rule, journey the `journey(...)` rule, pyramid the one-based `.pyramid(1, ...)`
// and floor the entry of that pyramid's floors: the four places a binding can be declared.
const rulesDeclaring = (declared: Declared, floor: FloorConstraint = {}): Rule[] => [
  ...(declared.difficulty ? [tier(TIER, { realisations: declared.difficulty })] : []),
  ...(declared.journey ? [journey(JOURNEY, { realisations: declared.journey })] : []),
  journey(JOURNEY)
    .pyramid(1, {
      difficulty: TIER,
      pathPuzzles: 2,
      ...(declared.pyramid ? { realisations: declared.pyramid } : {}),
      ...(declared.pyramidOneWay ? { oneWayRealisation: declared.pyramidOneWay } : {}),
    } satisfies PyramidConstraint)
    .floor(0, {
      mainEndReward: "mosaicPiece",
      locks: [{ lock: leverLock() }],
      ...(declared.floor ? { realisations: declared.floor } : {}),
      ...floor,
    }),
]

const buildFloors = (rules: Rule[]): FloorConfig[] =>
  buildSite({
    journeyId: JOURNEY,
    tier: TIER,
    pyramidIndex: 0,
    levelCount: LEVELS,
    pathPuzzles: 2,
    constraint: resolvePyramidConstraint(rules, JOURNEY, TIER, 0, LEVELS),
    difficulty: TIER,
    hasMapPieceBranch: false,
    hasWardGate: false,
    nextTier: null,
    resolveReward: () => ({ type: "mosaicPiece" }),
    resolveMainEndReward: () => ({ type: "mosaicPiece" }),
  }).floors

const carve = (config: FloorConfig, seed: number) =>
  assembleFloor(JOURNEY, config as GameFloorConfig, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: JOURNEY, floorIndex: 0 },
  })

const SEEDS = Array.from({ length: 12 }, (_, n) => n + 1)

const carvedGrids = (config: FloorConfig): FloorGrid[] =>
  SEEDS.flatMap(seed => {
    const result = carve(config, seed)
    return result.success ? [result.grid] : []
  })

// The family the lever's room was dressed as in a carve.
const leverFamily = (grid: FloorGrid): string | undefined => {
  const room = grid.cells.flat().find(cell => cell.type === "room" && cell.mechanismId === "lever.lever")
  return room?.type === "room" ? room.family : undefined
}

// The bake fills every reward slot before it serializes, which this spec does not run; a plain reward stands in.
const placed = (floors: FloorConfig[]): FloorConfig[] =>
  JSON.parse(JSON.stringify(floors).replaceAll('"fragmentSlot"', '"mosaicPiece"'))

// The bake's output read back the way the app loads it.
const loaded = (floors: FloorConfig[]): FloorConfig[] => {
  const text = generateFile({ [JOURNEY]: [floors] })
  const literal = text.split("generatedWorldConfigs: Record<string, SiteConfig[]> = ")[1].split("\n}\n")[0] + "\n}"
  const world = new Function(`return ${literal}`)() as Record<string, SiteConfig[]>
  return world[JOURNEY][0]
}

describe("a binding declared at difficulty, journey, pyramid or floor resolves per kind to the most specific", () => {
  it.each<[string, Declared, RealisationBinding]>([
    ["difficulty alone", { difficulty: { toggle: "d", activator: "d" } }, { toggle: "d", activator: "d" }],
    [
      "journey over difficulty",
      { difficulty: { toggle: "d", activator: "d" }, journey: { toggle: "j" } },
      { toggle: "j", activator: "d" },
    ],
    [
      "pyramid over journey over difficulty",
      { difficulty: { toggle: "d" }, journey: { toggle: "j" }, pyramid: { toggle: "p" } },
      { toggle: "p" },
    ],
    [
      "floor over all three",
      { difficulty: { toggle: "d" }, journey: { toggle: "j" }, pyramid: { toggle: "p" }, floor: { toggle: "f" } },
      { toggle: "f" },
    ],
    [
      "each kind at the level that names it, on one floor",
      {
        difficulty: { toggle: "d", sequence: "d" },
        journey: { activator: "j", sequence: "j" },
        pyramid: { sequence: "p", "fork-switch": "p" },
        floor: { "one-way": "f" },
      },
      { toggle: "d", activator: "j", sequence: "p", "fork-switch": "p", "one-way": "f" },
    ],
    [
      "a floor naming one kind leaves the others to the levels above",
      { pyramid: { toggle: "p", activator: "p" }, floor: { activator: "f" } },
      { toggle: "p", activator: "f" },
    ],
  ])("%s", (_, declared, expected) => {
    expect(buildFloors(rulesDeclaring(declared))[0].realisations).toEqual(expected)
  })

  it("carries no binding on a floor nothing declares one for", () => {
    expect("realisations" in buildFloors(rulesDeclaring({}))[0]).toBe(false)
  })

  it(
    "carves a floor whose lever's realisation the pyramid declared, dressed as that family",
    { timeout: 60_000 },
    () => {
      const floor = buildFloors(rulesDeclaring({ difficulty: { toggle: "torch" }, pyramid: { toggle: "handle" } }))[0]
      const grids = carvedGrids(floor)

      expect(grids).toHaveLength(SEEDS.length)
      expect(grids.map(leverFamily)).toEqual(SEEDS.map(() => "handle"))
      expect(grids.every(grid => walkLock(floorLock(grid)!).sound)).toBe(true)
    }
  )

  it("carves the floor's own declaration over the pyramid's, dressed as that family", { timeout: 60_000 }, () => {
    const floor = buildFloors(rulesDeclaring({ pyramid: { toggle: "handle" }, floor: { toggle: "torch" } }))[0]

    expect(carvedGrids(floor).map(leverFamily)).toEqual(SEEDS.map(() => "torch"))
  })
})

describe("a role no level binds is refused, never defaulted", () => {
  it.each<[string, Declared]>([
    ["no level declares anything", {}],
    [
      "every level declares other kinds",
      {
        difficulty: { activator: "d" },
        journey: { sequence: "j" },
        pyramid: { "fork-switch": "p" },
        floor: { "one-way": "f" },
      },
    ],
  ])("refuses the lever's toggle, naming the instance and kind: %s", (_, declared) => {
    const floor = buildFloors(rulesDeclaring(declared))[0]

    expect(floor.realisations?.toggle).toBeUndefined()
    expect(carve(floor, 1)).toEqual({
      success: false,
      reasons: [
        {
          type: "lockRefused",
          instance: "lever",
          fault: { type: "unboundRole", kind: "toggle", mechanics: ["lever"] },
        },
      ],
    })
  })
})

describe("the binding is fixed when the world is baked", () => {
  const declared: Declared = { difficulty: { toggle: "torch" }, pyramid: { toggle: "handle" } }

  it("reads back from the baked file as the resolved binding", () => {
    const floors = placed(buildFloors(rulesDeclaring(declared)))

    expect(loaded(floors)[0].realisations).toEqual({ toggle: "handle" })
  })

  it(
    "assembles the loaded floor with the baked binding after the pyramid's declaration has changed",
    { timeout: 60_000 },
    () => {
      const baked = loaded(placed(buildFloors(rulesDeclaring(declared))))[0]
      const rebuilt = buildFloors(rulesDeclaring({ ...declared, pyramid: { toggle: "torch" } }))[0]

      expect(carvedGrids(baked).map(leverFamily)).toEqual(SEEDS.map(() => "handle"))
      expect(carvedGrids(rebuilt).map(leverFamily)).toEqual(SEEDS.map(() => "torch"))
    }
  )
})

describe("the one-way's single-name spelling is the one-way entry of the same cascade", () => {
  const plain: FloorConstraint = { locks: [], oneWays: [{ from: "main", to: "main" }] }
  const oneWayOf = (rules: Rule[]): string | undefined => {
    const floor = buildFloors(rules)[0]
    return floor.oneWayRealisation
  }
  const noLocks = (declared: Declared): Rule[] => rulesDeclaring(declared, plain)

  it("resolves a one-way declared at difficulty on a floor without locks, and bakes no binding there", () => {
    const floor = buildFloors(noLocks({ difficulty: { "one-way": "zipline" } }))[0]

    expect(floor.oneWayRealisation).toBe("zipline")
    expect("realisations" in floor).toBe(false)
  })

  it("lets the single-name spelling on the pyramid win over the difficulty's entry", () => {
    expect(oneWayOf(noLocks({ difficulty: { "one-way": "d" }, pyramidOneWay: "p" }))).toBe("p")
  })

  it("lets a floor's entry win over the pyramid's single-name spelling", () => {
    expect(oneWayOf(noLocks({ pyramidOneWay: "p", floor: { "one-way": "f" } }))).toBe("f")
  })

  it("puts a one-way declared above a floor with locks into its binding, not into oneWayRealisation", () => {
    const floor = buildFloors(rulesDeclaring({ pyramidOneWay: "zipline" }))[0]

    expect(floor.realisations).toEqual({ "one-way": "zipline" })
    expect("oneWayRealisation" in floor).toBe(false)
  })

  it("refuses one level naming the one-way twice, differently", () => {
    expect(() => buildFloors(noLocks({ pyramid: { "one-way": "a" }, pyramidOneWay: "b" }))).toThrow(
      'one level binds the one-way to "b" (oneWayRealisation) and to "a" (realisations)'
    )
  })
})
