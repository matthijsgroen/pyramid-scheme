import { describe, expect, it } from "vitest"
import { sluiceLock } from "../game/testSupport/lockFixtures"
import { leverLock } from "../game/testSupport/floorLockFixtures"
import { buildSite } from "./buildSite"
import { resolvePyramidConstraint } from "./constraintResolver"
import { journey, sidePath } from "./dsl"
import type { PyramidConstraint, Rule } from "./dsl"
import type { FloorConfig } from "./types"

const JOURNEY = "spec_floor_locks"
const TIER = "expert"
const SLUICE = sluiceLock()

// What expert_1's last pyramid has: side sections, visible and hidden paths, a map-piece branch, a ward gate and a ward wing up a stair.
const AUTO: PyramidConstraint = {
  difficulty: TIER,
  pathPuzzles: 2,
  realisations: { toggle: "handle", activator: "torch" },
  sideSections: [sidePath({ puzzles: 3 }), sidePath({ puzzles: 1 })],
  sidePaths: [{ density: "dense", pathPuzzles: 2, end: "junk" }],
  hiddenPaths: [{ density: "dense", pathPuzzles: 1, end: "junk" }],
  wardWings: 1,
}

const rulesFor = (c: PyramidConstraint): Rule[] => [journey(JOURNEY).pyramid(1, c)]

const build = (c: PyramidConstraint, extra: { hasMapPieceBranch?: boolean; hasWardGate?: boolean } = {}) =>
  buildSite({
    journeyId: JOURNEY,
    tier: TIER,
    pyramidIndex: 0,
    levelCount: 2,
    pathPuzzles: 2,
    constraint: resolvePyramidConstraint(rulesFor(c), JOURNEY, TIER, 0, 2),
    difficulty: TIER,
    hasMapPieceBranch: extra.hasMapPieceBranch ?? true,
    hasWardGate: extra.hasWardGate ?? true,
    nextTier: null,
    resolveReward: () => undefined,
    resolveMainEndReward: () => ({ type: "mosaicPiece" }),
  }).floors

const without = (floor: FloorConfig): Omit<FloorConfig, "locks" | "realisations"> => {
  const { locks: _locks, realisations: _realisations, ...rest } = floor
  return rest
}

describe("floorLocks on an auto-built pyramid", () => {
  const plain = build(AUTO)

  it("builds a main floor and a ward wing to lay the locks on", () => {
    expect(plain).toHaveLength(2)
    expect(plain[0].sideSections.some(s => typeof s.end === "object")).toBe(true)
  })

  it.each([0, 1])("gives floor %i its locks and resolved binding", fi => {
    const floors = build({
      ...AUTO,
      floorLocks: { [fi]: { locks: [{ lock: SLUICE }], realisations: { activator: "lever", sequence: "plates" } } },
    })

    expect(floors[fi].locks).toEqual([{ lock: SLUICE }])
    expect(floors[fi].locks![0].lock).toBe(SLUICE)
    expect(floors[fi].realisations).toEqual({ toggle: "handle", activator: "lever", sequence: "plates" })
  })

  it.each([0, 1])("leaves every other field of every floor as built when floor %i is locked", fi => {
    const floors = build({ ...AUTO, floorLocks: { [fi]: { locks: [{ lock: leverLock() }] } } })

    expect(floors.map(without)).toEqual(plain.map(without))
  })

  it("packs only the locked floor at the packing its overlay names", () => {
    const floors = build({ ...AUTO, floorLocks: { 0: { locks: [{ lock: SLUICE }], packing: 0.15 } } })

    expect(floors.map(floor => floor.packing)).toEqual([0.15, plain[1].packing])
  })

  it("carries the one-way in the binding alone, as an explicit floor does", () => {
    const c = { ...AUTO, oneWayRealisation: "zipline" }
    const floors = build({ ...c, floorLocks: { 0: { locks: [{ lock: SLUICE }] } } })

    expect(floors[0].realisations).toEqual({ toggle: "handle", activator: "torch", "one-way": "zipline" })
    expect("oneWayRealisation" in floors[0]).toBe(false)
    expect(floors[1].oneWayRealisation).toBe("zipline")
  })

  it("keeps locks and binding off the floors it does not name", () => {
    const floors = build({ ...AUTO, floorLocks: { 1: { locks: [{ lock: SLUICE }] } } })

    expect("locks" in floors[0]).toBe(false)
    expect("realisations" in floors[0]).toBe(false)
  })

  it("bakes no binding when none is declared at any level", () => {
    const { realisations: _none, ...bare } = AUTO
    const floors = build({ ...bare, floorLocks: { 0: { locks: [{ lock: SLUICE }] } } })

    expect("realisations" in floors[0]).toBe(false)
  })

  it("locks the one floor of a single-floor pyramid", () => {
    const single: PyramidConstraint = {
      difficulty: TIER,
      pathPuzzles: 2,
      floorLocks: { 0: { locks: [{ lock: SLUICE }] } },
    }

    expect(build(single)[0].locks).toEqual([{ lock: SLUICE }])
  })

  it("refuses a floor the pyramid does not build, by name", () => {
    expect(() => build({ ...AUTO, floorLocks: { 2: { locks: [{ lock: SLUICE }] } } })).toThrow(
      "buildSite: journey=spec_floor_locks pyramid=1 floorLocks names floor 2, but the pyramid builds 2 floors"
    )
  })

  it("refuses a floor index that is no floor number", () => {
    expect(() => build({ ...AUTO, floorLocks: { [-1]: { locks: [{ lock: SLUICE }] } } })).toThrow(
      "buildSite: journey=spec_floor_locks pyramid=1 floorLocks names floor -1, but the pyramid builds 2 floors"
    )
  })

  it("refuses floorLocks beside explicit floors, by name", () => {
    const rules = [
      journey(JOURNEY)
        .pyramid(1, { ...AUTO, floorLocks: { 0: { locks: [{ lock: SLUICE }] } } })
        .floor(0, {}),
    ]

    expect(() =>
      buildSite({
        journeyId: JOURNEY,
        tier: TIER,
        pyramidIndex: 0,
        levelCount: 2,
        pathPuzzles: 2,
        constraint: resolvePyramidConstraint(rules, JOURNEY, TIER, 0, 2),
        difficulty: TIER,
        hasMapPieceBranch: false,
        hasWardGate: false,
        nextTier: null,
        resolveReward: () => undefined,
        resolveMainEndReward: () => ({ type: "mosaicPiece" }),
      })
    ).toThrow(
      "buildSite: journey=spec_floor_locks pyramid=1 authors both floors and floorLocks; put the locks on the floors"
    )
  })
})
