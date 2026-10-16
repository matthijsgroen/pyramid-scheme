import { describe, expect, it } from "vitest"
import { assembleFloor } from "../game/siteAssembler"
import type { FloorConfig as GameFloorConfig, FloorGrid, RoomCell } from "../game/siteTypes"
import { mechanismGatesOf } from "../game/mechanismDoors"
import { collectReachableKeys, reachableFrom } from "../game/siteValidator"
import { BINDING, mirrorForkLock } from "../game/testSupport/lockFixtures"
import { torchAndFloorKeyDoorFloor } from "../game/testSupport/mixedDoorFixtures"
import { resolveEncounterMeta, resolveKeyRequirements } from "../mods/allFamilyMeta"
import { computeReachability, floorKey, reachableFloorsInSite, type ReachabilitySupport } from "./reachability"
import type { SiteConfig, TreasureReward } from "./types"

const piece = (tombId: string) => ({ type: "mapPiece" as const, tombId })
const tombIds = (rewards: readonly TreasureReward[]) => rewards.map(r => r.tombId as string).sort()

const support: ReachabilitySupport = {
  bucketForReward: r => (r.type === "tombKey" ? (r.keyId as string) : undefined),
}

const WING_KEY = "wing-key"
const ARM_KEY = "arm-key"

// Floor 0 is plain and its stair is key gated; floor 1 stands mirrorFork, with one open arm and one arm behind a key gate.
const site = (): SiteConfig => [
  {
    pathPuzzles: 0,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    mainEndReward: piece("front"),
    sideSections: [
      {
        pathPuzzles: 0,
        difficulty: "expert",
        end: { stairId: "site:wing" },
        gate: { type: "tomb-key", wardKeyId: WING_KEY },
      },
    ],
  },
  {
    pathPuzzles: 0,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    entrance: { stairId: "site:wing" },
    mainEndReward: piece("beyond-lock"),
    sideSections: [
      { pathPuzzles: 0, difficulty: "expert", end: "treasure", endReward: piece("open-arm") },
      {
        pathPuzzles: 0,
        difficulty: "expert",
        end: "treasure",
        endReward: piece("kept-arm"),
        gate: { type: "tomb-key", wardKeyId: ARM_KEY },
      },
    ],
    locks: [{ lock: mirrorForkLock() }],
    realisations: BINDING,
  } as SiteConfig[number],
]

const reach = (owned: string[], authoredKeysHeld = false) =>
  reachableFloorsInSite(
    { journeyId: "lock_world", levelIndex: 0 },
    site(),
    new Set(owned),
    undefined,
    resolveKeyRequirements,
    undefined,
    support,
    resolveEncounterMeta,
    authoredKeysHeld
  )

describe("a floor's lock is opened by the floor's own mechanisms, not by a currency", () => {
  it("reaches the whole lock floor once the floor is reached, with only its key gate still asking for a key", () => {
    const result = reach([WING_KEY])

    expect([...result.floors]).toEqual([0, 1])
    expect(tombIds(result.reachableRewards)).toEqual(["beyond-lock", "front", "open-arm"])
    expect([...result.discoveredLocks]).toEqual([ARM_KEY])
  })

  it("reaches the key-gated arm once its key is held, and then nothing is blocking", () => {
    const result = reach([WING_KEY, ARM_KEY])

    expect(tombIds(result.reachableRewards)).toEqual(["beyond-lock", "front", "kept-arm", "open-arm"])
    expect([...result.discoveredLocks]).toEqual([])
  })

  it("counts nothing of the lock floor before the floor itself is reachable", () => {
    const result = reach([])

    expect([...result.floors]).toEqual([0])
    expect(tombIds(result.reachableRewards)).toEqual(["front"])
    expect([...result.discoveredLocks]).toEqual([WING_KEY])
  })

  it("answers the same through the whole-world pass", () => {
    const world = { lock_world: [site()] }
    const meta = { lock_world: { tier: "expert" as const } }
    const result = computeReachability(
      world,
      meta,
      new Map([[WING_KEY, 1]]),
      resolveKeyRequirements,
      undefined,
      support,
      resolveEncounterMeta
    )

    expect([...result.reachableFloors]).toEqual([
      floorKey({ journeyId: "lock_world", levelIndex: 0, floorIndex: 0 }),
      floorKey({ journeyId: "lock_world", levelIndex: 0, floorIndex: 1 }),
    ])
    expect([...result.discoveredLocks]).toEqual([ARM_KEY])
  })
})

describe("a door a mechanism and a floor key both own", () => {
  const carve = (mode?: "any"): FloorGrid => {
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleFloor(
        "mixed-door",
        torchAndFloorKeyDoorFloor(mode) as GameFloorConfig,
        seed,
        resolveEncounterMeta,
        {
          resolveKeyRequirements,
          floorRef: { journeyId: "mixed-door", levelIndex: 0, floorIndex: 0 },
        }
      )
      if (result.success) return result.grid
    }
    throw new Error("no seed carved the floor")
  }
  const vaultReached = (grid: FloorGrid, reached: ReadonlySet<string>) =>
    grid.cells.some((row, r) =>
      row.some((cell, c) => cell.type === "room" && cell.region === "vault" && reached.has(`${r},${c}`))
    )
  const floorKeyOf = (grid: FloorGrid) =>
    (grid.cells.flat().find(cell => cell.type === "room" && cell.requiredKeyIds?.length) as RoomCell).requiredKeyIds![0]

  it("takes the mechanism's say as given, yet still asks for the floor key", () => {
    const grid = carve()
    const blocked = new Set<string>()
    const reached = reachableFrom(grid, grid.entrancePos, new Set(), undefined, blocked, false, mechanismGatesOf(grid))

    expect(vaultReached(grid, reached)).toBe(false)
    expect([...blocked]).toEqual([floorKeyOf(grid)])
  })

  it("opens the vault once the floor key is held", () => {
    const grid = carve()
    const reached = reachableFrom(
      grid,
      grid.entrancePos,
      new Set([floorKeyOf(grid)]),
      undefined,
      undefined,
      false,
      mechanismGatesOf(grid)
    )

    expect(vaultReached(grid, reached)).toBe(true)
  })

  it("needs no floor key when the door is any-owned, the mechanism alone being enough", () => {
    const grid = carve("any")
    const reached = reachableFrom(
      grid,
      grid.entrancePos,
      new Set(),
      undefined,
      undefined,
      false,
      mechanismGatesOf(grid)
    )

    expect(vaultReached(grid, reached)).toBe(true)
  })

  it("finds the floor's own key chest, so the fixed point opens the vault", () => {
    const grid = carve()
    const { reachable, blockedRequirements } = collectReachableKeys(
      grid,
      grid.entrancePos,
      new Set(),
      false,
      mechanismGatesOf(grid)
    )

    expect(vaultReached(grid, reachable)).toBe(true)
    expect([...blockedRequirements]).toEqual([])
  })

  it("reports the mechanism's own gate as blocking when no mechanism is told of", () => {
    const grid = carve()
    const { blockedRequirements } = collectReachableKeys(grid, grid.entrancePos, new Set())

    expect([...blockedRequirements].some(id => id.startsWith("obstacle:"))).toBe(true)
  })
})
