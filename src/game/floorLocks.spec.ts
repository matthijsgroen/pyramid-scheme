import { describe, expect, it } from "vitest"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { expandFloorLocks, FLOOR_ENTRANCE, FLOOR_EXIT } from "./floorLocks"
import type { PlacedLock } from "./floorLocks"
import { floorLock } from "./floorLock"
import { walkLock } from "./lockWalk"
import { assembleFloor } from "./siteAssembler"
import type { CorridorCell, FloorConfig, FloorGrid, RoomCell } from "./siteTypes"
import { leverLock } from "./testSupport/floorLockFixtures"
import { BINDING, sluiceLock } from "./testSupport/lockFixtures"

const carve = (config: FloorConfig, seed: number) =>
  assembleFloor("floor-locks", config, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: "floor-locks", floorIndex: 0 },
  })

const section = (pathPuzzles: number) => ({ pathPuzzles, difficulty: "expert" as const, end: "treasure" as const })

// The sluice's two off-route arms (the hall and annex, the vault) each need a side path to be seated on.
const SLUICE_ARMS = [section(3), section(1)]

const floorOf = (locks: PlacedLock[], more: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  realisations: BINDING,
  locks,
  ...more,
})

const SEEDS = 12

const carved = (config: FloorConfig): FloorGrid[] =>
  Array.from({ length: SEEDS }, (_, n) => carve(config, n + 1)).flatMap(result => (result.success ? [result.grid] : []))

type Node = RoomCell | CorridorCell
const mainNodes = (grid: FloorGrid): Node[] =>
  grid.cells
    .flat()
    .filter(
      (cell): cell is Node => (cell.type === "room" || cell.type === "corridor") && /^\d+$/.test(cell.ordinal ?? "")
    )
    .filter(cell => cell.sectionAddress === "main")
    .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))

// The lock instance a region belongs to: the namespace before its first dot, or the floor's own ground.
const ownerOf = (region: string | undefined): string | undefined => region?.split(".")[0]

// The owners the main path passes through, in order, each counted once per unbroken stretch.
const routeOwners = (grid: FloorGrid): (string | undefined)[] =>
  mainNodes(grid)
    .map(node => ownerOf(node.region))
    .filter((owner, i, all) => i === 0 || owner !== all[i - 1])

const expanded = (config: FloorConfig): FloorConfig => {
  const result = expandFloorLocks(config)
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.reasons)}`)
  return result.config
}

describe("two placements of one lock on a floor are two instances with names of their own", () => {
  const twin = floorOf([
    { lock: leverLock(), as: "north" },
    { lock: leverLock(), as: "south" },
  ])

  it("gives each instance disjoint region, barrier and mechanic ids", () => {
    const { regionLayout, obstacles, controls } = expanded(twin)
    const idsOf = (instance: string) => ({
      regions: regionLayout!.regions.map(r => r.name).filter(name => ownerOf(name) === instance),
      barriers: (obstacles ?? []).map(o => o.id).filter(id => ownerOf(id) === instance),
      mechanics: (controls ?? []).map(c => c.id).filter(id => ownerOf(id) === instance),
    })

    expect(idsOf("north")).toEqual({
      regions: ["north.foyer", "north.hall", "north.landing"],
      barriers: ["north.hallDoor"],
      mechanics: ["north.lever"],
    })
    expect(idsOf("south")).toEqual({
      regions: ["south.foyer", "south.hall", "south.landing"],
      barriers: ["south.hallDoor"],
      mechanics: ["south.lever"],
    })
    const all = [...regionLayout!.regions.map(r => r.name), ...obstacles!.map(o => o.id), ...controls!.map(c => c.id)]
    expect(new Set(all).size).toBe(all.length)
  })

  it("carves both instances on the floor and walks every carve sound", { timeout: 60_000 }, () => {
    const grids = carved(twin)

    expect(grids.length).toBe(SEEDS)
    for (const grid of grids) {
      expect(routeOwners(grid)).toEqual([FLOOR_ENTRANCE, "north", "south", FLOOR_EXIT])
      expect(walkLock(floorLock(grid)!).sound).toBe(true)
    }
  })

  it("refuses a second placement that does not say `as`, naming the instance", () => {
    const result = carve(floorOf([{ lock: leverLock() }, { lock: leverLock() }]), 1)

    expect(result).toEqual({ success: false, reasons: [{ type: "lockInstanceRepeated", instance: "lever" }] })
  })

  it("refuses two placements that say the same `as`", () => {
    const result = carve(
      floorOf([
        { lock: leverLock(), as: "gate" },
        { lock: sluiceLock(), as: "gate" },
      ]),
      1
    )

    expect(result).toEqual({ success: false, reasons: [{ type: "lockInstanceRepeated", instance: "gate" }] })
  })
})

describe("several locks on one floor stand in sequence along its main route", () => {
  const sluiceThenLever = floorOf([{ lock: sluiceLock() }, { lock: leverLock() }], { sideSections: SLUICE_ARMS })
  const leverThenSluice = floorOf([{ lock: leverLock() }, { lock: sluiceLock() }], { sideSections: SLUICE_ARMS })

  it.each([
    ["sluice before lever", sluiceThenLever, [FLOOR_ENTRANCE, "sluice", "lever", FLOOR_EXIT]],
    ["lever before sluice", leverThenSluice, [FLOOR_ENTRANCE, "lever", "sluice", FLOOR_EXIT]],
  ])("walks the first lock's in to out before the second's: %s", { timeout: 60_000 }, (_, config, order) => {
    const grids = carved(config)

    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expect(routeOwners(grid)).toEqual(order)
      expect(walkLock(floorLock(grid)!).sound).toBe(true)
    }
  })

  it("enters each lock at its `in` and leaves it at its `out`", { timeout: 60_000 }, () => {
    for (const grid of carved(sluiceThenLever)) {
      const regions = mainNodes(grid)
        .map(node => node.region)
        .filter((region, i, all) => i === 0 || region !== all[i - 1])

      expect(regions).toEqual([
        FLOOR_ENTRANCE,
        "sluice.pumpRoom",
        "sluice.gallery",
        "lever.foyer",
        "lever.hall",
        "lever.landing",
        FLOOR_EXIT,
      ])
    }
  })

  it("refuses a lock that cannot be compiled, naming its instance and leaving the others unnamed", () => {
    const result = carve(floorOf([{ lock: sluiceLock() }, { lock: leverLock() }], { realisations: {} }), 1)

    expect(result).toEqual({
      success: false,
      reasons: [
        {
          type: "lockRefused",
          instance: "sluice",
          fault: { type: "unboundRole", kind: "toggle", mechanics: ["sluice"] },
        },
        {
          type: "lockRefused",
          instance: "lever",
          fault: { type: "unboundRole", kind: "toggle", mechanics: ["lever"] },
        },
      ],
    })
  })
})

describe("the floor's exit lies outside every lock", () => {
  const floors: [string, FloorConfig][] = [
    ["one lock", floorOf([{ lock: leverLock() }])],
    [
      "a clone",
      floorOf([
        { lock: leverLock(), as: "a" },
        { lock: leverLock(), as: "b" },
      ]),
    ],
    ["a sequence", floorOf([{ lock: sluiceLock() }, { lock: leverLock() }], { sideSections: SLUICE_ARMS })],
  ]

  it("seats the exit cell in the floor's own exit region on every carve of every floor", { timeout: 120_000 }, () => {
    const exitRegions = floors.flatMap(([, config]) => carved(config).map(grid => mainNodes(grid).at(-1)?.region))

    expect(exitRegions.length).toBeGreaterThan(floors.length)
    expect(new Set(exitRegions)).toEqual(new Set([FLOOR_EXIT]))
  })

  it("names no lock region `exit`, so no instance can own it", () => {
    for (const [, config] of floors) {
      const { regionLayout } = expanded(config)
      const owned = regionLayout!.regions.filter(region => ownerOf(region.name) !== region.name)

      expect(owned.length).toBeGreaterThan(0)
      expect(owned.map(region => region.name)).not.toContain(FLOOR_EXIT)
      expect(regionLayout!.out).toBe(FLOOR_EXIT)
    }
  })
})

describe("a floor's locks and the fields they compile into are never both authored", () => {
  it("refuses every compiled field written beside `locks`, the whole list at once", () => {
    const result = carve(
      floorOf([{ lock: leverLock() }], {
        regionLayout: { regions: [{ name: "a", appetite: "free" }], connections: [], in: "a", out: "a" },
        obstacles: [],
        controls: [],
        barrierOrder: [],
        oneWayRealisation: "zipline",
        forks: [{ in: "a" }],
      }),
      1
    )

    expect(result).toEqual({
      success: false,
      reasons: [
        {
          type: "locksContradictFloor",
          fields: ["regionLayout", "obstacles", "controls", "barrierOrder", "oneWayRealisation", "forks"],
        },
      ],
    })
  })

  it("refuses a single field by its own name", () => {
    const result = carve(floorOf([{ lock: leverLock() }], { obstacles: [] }), 1)

    expect(result).toEqual({ success: false, reasons: [{ type: "locksContradictFloor", fields: ["obstacles"] }] })
  })

  it("keeps the floor's own junction counts, which no lock compiles into", () => {
    const { forks } = expanded(floorOf([{ lock: leverLock() }], { forks: [{ exits: 2, count: 1 }] }))

    expect(forks).toEqual([{ exits: 2, count: 1 }])
  })
})

describe("a floor without locks", () => {
  it("passes through expansion as the very same config", () => {
    const plain = floorOf([], { locks: undefined })

    expect(expandFloorLocks(plain)).toEqual({ ok: true, config: plain })
    expect((expandFloorLocks(plain) as { config: FloorConfig }).config).toBe(plain)
  })
})
