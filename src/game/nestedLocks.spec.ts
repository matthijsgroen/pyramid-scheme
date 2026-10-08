import { describe, expect, it } from "vitest"
import { parseLock } from "./lockNotation"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { expandFloorLocks, FLOOR_ENTRANCE, FLOOR_EXIT } from "./floorLocks"
import type { PlacedLock } from "./floorLocks"
import { floorLock } from "./floorLock"
import { deadFloorRegions, describeFloorWalkFailure, walkFloorLock } from "./floorLockWalk"
import type { Lock } from "./lockAuthoring"
import { deadRegions, reachableStates, walkLock } from "./lockWalk"
import { assembleFloor } from "./siteAssembler"
import type { CorridorCell, FloorConfig, FloorGrid, RoomCell } from "./siteTypes"
import { leverLock, strandingLock } from "./testSupport/floorLockFixtures"
import { BINDING } from "./testSupport/lockFixtures"

const carve = (config: FloorConfig, seed: number) =>
  assembleFloor("nested-locks", config, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: "nested-locks", floorIndex: 0 },
  })

const floorOf = (locks: PlacedLock[]): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  realisations: BINDING,
  locks,
})

const SEEDS = 12

const carved = (config: FloorConfig): FloorGrid[] =>
  Array.from({ length: SEEDS }, (_, n) => carve(config, n + 1)).flatMap(result => (result.success ? [result.grid] : []))

const insideOf = (host: string) => ({ instance: host })

/** A lever lock spliced into the nest spot of another lever lock. */
const leverInLever: PlacedLock[] = [
  { lock: leverLock() },
  { lock: leverLock(), as: "inner", inside: insideOf("lever") },
]

/** Three levers, each in the nest spot of the one before. */
const leverChain: PlacedLock[] = [
  { lock: leverLock() },
  { lock: leverLock(), as: "mid", inside: insideOf("lever") },
  { lock: leverLock(), as: "deep", inside: insideOf("mid") },
]

const strandingInLever: PlacedLock[] = [
  { lock: leverLock() },
  { lock: strandingLock(), as: "inner", inside: insideOf("lever") },
]

const leverInStranding: PlacedLock[] = [
  { lock: strandingLock() },
  { lock: leverLock(), as: "inner", inside: insideOf("stranding") },
]

const ownerOf = (label: string | undefined): string | undefined => label?.split(".")[0]

type Node = RoomCell | CorridorCell
const mainNodes = (grid: FloorGrid): Node[] =>
  grid.cells
    .flat()
    .filter(
      (cell): cell is Node => (cell.type === "room" || cell.type === "corridor") && /^\d+$/.test(cell.ordinal ?? "")
    )
    .filter(cell => cell.sectionAddress === "main")
    .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))

const expanded = (placements: PlacedLock[]) => {
  const result = expandFloorLocks(floorOf(placements))
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.reasons)}`)
  return result
}

const refusedWith = (placements: PlacedLock[]) => {
  const result = carve(floorOf(placements), 1)
  if (result.success) throw new Error("carved")
  return result.reasons
}

// The mechanisms of one lock instance, found by the authored region their cell stands in.
const mechanismsOf = (grid: FloorGrid, instance: string): string[] =>
  Object.keys(floorLock(grid)!.mechanisms).filter(id => {
    const [row, col] = id.split(" ")[1].split(",").map(Number)
    const cell = grid.cells[row][col]
    return cell.type === "room" && ownerOf(cell.region) === instance
  })

const productOf = (grid: FloorGrid) => {
  const found = reachableStates(floorLock(grid)!)
  if (found === "tooLarge") throw new Error("product too large")
  return found.order
}

// What the host can tell apart: where the player is, and what its own mechanisms are set to.
const hostStates = (grid: FloorGrid, instance: string): number => {
  const own = mechanismsOf(grid, instance)
  return new Set(productOf(grid).map(({ region, config }) => `${region}|${own.map(id => config[id])}`)).size
}

describe("a lock is nested where it is placed, and neither lock knows", () => {
  it("leaves the host lock exactly as written, with nothing in it naming the inner", () => {
    const host = leverLock()
    const before = JSON.stringify(host)
    expandFloorLocks(floorOf([{ lock: host }, { lock: leverLock(), as: "inner", inside: insideOf("lever") }]))

    expect(JSON.stringify(host)).toBe(before)
    expect(before).toBe(JSON.stringify(leverLock()))
    expect(before).not.toContain("inner")
  })

  it("splices the inner into the host's nest spot: in at the spot's first region, out at its second", () => {
    const { config, nesting } = expanded(leverInLever)

    expect(config.regionLayout!.regions.map(region => region.name)).toEqual([
      FLOOR_ENTRANCE,
      "lever.foyer",
      "lever.hall",
      "lever.landing",
      "inner.foyer",
      "inner.hall",
      "inner.landing",
      FLOOR_EXIT,
    ])
    expect(config.regionLayout!.connections).toEqual([
      [FLOOR_ENTRANCE, "lever.foyer"],
      ["lever.foyer", "inner.foyer"],
      ["inner.landing", "lever.hall"],
      ["lever.hall", "lever.landing"],
      ["inner.foyer", "inner.hall"],
      ["inner.hall", "inner.landing"],
      ["lever.landing", FLOOR_EXIT],
    ])
    expect(config.obstacles!.map(({ id, at }) => [id, at])).toEqual([
      ["lever.hallDoor", { on: "connection", between: ["lever.hall", "lever.landing"] }],
      ["inner.hallDoor", { on: "connection", between: ["inner.hall", "inner.landing"] }],
    ])
    expect(nesting).toEqual([
      {
        instance: "inner",
        host: "lever",
        regions: ["inner.foyer", "inner.hall", "inner.landing"],
        in: "inner.foyer",
        out: "inner.landing",
      },
    ])
  })

  it("leaves a nested lock out of the floor's sequence, so the next lock follows the host", () => {
    const { config } = expanded([...leverInLever, { lock: leverLock(), as: "after" }])

    expect(config.regionLayout!.connections).toContainEqual(["lever.landing", "after.foyer"])
    expect(config.regionLayout!.connections).not.toContainEqual(["inner.landing", "after.foyer"])
  })

  it("walks the host, the inner and the host again along the main route of every carve", { timeout: 60_000 }, () => {
    const grids = carved(floorOf(leverInLever))

    expect(grids.length).toBe(SEEDS)
    for (const grid of grids) {
      const route = mainNodes(grid)
        .map(node => ownerOf(node.region))
        .filter((owner, i, all) => i === 0 || owner !== all[i - 1])

      expect(route).toEqual([FLOOR_ENTRANCE, "lever", "inner", "lever", FLOOR_EXIT])
    }
  })
})

describe("a nesting that cannot be seated is refused by name", () => {
  const inner = (inside: { instance: string }): PlacedLock => ({
    lock: leverLock(),
    as: "inner",
    inside,
  })

  it("names a host instance the floor does not place", () => {
    expect(refusedWith([{ lock: leverLock() }, inner({ instance: "nowhere" })])).toEqual([
      { type: "lockNestingRefused", instance: "inner", fault: { type: "hostUnknown", host: "nowhere" } },
    ])
  })

  it("refuses a host with no nest spot", () => {
    const { nestSpot: _spot, ...plain } = { ...leverLock(), name: "plain" }
    expect(refusedWith([{ lock: plain }, inner({ instance: "plain" })])).toEqual([
      { type: "lockNestingRefused", instance: "inner", fault: { type: "noNestSpot", host: "plain" } },
    ])
  })

  it("treats a spot on a busy connection as no spot", () => {
    const busy: Lock = { ...leverLock(), name: "busy", nestSpot: { from: "hall", to: "landing" } }
    expect(refusedWith([{ lock: busy }, inner({ instance: "busy" })])).toEqual([
      { type: "lockNestingRefused", instance: "inner", fault: { type: "noNestSpot", host: "busy" } },
    ])
  })

  it("refuses a spot on no connection once, as the host's own refusal", () => {
    const astray: Lock = { ...leverLock(), name: "astray", nestSpot: { from: "foyer", to: "landing" } }
    expect(refusedWith([{ lock: astray }, inner({ instance: "astray" })])).toEqual([
      {
        type: "lockRefused",
        instance: "astray",
        fault: { type: "nestSpotOnNoConnection", from: "foyer", to: "landing" },
      },
    ])
  })

  it("refuses a lock nested in itself, naming the cycle", () => {
    expect(refusedWith([{ lock: leverLock(), inside: insideOf("lever") }])).toEqual([
      { type: "lockNestingRefused", instance: "lever", fault: { type: "cycle", through: ["lever"] } },
    ])
  })

  it("refuses two locks each nested in the other, once from each instance", () => {
    expect(
      refusedWith([
        { lock: leverLock(), as: "a", inside: insideOf("b") },
        { lock: leverLock(), as: "b", inside: insideOf("a") },
      ])
    ).toEqual([
      { type: "lockNestingRefused", instance: "a", fault: { type: "cycle", through: ["a", "b"] } },
      { type: "lockNestingRefused", instance: "b", fault: { type: "cycle", through: ["b", "a"] } },
    ])
  })

  it("refuses a second lock in a spot that already holds one, naming the first", () => {
    expect(
      refusedWith([
        { lock: leverLock() },
        { lock: leverLock(), as: "first", inside: insideOf("lever") },
        { lock: leverLock(), as: "second", inside: insideOf("lever") },
      ])
    ).toEqual([
      {
        type: "lockNestingRefused",
        instance: "second",
        fault: { type: "nestSpotTaken", host: "lever", with: "first" },
      },
    ])
  })
})

describe("a nested lock counts to the host as the ground it crosses, never as its states", () => {
  const config = floorOf(leverInLever)

  it("walks the nested floor in exactly the host's states, fewer than the product of host and inner", () => {
    const result = carve(config, 1)
    if (!result.success) throw new Error("did not carve")
    const walk = walkFloorLock(result.grid)

    expect(productOf(result.grid)).toHaveLength(31)
    expect(walk).toEqual({ sound: true, states: 21, nested: { inner: 8 } })
    expect(21).toBeLessThan(productOf(result.grid).length)
  })

  it(
    "walks every carve in the states the host tells apart in the product walk, and fewer than the product",
    { timeout: 60_000 },
    () => {
      const grids = carved(config)

      expect(grids.length).toBe(SEEDS)
      for (const grid of grids) {
        const walk = walkFloorLock(grid)!
        if (!walk.sound) throw new Error(describeFloorWalkFailure(walk.failure))

        expect(walk.states).toBe(hostStates(grid, "lever"))
        expect(walk.states).toBeLessThan(productOf(grid).length)
      }
    }
  )

  it("keeps a chain of three nested locks to the first host's states", { timeout: 60_000 }, () => {
    const grids = carved(floorOf(leverChain))

    expect(grids.length).toBe(SEEDS)
    const first = walkFloorLock(grids[0])
    expect(productOf(grids[0])).toHaveLength(75)
    expect(first).toEqual({ sound: true, states: 31, nested: { mid: 18, deep: 8 } })
    expect(31).toBeLessThan(productOf(grids[0]).length)
    for (const grid of grids) {
      const walk = walkFloorLock(grid)!
      if (!walk.sound) throw new Error(describeFloorWalkFailure(walk.failure))

      expect(walk.states).toBe(hostStates(grid, "lever"))
      expect(walk.states).toBeLessThan(productOf(grid).length)
    }
  })
})

describe("a nested floor is sound exactly when the product walk says it is", () => {
  it.each([
    ["a lever in a lever", leverInLever, true],
    ["a chain of levers", leverChain, true],
    ["a stranding lock in a lever", strandingInLever, false],
    ["a lever in a stranding lock", leverInStranding, false],
  ])("agrees with the product walk on every carve: %s", { timeout: 60_000 }, (_, placements, sound) => {
    const grids = carved(floorOf(placements))

    expect(grids.length).toBe(SEEDS)
    for (const grid of grids) {
      expect(walkLock(floorLock(grid)!).sound).toBe(sound)
      expect(walkFloorLock(grid)!.sound).toBe(sound)
    }
  })

  it("fails the whole floor when the inner lock strands, naming the inner and where", { timeout: 60_000 }, () => {
    for (const grid of carved(floorOf(strandingInLever))) {
      const walk = walkFloorLock(grid)!

      expect(walk.sound).toBe(false)
      if (walk.sound) continue
      expect(walk.failure).toMatchObject({ type: "nested", instance: "inner", failure: { type: "notFree" } })
      expect(describeFloorWalkFailure(walk.failure)).toMatch(/^inside inner: from .* cannot be reached$/)
    }
  })

  it("fails the floor on the host's own walk when the host strands around a sound inner", { timeout: 60_000 }, () => {
    for (const grid of carved(floorOf(leverInStranding))) {
      const walk = walkFloorLock(grid)!

      expect(walk.sound).toBe(false)
      if (!walk.sound) expect(walk.failure.type).toBe("strands")
    }
  })

  it("leaves the same regions dead as the product walk does", { timeout: 60_000 }, () => {
    for (const placements of [leverInLever, leverChain])
      for (const grid of carved(floorOf(placements))) {
        expect(deadFloorRegions(grid)).toEqual(deadRegions(floorLock(grid)!))
        expect(deadFloorRegions(grid)).toEqual([])
      }
  })
})

describe("a floor without nesting is walked exactly as it was", () => {
  const floors: [string, PlacedLock[]][] = [
    ["one lever", [{ lock: leverLock() }]],
    [
      "two clones",
      [
        { lock: leverLock(), as: "north" },
        { lock: leverLock(), as: "south" },
      ],
    ],
    ["a stranding lock", [{ lock: strandingLock() }]],
    ["a lever then a stranding lock", [{ lock: leverLock() }, { lock: strandingLock() }]],
  ]

  it.each(floors)(
    "hands the walk and the dead regions of the whole lock over unchanged: %s",
    { timeout: 60_000 },
    (_, placements) => {
      const grids = carved(floorOf(placements))

      expect(grids.length).toBeGreaterThan(0)
      for (const grid of grids) {
        const lock = floorLock(grid)!

        expect(grid.lockNesting).toBeUndefined()
        expect(walkFloorLock(grid)).toEqual(walkLock(lock))
        expect(deadFloorRegions(grid)).toEqual(deadRegions(lock))
      }
    }
  )
})

describe("stones on a floor with nested locks", () => {
  const stones = parseLock(
    "in -- yard\nyard -&> hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nyard ?\nhall ?\nout ?",
    "stones"
  ).lock
  const nested: PlacedLock[] = [{ lock: stones }, { lock: leverLock(), as: "inner", inside: { instance: "stones" } }]

  it("is refused by the walk, which finds no dead region to report", () => {
    const grids = carved({ ...floorOf(nested), realisations: { ...BINDING, weights: "stonePlate" } })
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expect(walkFloorLock(grid)).toEqual({
        sound: false,
        failure: { type: "entangled", problem: "stones on a floor with nested locks" },
      })
    }
  })
})
