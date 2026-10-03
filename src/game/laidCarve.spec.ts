import { describe, expect, it } from "vitest"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"
import type { PlacedLock } from "./floorLocks"
import { deadFloorRegions, describeFloorWalkFailure, walkFloorLock } from "./floorLockWalk"
import type { Lock } from "./lockAuthoring"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, FloorGrid, RoomCell, SideSection } from "./siteTypes"
import {
  CARVE_FAULT_TYPES,
  carveOnce,
  expectCarveAgrees,
  expectCarveReadsLaid,
  expectContentFitsAppetite,
  expectForkSwitchRoom,
  expectNoWayRoundADoor,
  expectRouteIsWholeRoute,
} from "./testSupport/laidCarveChecks"
import type { LaidCarve } from "./testSupport/laidCarveChecks"
import { leverLock, strandingLock } from "./testSupport/floorLockFixtures"
import { BINDING, doubleBackLock, sluiceLock } from "./testSupport/lockFixtures"

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)

/** Tiles in the hall, an annex off it and the hall again; the sequence opens the way on to the vault. */
const platesLock = (): Lock => ({
  name: "plates",
  regions: { mouth: { takes: "free" }, hall: { takes: "free" }, annex: { takes: "free" }, vault: { takes: "free" } },
  connections: [["mouth", "hall"], ["hall", "annex"], { between: ["hall", "vault"], barriers: ["vaultDoor"] }],
  gates: { vaultDoor: { from: "hall", to: "vault", owners: ["plates"] } },
  mechanics: {
    plates: {
      control: "sequence",
      steps: [{ in: "hall" }, { in: "annex" }, { in: "hall" }],
      resetAt: "vaultDoor",
      opens: { done: ["vaultDoor"] },
    },
  },
  in: "mouth",
  out: "vault",
})

/** Two doors in series on the way from the hall to the landing, both worked by the one lever. */
const seriesLock = (): Lock => ({
  name: "series",
  regions: { foyer: { takes: "free" }, hall: { takes: "free" }, landing: { takes: "free" } },
  connections: [["foyer", "hall"], { between: ["hall", "landing"], barriers: ["first", "second"] }],
  gates: {
    first: { from: "hall", to: "landing", owners: ["lever"] },
    second: { from: "hall", to: "landing", owners: ["lever"] },
  },
  mechanics: {
    lever: { control: "toggle", in: "foyer", starts: "shut", opens: { shut: [], open: ["first", "second"] } },
  },
  in: "foyer",
  out: "landing",
})

/** Four regions in a ring with no door anywhere: the way out is reachable by either side of it. */
const ringLock = (): Lock => ({
  name: "ring",
  regions: { in: { takes: "free" }, p: { takes: "free" }, q: { takes: "free" }, r: { takes: "free" } },
  connections: [
    ["in", "p"],
    ["in", "q"],
    ["p", "r"],
    ["q", "r"],
  ],
  gates: {},
  mechanics: {},
  in: "in",
  out: "p",
})

/** The lever lock with an appetite in every region: nothing in the foyer, puzzles in the hall, a reward at the landing. */
const hungryLock = (): Lock => ({
  ...leverLock(),
  regions: { foyer: { takes: "nothing" }, hall: { takes: "puzzles" }, landing: { takes: "reward" } },
})

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

const path = (pathPuzzles: number): SideSection => ({ pathPuzzles, difficulty: "expert", end: "treasure" })
const SIDES = [path(2), path(0), path(1)]

// `sound` is null for a lock with no mechanism, which has no walk.
type Fixture = { floor: FloorConfig; registry: boolean; sound: boolean | null; minimum: number }

// The sequence lock stands on the fallback catalogue: the registry binds no tile realisation.
const FIXTURES: Record<string, Fixture> = {
  sluice: { floor: floorOf([{ lock: sluiceLock() }]), registry: true, sound: true, minimum: 30 },
  lever: { floor: floorOf([{ lock: leverLock() }]), registry: true, sound: true, minimum: 30 },
  "two locks in a chain": {
    floor: floorOf([{ lock: leverLock() }, { lock: leverLock(), as: "second" }]),
    registry: true,
    sound: true,
    minimum: 30,
  },
  "a lock that strands": {
    floor: floorOf([{ lock: leverLock() }, { lock: strandingLock() }]),
    registry: true,
    sound: false,
    minimum: 30,
  },
  "two doors in series, with side paths": {
    floor: floorOf([{ lock: seriesLock() }], { sideSections: SIDES }),
    registry: true,
    sound: true,
    minimum: 20,
  },
  "a ring of regions with side paths": {
    floor: floorOf([{ lock: ringLock() }], { sideSections: SIDES }),
    registry: true,
    sound: null,
    minimum: 20,
  },
  "sequence lock": { floor: floorOf([{ lock: platesLock() }]), registry: false, sound: true, minimum: 30 },
  "doubleBack without side paths": {
    floor: floorOf([{ lock: doubleBackLock() }], { pathPuzzles: 0 }),
    registry: true,
    sound: true,
    minimum: 30,
  },
  "doubleBack with side paths": {
    floor: floorOf([{ lock: doubleBackLock() }], { pathPuzzles: 0, sideSections: SIDES }),
    registry: true,
    sound: true,
    minimum: 30,
  },
  "a lock whose regions have appetites": {
    floor: floorOf([{ lock: hungryLock() }]),
    registry: true,
    sound: true,
    minimum: 30,
  },
  "a lock whose regions have appetites, with side paths": {
    floor: floorOf([{ lock: hungryLock() }], { sideSections: [path(1), path(0)] }),
    registry: true,
    sound: true,
    minimum: 20,
  },
}

const carves = new Map<string, LaidCarve[]>()
const carvesOf = (name: string): LaidCarve[] => {
  if (!carves.has(name)) {
    const { floor, registry } = FIXTURES[name]
    carves.set(
      name,
      SEEDS.map(seed =>
        carveOnce(
          "laid",
          floor,
          seed,
          registry ? resolveEncounterMeta : undefined,
          registry ? { resolveKeyRequirements } : {}
        )
      )
    )
  }
  return carves.get(name)!
}
// A check over the carves that did not carve would pass for nothing, so every one asks for the rate first.
const carvedOf = (name: string) => {
  const found = carvesOf(name).flatMap(carve => (carve.ok ? [carve] : []))
  expect(found.length, `${name} carves`).toBeGreaterThanOrEqual(FIXTURES[name].minimum)
  return found
}

describe("a lock floor is carved from the structure laid for it", { timeout: 300_000 }, () => {
  for (const [name, { floor, sound, minimum }] of Object.entries(FIXTURES)) {
    describe(name, () => {
      it(`carves on the first attempt at ${minimum} of 40 seeds at least`, () => {
        expect(carvedOf(name).length).toBeGreaterThanOrEqual(minimum)
      })

      it("reads route, arms, junction, drops and regions off the laid floor, on every carve", () => {
        for (const { grid, laid } of carvedOf(name)) expectCarveReadsLaid(grid, laid)
      })

      it("runs the main path along the whole route and ends it at the exit region, on every carve", () => {
        for (const { grid, laid } of carvedOf(name)) expectRouteIsWholeRoute(grid, floor, laid)
      })

      it("never joins two regions the lock keeps apart nor goes round a door, on every carve", () => {
        for (const { grid, laid } of carvedOf(name)) {
          expectCarveAgrees(grid, floor)
          expectNoWayRoundADoor(grid, laid)
        }
      })

      it("puts content only in regions whose appetite takes it, on every carve", () => {
        for (const { grid } of carvedOf(name)) expectContentFitsAppetite(grid, floor)
      })

      it("never meets a carve fault on a laid floor, so none is retried away", () => {
        carvedOf(name)
        for (const carve of carvesOf(name))
          if (!carve.ok) expect(carve.reasons.filter(reason => CARVE_FAULT_TYPES.has(reason.type))).toEqual([])
      })

      it(
        sound === false ? "walks the strand the lock was written with, on every carve" : "walks sound on every carve",
        () => {
          for (const { grid } of carvedOf(name)) {
            const walk = walkFloorLock(grid)
            if (sound === null) expect(walk).toBeUndefined()
            else if (sound) {
              if (!walk!.sound) throw new Error(describeFloorWalkFailure(walk!.failure))
              expect(deadFloorRegions(grid)).toEqual([])
            } else expect(walk!.sound).toBe(false)
          }
        }
      )
    })
  }

  it("stands doubleBack's fork-switch with the lightbeam family, rest and one state for each seam", () => {
    for (const { grid } of carvedOf("doubleBack without side paths")) {
      const junction = expectForkSwitchRoom(grid, "lightbeamSwitch")
      expect(junction.exits!.filter(exit => exit.gateKeyId !== undefined)).toHaveLength(2)
    }
  })

  it("puts the puzzles of a lock whose hall wants puzzles in the hall alone", () => {
    for (const { grid } of carvedOf("a lock whose regions have appetites")) {
      const puzzles = grid.cells
        .flat()
        .filter((cell): cell is RoomCell => cell.type === "room" && cell.pathIndex !== undefined)
      expect(puzzles).toHaveLength(2)
      expect(puzzles.map(room => room.region)).toEqual(["lever.hall", "lever.hall"])
    }
  })
})

const addressOf = (cell: FloorGrid["cells"][number][number]) =>
  cell.type === "room" || cell.type === "corridor" ? cell.sectionAddress : undefined
const ground = (address: string | undefined) => address === "main" || address?.startsWith("lock:")

describe("the side paths of a laid floor are content hung off its ground", { timeout: 300_000 }, () => {
  const sided = () => carvedOf("doubleBack with side paths")

  it("hangs every authored side path as a branch of its own, none consumed by the lock", () => {
    expect(sided().length).toBeGreaterThanOrEqual(30)
    for (const { grid } of sided()) {
      const addresses = new Set(
        grid.cells
          .flat()
          .map(addressOf)
          .filter(address => /^s\d+$/.test(address ?? ""))
      )
      expect([...addresses].sort()).toEqual(["s0", "s1", "s2"])
    }
  })

  it("keeps each side path's own puzzles and end room", () => {
    for (const { grid } of sided()) {
      const rooms = grid.cells.flat().filter((cell): cell is RoomCell => cell.type === "room")
      SIDES.forEach((side, i) => {
        const own = rooms.filter(room => room.sectionAddress === `s${i}`)
        expect(own.filter(room => room.pathIndex !== undefined)).toHaveLength(side.pathPuzzles)
        expect(own.filter(room => room.tags?.includes("treasure"))).toHaveLength(1)
      })
    }
  })

  it("attaches every side path to laid ground, never to another side path or through a door", () => {
    for (const { grid } of sided()) {
      grid.cells.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (!/^s\d+$/.test(addressOf(cell) ?? "") || (cell.type !== "room" && cell.type !== "corridor")) return
          for (const dir of cell.dirs) {
            const [dr, dc] = { n: [-1, 0], e: [0, 1], s: [1, 0], w: [0, -1] }[dir]
            const beside = grid.cells[r + dr][c + dc]
            if (ground(addressOf(beside))) expect(beside.type === "room" && beside.requiredKeyId).toBeFalsy()
          }
        })
      )
      const sideRegions = new Map<string, Set<string | undefined>>()
      for (const cell of grid.cells.flat())
        if (/^s\d+$/.test(addressOf(cell) ?? "") && (cell.type === "room" || cell.type === "corridor"))
          sideRegions.set(cell.sectionAddress!, (sideRegions.get(cell.sectionAddress!) ?? new Set()).add(cell.region))
      for (const regions of sideRegions.values()) expect(regions.size).toBe(1)
    }
  })

  it("keeps every mechanism and door of the lock out of the authored side paths", () => {
    for (const { grid } of sided())
      for (const cell of grid.cells.flat())
        if (cell.type === "room" && (cell.mechanismId !== undefined || cell.requiredKeyId?.startsWith("obstacle:")))
          expect(ground(cell.sectionAddress)).toBe(true)
  })

  it("carves the floor with no side paths at all as the lock alone, without a branch", () => {
    for (const { grid } of carvedOf("doubleBack without side paths"))
      expect(grid.cells.flat().filter(cell => /^s\d+$/.test(addressOf(cell) ?? ""))).toEqual([])
  })
})

describe("a floor without locks is carved the way it always was", () => {
  const plain = (): FloorConfig => ({
    pathPuzzles: 2,
    difficulty: "junior",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [path(1), path(1)],
  })

  it("never lays anything, and carves the same cells twice", () => {
    let laid = 0
    const carve = (seed: number) => assembleFloor("plain", plain(), seed, undefined, { onLaid: () => (laid += 1) })
    for (const seed of SEEDS.slice(0, 5)) {
      const first = carve(seed)
      const second = carve(seed)
      expect(
        first.success && second.success && JSON.stringify(first.grid.cells) === JSON.stringify(second.grid.cells)
      ).toBe(true)
    }
    expect(laid).toBe(0)
  })

  it("lays once an attempt for a floor with locks", () => {
    let laid = 0
    const result = assembleFloor("locked", FIXTURES.lever.floor, 1, resolveEncounterMeta, {
      resolveKeyRequirements,
      maxAttempts: 1,
      onLaid: () => (laid += 1),
    })
    expect(result.success).toBe(true)
    expect(laid).toBe(1)
  })
})
