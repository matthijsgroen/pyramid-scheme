import { describe, expect, it } from "vitest"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { expandFloorLocks, stoneNestings } from "./floorLocks"
import type { PlacedLock } from "./floorLocks"
import type { Lock } from "./lockAuthoring"
import { parseLock } from "./lockNotation"
import { isWeights } from "./obstacles"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, FloorGrid } from "./siteTypes"
import { leverLock } from "./testSupport/floorLockFixtures"
import { BINDING } from "./testSupport/lockFixtures"

// MADE-UP LOCKS NESTED IN EACH OTHER, never catalogue ones: a test pins the rule, `yarn run lock` checks the catalogue.
// Every region takes `free`, so the floor holds the locks and nothing else.

/** Stones around a nest spot from `yard` to `hall`: a stone on the shelf by the way in, a door on that waits for a
 * stone on `p`. */
export const HOST_STONES =
  "in -- yard\nyard -&> hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nyard ?\nhall ?\nout ?"
/** A stone lock to nest: its stone on a shelf by its way in, its door on waiting for it on `p`. */
export const CELL = "in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?"
/** A stone lock that opens only for a stone carried in: `s` by its way in opens the way on, its own stone lies
 * beyond. Alone it cannot be solved; nested in a stone lock, the pool solves it. */
export const GATED = "in -[s]- hall\nhall -- out\ns plate @in\nt plate @hall stone\nin ?\nhall ?\nout ?"
/** HOST_STONES with a torch by the way in that shuts the way on for good: a player who lights it first strands. */
export const STRANDING_HOST =
  "in -[T:off]- yard\nyard -&> hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nT activator @in\nin ?\nyard ?\nhall ?\nout ?"
/** A lock without stones whose route runs straight through, with a drop from a side ledge back to its way in: a
 * one-way off its route. */
export const LEDGE = "in -- out\nin -- ledge\nledge -- top\ntop >> in\nin ?\nout ?\nledge ?\ntop ?"

/** A lock without stones whose one door opens only for empty hands. The notation refuses to write it, so it is
 * written out. */
const CRACK: Lock = {
  name: "crack",
  regions: { in: { takes: "free" }, out: { takes: "free" } },
  connections: [{ between: ["in", "out"], barriers: ["in-out"] }],
  gates: { "in-out": { from: "in", to: "out", owners: ["unladen"] } },
  mechanics: {},
  in: "in",
  out: "out",
}

export const NESTED_BINDING = { ...BINDING, weights: "stonePlate" }

export const stones = (text: string, name: string) => parseLock(text, name).lock

/** The outer lock holds stones, the inner none: the stone is carried through it. */
const PASS_THROUGH: PlacedLock[] = [
  { lock: stones(HOST_STONES, "host") },
  { lock: leverLock(), as: "inner", inside: { instance: "host" } },
]
/** The inner lock holds stones, the outer none: none is carried on through its way out. */
const CONTAINED: PlacedLock[] = [
  { lock: leverLock() },
  { lock: stones(CELL, "cell"), as: "inner", inside: { instance: "lever" } },
]
/** Both hold stones: one pool. */
const SHARED: PlacedLock[] = [
  { lock: stones(HOST_STONES, "host") },
  { lock: stones(GATED, "gated"), as: "inner", inside: { instance: "host" } },
]

const floorOf = (locks: PlacedLock[]): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  realisations: NESTED_BINDING,
  locks,
})

export const carve = (locks: PlacedLock[], seed: number) =>
  assembleFloor("nested-stones", floorOf(locks), seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: "nested-stones", floorIndex: 0 },
  })

const SEEDS = 12
export const carved = (locks: PlacedLock[]): FloorGrid[] =>
  Array.from({ length: SEEDS }, (_, n) => carve(locks, n + 1)).flatMap(result => (result.success ? [result.grid] : []))

export const expanded = (locks: PlacedLock[]) => {
  const result = expandFloorLocks(floorOf(locks))
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.reasons)}`)
  return result
}

describe("a nested lock's stones are read against the locks it stands in", () => {
  it("passes a stone through a lock without stones that stands in a lock with them", () => {
    expect(stoneNestings(PASS_THROUGH)).toEqual(new Map([["inner", { case: "passThrough", pool: "host" }]]))
  })

  it("contains the stones of a lock no lock around it shares", () => {
    expect(stoneNestings(CONTAINED)).toEqual(new Map([["inner", { case: "contained" }]]))
  })

  it("pools the stones of a lock standing in a lock with stones", () => {
    expect(stoneNestings(SHARED)).toEqual(new Map([["inner", { case: "shared", pool: "host" }]]))
  })

  it("reads past a lock without stones to the nearest that has them, and pools with the outermost", () => {
    const chain: PlacedLock[] = [
      { lock: stones(HOST_STONES, "host") },
      { lock: leverLock(), as: "middle", inside: { instance: "host" } },
      { lock: stones(CELL, "cell"), as: "deep", inside: { instance: "middle" } },
    ]
    expect(stoneNestings(chain)).toEqual(
      new Map([
        ["middle", { case: "passThrough", pool: "host" }],
        ["deep", { case: "shared", pool: "host" }],
      ])
    )
  })

  it("leaves a nesting without stones unmarked, so the floor's nesting reads as it did", () => {
    const plain: PlacedLock[] = [
      { lock: leverLock() },
      { lock: leverLock(), as: "inner", inside: { instance: "lever" } },
    ]
    expect(stoneNestings(plain)).toEqual(new Map())
    expect(expanded(plain).nesting?.[0]).not.toHaveProperty("stones")
  })

  it("writes the case on the floor's nesting", () => {
    expect(expanded(SHARED).nesting?.[0].stones).toEqual({ case: "shared", pool: "host" })
  })
})

// A PASS-THROUGH LOCK NEVER TURNS A STONE AWAY: nothing that takes only empty hands stands in it.
describe("a pass-through lock never turns a stone away", () => {
  it("refuses a lock without stones that asks for empty hands, naming the lock", () => {
    const result = carve(
      [{ lock: stones(HOST_STONES, "host") }, { lock: CRACK, as: "inner", inside: { instance: "host" } }],
      1
    )
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.reasons).toContainEqual({
        type: "lockRefused",
        instance: "inner",
        fault: { type: "carryWithoutStones", barrier: "in-out" },
      })
  })

  it("refuses a one-way on its own route, since every one-way takes empty hands, naming it and the pool", () => {
    const result = carve(
      [
        { lock: stones(HOST_STONES, "host") },
        { lock: stones("in >> out\nin ?\nout ?", "chute"), as: "inner", inside: { instance: "host" } },
      ],
      1
    )
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.reasons).toContainEqual({
        type: "lockNestingRefused",
        instance: "inner",
        fault: { type: "oneWayOnPassThroughRoute", pool: "host", oneWays: ["in>out"] },
      })
  })

  it("allows a one-way off its route: the stone passes by the corridor, the drop is a side way back", () => {
    const placed: PlacedLock[] = [
      { lock: stones(HOST_STONES, "host") },
      { lock: stones(LEDGE, "ledge"), as: "inner", inside: { instance: "host" } },
    ]
    expect(() => expanded(placed)).not.toThrow()
    expect(stoneNestings(placed).get("inner")).toEqual({ case: "passThrough", pool: "host", oneWays: true })
  })

  it("leaves a one-way in a contained lock to the walk, which takes it with empty hands", () => {
    const dropping = "in -- hall\nhall >> out\nshelf plate @in stone\nin ?\nhall ?\nout ?"
    expect(() =>
      expanded([{ lock: leverLock() }, { lock: stones(dropping, "drop"), as: "inner", inside: { instance: "lever" } }])
    ).not.toThrow()
  })
})

describe("a shared nesting's stones are one pool", () => {
  it("compiles one weights control for both locks, under the pool's id", () => {
    const weights = (expanded(SHARED).config.controls ?? []).filter(isWeights)
    expect(weights.map(control => control.id)).toEqual(["host.stones"])
    expect(weights[0].plates.map(plate => plate.id)).toEqual(["host.p", "host.shelf", "inner.s", "inner.t"])
  })

  it("leaves a pass-through's and a contained lock's stones in their own control", () => {
    expect((expanded(PASS_THROUGH).config.controls ?? []).filter(isWeights).map(c => c.id)).toEqual(["host.stones"])
    expect((expanded(CONTAINED).config.controls ?? []).filter(isWeights).map(c => c.id)).toEqual(["inner.stones"])
  })
})
