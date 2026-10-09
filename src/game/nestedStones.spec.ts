import { describe, expect, it } from "vitest"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { floorLock } from "./floorLock"
import { deadFloorRegions, describeFloorWalkFailure, walkFloorLock } from "./floorLockWalk"
import { expandFloorLocks, stoneNestings } from "./floorLocks"
import type { PlacedLock } from "./floorLocks"
import type { Lock } from "./lockAuthoring"
import { deadRegions, reachableStates, walkLock } from "./lockWalk"
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
const HOST_STONES =
  "in -- yard\nyard -&> hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nyard ?\nhall ?\nout ?"
/** A stone lock to nest: its stone on a shelf by its way in, its door on waiting for it on `p`. */
const CELL = "in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?"
/** A stone lock that opens only for a stone carried in: `s` by its way in opens the way on, its own stone lies
 * beyond. Alone it cannot be solved; nested in a stone lock, the pool solves it. */
const GATED = "in -[s]- hall\nhall -- out\ns plate @in\nt plate @hall stone\nin ?\nhall ?\nout ?"
/** HOST_STONES with a torch by the way in that shuts the way on for good: a player who lights it first strands. */
const STRANDING_HOST =
  "in -[T:off]- yard\nyard -&> hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nT activator @in\nin ?\nyard ?\nhall ?\nout ?"
/** A lock without stones whose route runs straight through, with a drop from a side ledge back to its way in: a
 * one-way off its route. */
const LEDGE = "in -- out\nin -- ledge\nledge -- top\ntop >> in\nin ?\nout ?\nledge ?\ntop ?"

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

const NESTED_BINDING = { ...BINDING, weights: "stonePlate", unladen: "narrowPassage" }

const stones = (text: string, name: string) => parseLock(text, name).lock

/** The outer lock holds stones, the inner none: the stone is carried through it. */
const PASS_THROUGH: PlacedLock[] = [
  { lock: stones(HOST_STONES, "host") },
  { lock: leverLock(), as: "inner", inside: { instance: "host" } },
]
/** The inner lock holds stones, the outer none: its stones are its own. */
const CONTAINED: PlacedLock[] = [
  { lock: leverLock() },
  { lock: stones(CELL, "cell"), as: "inner", inside: { instance: "lever" } },
]
/** Both hold stones: one pool. */
const SHARED: PlacedLock[] = [
  { lock: stones(HOST_STONES, "host") },
  { lock: stones(GATED, "gated"), as: "inner", inside: { instance: "host" } },
]
/** A pass-through lock with a one-way off its route: a side way back that the stone never has to take. */
const PASS_BY_LEDGE: PlacedLock[] = [
  { lock: stones(HOST_STONES, "host") },
  { lock: stones(LEDGE, "ledge"), as: "inner", inside: { instance: "host" } },
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

const carve = (locks: PlacedLock[], seed: number) =>
  assembleFloor("nested-stones", floorOf(locks), seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: "nested-stones", floorIndex: 0 },
  })

const SEEDS = 12
const carved = (locks: PlacedLock[]): FloorGrid[] =>
  Array.from({ length: SEEDS }, (_, n) => carve(locks, n + 1)).flatMap(result => (result.success ? [result.grid] : []))

const expanded = (locks: PlacedLock[]) => {
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

  it("leaves a nesting without stones unmarked: its nesting carries no stones field", () => {
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
    expect(() => expanded(PASS_BY_LEDGE)).not.toThrow()
    expect(stoneNestings(PASS_BY_LEDGE).get("inner")).toEqual({ case: "passThrough", pool: "host", oneWays: true })
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

const productStates = (grid: FloorGrid): number => {
  const found = reachableStates(floorLock(grid)!)
  if (found === "tooLarge") throw new Error("product too large")
  return found.order.length
}

const expectSound = (grid: FloorGrid) => {
  const walk = walkFloorLock(grid)!
  if (!walk.sound) throw new Error(describeFloorWalkFailure(walk.failure))
  return walk
}

describe("a nested floor with stones is walked where its stones reach", () => {
  it.each([
    ["a pass-through", PASS_THROUGH],
    ["a pass-through with a one-way off its route", PASS_BY_LEDGE],
    ["a contained lock", CONTAINED],
    ["a shared pool", SHARED],
  ])("walks %s sound on every carve, as the product walk does", { timeout: 60_000 }, (_, locks) => {
    const grids = carved(locks)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expectSound(grid)
      expect(walkLock(floorLock(grid)!).sound).toBe(true)
      expect(deadFloorRegions(grid)).toEqual(deadRegions(floorLock(grid)!))
    }
  })

  it(
    "walks a pass-through holding no one-way in fewer states than the product: the host walks it as ground",
    { timeout: 60_000 },
    () => {
      for (const grid of carved(PASS_THROUGH)) expect(expectSound(grid).states).toBeLessThan(productStates(grid))
    }
  )

  it.each([
    ["a pass-through with a one-way off its route", PASS_BY_LEDGE],
    ["a contained lock, whose stones may leave by its ways in and out", CONTAINED],
    ["a shared pool", SHARED],
  ])("walks %s fused, in the product's states", { timeout: 60_000 }, (_, locks) => {
    for (const grid of carved(locks)) expect(expectSound(grid).states).toBe(productStates(grid))
  })

  it("keeps the floor's way out for empty hands on a nested floor", { timeout: 60_000 }, () => {
    // The door on waits for the shelf to be EMPTY: the only way past carries the stone, and the way out refuses it.
    const carriedOut: PlacedLock[] = [
      { lock: stones("in -[shelf:empty]- yard\nyard -&> out\nshelf plate @in stone\nin ?\nyard ?\nout ?", "host") },
      { lock: leverLock(), as: "inner", inside: { instance: "host" } },
    ]
    const grids = carved(carriedOut)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expect(walkLock(floorLock(grid)!).sound).toBe(false)
      expect(walkFloorLock(grid)).toEqual({ sound: false, failure: { type: "unsolvable" } })
    }
  })

  // EMPTY HANDS ARE ONE RULE FOR THE WAY OUT AND EVERY ONE-WAY: every level that holds stones keeps `emptyHands`.
  // The plate lies below a drop, and the walk back up to it is a narrow passage: a stone reaches it only by riding
  // the drop, so only that opens the door. Sound if a level dropped the rule, stranded while it holds.
  const RIDE =
    "in -- top\ntop -[p]- out\ntop >> low\nlow -[unladen]- mid\nmid -- in\np plate @low\nshelf plate @top stone\nin ?\ntop ?\nlow ?\nmid ?\nout ?"
  it.each<[string, PlacedLock[], string[]]>([
    [
      "a contained lock",
      [{ lock: leverLock() }, { lock: stones(RIDE, "ride"), as: "inner", inside: { instance: "lever" } }],
      ["inner"],
    ],
    [
      "a shared pool",
      [
        { lock: stones(HOST_STONES, "host") },
        { lock: stones(RIDE, "ride"), as: "inner", inside: { instance: "host" } },
      ],
      ["host", "inner"],
    ],
  ])("never lets a stone ride a drop inside %s", { timeout: 60_000 }, (_, locks, instances) => {
    const grids = carved(locks)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expect(walkLock(floorLock(grid)!).sound).toBe(false)
      expect(walkFloorLock(grid)).toEqual({
        sound: false,
        failure: { type: "pooled", instances, failure: { type: "unsolvable" } },
      })
    }
  })

  it("walks a contained lock whose way out lets a stone through, as the product walk does", { timeout: 60_000 }, () => {
    const leaky = "in -- hall\nhall -- out\nshelf plate @in stone\nin ?\nhall ?\nout ?"
    const grids = carved([
      { lock: leverLock() },
      { lock: stones(leaky, "leaky"), as: "inner", inside: { instance: "lever" } },
    ])
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expect(walkFloorLock(grid)!.sound).toBe(walkLock(floorLock(grid)!).sound)
      expect(expectSound(grid).states).toBe(productStates(grid))
    }
  })

  it("lets another lock's stone be carried through a contained lock's way out", { timeout: 60_000 }, () => {
    const sibling: PlacedLock[] = [
      { lock: leverLock() },
      { lock: stones(CELL, "cell"), as: "inner", inside: { instance: "lever" } },
      { lock: stones(HOST_STONES, "host") },
    ]
    const grids = carved(sibling)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) expect(expectSound(grid).states).toBe(productStates(grid))
  })

  // A STONE FROM ANOTHER LOCK REACHES A NESTED LOCK THAT HOLDS NONE: a root lock's way out takes any hands, and a
  // contained lock's stone may leave by either way. Its drop takes empty hands, so the floor walks it in its level.
  /** A lock without stones whose torch on a side ledge shuts the way back to the drop home: lit with a stone in
   * hand, the drop refuses the player. */
  const TRAP = "in -- out\nin -- mid\nmid -[T:off]- ledge\nledge >> in\nT activator @ledge\nin ?\nout ?\nmid ?\nledge ?"
  it.each<[string, PlacedLock[], string[]]>([
    [
      "a sibling root lock",
      [
        { lock: stones("in -[p:empty]- out\np plate @in stone\nq plate @out\nin ?\nout ?", "quarry") },
        { lock: leverLock() },
        { lock: stones(TRAP, "trap"), as: "inner", inside: { instance: "lever" } },
      ],
      ["inner"],
    ],
    [
      "a contained lock under a later root, back by its way in",
      [
        { lock: leverLock() },
        { lock: stones(TRAP, "trap"), as: "inner", inside: { instance: "lever" } },
        { lock: leverLock(), as: "later" },
        { lock: stones(CELL, "cell"), as: "cell", inside: { instance: "later" } },
      ],
      ["cell", "inner"],
    ],
  ])("strands a stone carried from %s into a nested lock's drop", { timeout: 60_000 }, (_, locks, instances) => {
    const grids = carved(locks)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expect(walkLock(floorLock(grid)!).sound).toBe(false)
      expect(walkFloorLock(grid)).toMatchObject({
        sound: false,
        failure: { type: "pooled", instances, failure: { type: "strands" } },
      })
    }
  })

  // A POOL NESTED IN ANOTHER LOCK IS CONTAINED, so it walks in the floor's level, and so does every lock fused into it.
  const NESTED_POOL = (deep: Lock): PlacedLock[] => [
    { lock: leverLock() },
    { lock: stones(HOST_STONES, "cell"), as: "mid", inside: { instance: "lever" } },
    { lock: deep, as: "deep", inside: { instance: "mid" } },
  ]

  it(
    "walks a pass-through fused into a nested pool in the floor's level, where its stranding torch counts",
    { timeout: 60_000 },
    () => {
      // A torch that shuts the way on for good, and a drop off the route from a side ledge.
      const torch = stones(
        "in -[T:off]- out\nout -- ledge\nledge >> in\nT activator @in\nin ?\nout ?\nledge ?",
        "torch"
      )
      const grids = carved(NESTED_POOL(torch))
      expect(grids.length).toBeGreaterThan(0)
      for (const grid of grids) {
        expect(walkLock(floorLock(grid)!).sound).toBe(false)
        expect(walkFloorLock(grid)).toMatchObject({
          sound: false,
          failure: { type: "pooled", instances: ["mid", "deep"], failure: { type: "strands" } },
        })
      }
    }
  )

  it(
    "walks a lock sharing a nested pool in the floor's level, with the pool's stones as one",
    { timeout: 60_000 },
    () => {
      const grids = carved(NESTED_POOL(stones(GATED, "gated")))
      expect(grids.length).toBeGreaterThan(0)
      for (const grid of grids) expect(expectSound(grid).states).toBe(productStates(grid))
    }
  )

  it("names both locks of a pool when the pooled floor strands", { timeout: 60_000 }, () => {
    const stranding: PlacedLock[] = [
      { lock: stones(STRANDING_HOST, "host") },
      { lock: stones(GATED, "gated"), as: "inner", inside: { instance: "host" } },
    ]
    const grids = carved(stranding)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      const walk = walkFloorLock(grid)!
      expect(walk).toMatchObject({ sound: false, failure: { type: "pooled", instances: ["host", "inner"] } })
      if (!walk.sound) expect(describeFloorWalkFailure(walk.failure)).toMatch(/^the stones host, inner share: /)
    }
  })

  it("refuses a pooled level too large to walk by name, not by hanging", { timeout: 60_000 }, () => {
    const [grid] = carved(SHARED)
    expect(walkFloorLock(grid, { maxStates: 10 })).toEqual({
      sound: false,
      failure: { type: "pooled", instances: ["host", "inner"], failure: { type: "tooLarge" } },
    })
  })
})
