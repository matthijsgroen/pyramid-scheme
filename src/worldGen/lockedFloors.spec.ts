import { describe, expect, it } from "vitest"
import { floorLock } from "../game/floorLock"
import { walkLock } from "../game/lockWalk"
import { assembleFloor } from "../game/siteAssembler"
import type { FloorConfig as GameFloorConfig, FloorGrid } from "../game/siteTypes"
import { BINDING, sluiceLock } from "../game/testSupport/lockFixtures"
import { leverLock } from "../game/testSupport/floorLockFixtures"
import { resolveKeyRequirements, resolveEncounterMeta } from "../mods/allFamilyMeta"
import { buildSite } from "./buildSite"
import { resolvePyramidConstraint } from "./constraintResolver"
import { journey, sidePath } from "./dsl"
import type { Rule } from "./dsl"
import { generateFile } from "./serializer"
import type { FloorConfig, SiteConfig } from "./types"

const JOURNEY = "spec_locked_journey"
const TIER = "expert"

// One constant, placed on two floors: the spec never copies it.
const SLUICE = sluiceLock()
const arms = () => [sidePath({ puzzles: 3 }), sidePath({ puzzles: 1 })]

const specRules: Rule[] = [
  journey(JOURNEY)
    .pyramid(1, { difficulty: TIER, pathPuzzles: 2 })
    .floor(0, { mainEndReward: "mosaicPiece", sideSections: arms(), locks: [{ lock: SLUICE }], realisations: BINDING })
    .floor(1, {
      sideSections: arms(),
      locks: [{ lock: leverLock() }, { lock: SLUICE }],
      realisations: BINDING,
    }),
]

const builtFloors = (): FloorConfig[] =>
  buildSite({
    journeyId: JOURNEY,
    tier: TIER,
    pyramidIndex: 0,
    levelCount: 2,
    pathPuzzles: 2,
    constraint: resolvePyramidConstraint(specRules, JOURNEY, TIER, 0, 2),
    difficulty: TIER,
    hasMapPieceBranch: false,
    hasWardGate: false,
    nextTier: null,
    resolveReward: () => ({ type: "mosaicPiece" }),
    resolveMainEndReward: () => ({ type: "mosaicPiece" }),
  }).floors

const carve = (config: FloorConfig, seed: number): FloorGrid | null => {
  const result = assembleFloor(JOURNEY, config as GameFloorConfig, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: JOURNEY, floorIndex: 0 },
  })
  return result.success ? result.grid : null
}

const SEEDS = Array.from({ length: 12 }, (_, n) => n + 1)

const carvedGrids = (config: FloorConfig): FloorGrid[] =>
  SEEDS.flatMap(seed => {
    const grid = carve(config, seed)
    return grid ? [grid] : []
  })

// What a carve looks like without the Sets: each cell's kind, region and exits, in reading order.
const signature = (grid: FloorGrid): string =>
  grid.cells
    .flat()
    .map(cell =>
      cell.type === "empty"
        ? "."
        : `${cell.type}:${cell.region ?? ""}:${[...cell.dirs].sort().join("")}:${cell.ordinal ?? ""}`
    )
    .join("|")

// The bake fills every reward slot before it serializes, which this spec does not run; a plain reward stands in.
const placed = (floors: FloorConfig[]): FloorConfig[] =>
  JSON.parse(JSON.stringify(floors).replaceAll('"fragmentSlot"', '"mosaicPiece"'))

// The bake's output read back the way the app loads it: the literal generatedWorldConfigs holds.
const loaded = (floors: FloorConfig[]): FloorConfig[] => {
  const text = generateFile({ [JOURNEY]: [floors] })
  const literal = text.split("generatedWorldConfigs: Record<string, SiteConfig[]> = ")[1].split("\n}\n")[0] + "\n}"
  const world = new Function(`return ${literal}`)() as Record<string, SiteConfig[]>
  return world[JOURNEY][0]
}

describe("one lock authored on several floors of a world spec", () => {
  it("reaches every built floor as the same object, never a copy", () => {
    const [first, second] = builtFloors()

    expect(first.locks![0].lock).toBe(SLUICE)
    expect(second.locks![1].lock).toBe(SLUICE)
  })

  it("carves each floor and walks every carve sound", { timeout: 60_000 }, () => {
    for (const floor of builtFloors()) {
      const grids = carvedGrids(floor)

      expect(grids.length).toBeGreaterThan(0)
      expect(grids.every(grid => walkLock(floorLock(grid)!).sound)).toBe(true)
    }
  })

  it("keeps locks and binding off a floor that authors none", () => {
    const plain = buildSite({
      journeyId: JOURNEY,
      tier: TIER,
      pyramidIndex: 1,
      levelCount: 2,
      pathPuzzles: 2,
      constraint: resolvePyramidConstraint(specRules, JOURNEY, TIER, 1, 2),
      difficulty: TIER,
      hasMapPieceBranch: false,
      hasWardGate: false,
      nextTier: null,
      resolveReward: () => undefined,
      resolveMainEndReward: () => ({ type: "mosaicPiece" }),
    }).floors[0]

    expect("locks" in plain).toBe(false)
    expect("realisations" in plain).toBe(false)
  })
})

describe("a floor with locks survives the bake", () => {
  it("reads back from the baked file with its locks and binding intact", () => {
    const floors = placed(builtFloors())

    expect(floors[1].locks).toHaveLength(2)
    expect(loaded(floors).map(({ locks, realisations }) => ({ locks, realisations }))).toEqual(
      floors.map(({ locks, realisations }) => ({ locks, realisations }))
    )
  })

  it("carves the same cells after the round trip as before it", { timeout: 60_000 }, () => {
    const floors = placed(builtFloors())
    const baked = loaded(floors)

    for (const [i, floor] of floors.entries()) {
      for (const seed of SEEDS) {
        const before = carve(floor, seed)
        const after = carve(baked[i], seed)

        expect(after && signature(after)).toEqual(before && signature(before))
      }
    }
  })
})
