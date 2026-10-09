import { describe, expect, it } from "vitest"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"
import type { PlacedLock } from "./floorLocks"
import { deadFloorRegions, describeFloorWalkFailure, walkFloorLock } from "./floorLockWalk"
import type { Lock } from "./lockAuthoring"
import { cellSlot } from "./cellSlot"
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
import { BINDING, mirrorForkLock, sluiceLock } from "./testSupport/lockFixtures"

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

const path = (pathPuzzles: number, more: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles,
  difficulty: "expert",
  end: "treasure",
  ...more,
})
const SIDES = [path(2), path(0), path(1)]
// Two side paths whose entrance carries no door: content of the floor, with puzzles and an end room each.
const UNGATED = [path(2), path(1)]
// One that carries no door, and one that waits on a floor key the first hosts.
const MIXED = [path(2), path(1, { gate: { type: "floor-key" } })]

// `sound` is null for a lock with no mechanism, which has no walk.
type Fixture = { floor: FloorConfig; registry: boolean; sound: boolean | null | "some"; minimum: number }

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
  "sequence lock": { floor: floorOf([{ lock: platesLock() }]), registry: false, sound: "some", minimum: 30 },
  "mirrorFork without side paths": {
    floor: floorOf([{ lock: mirrorForkLock() }], { pathPuzzles: 0 }),
    registry: true,
    sound: true,
    minimum: 30,
  },
  "mirrorFork with side paths": {
    floor: floorOf([{ lock: mirrorForkLock() }], { pathPuzzles: 0, sideSections: SIDES }),
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
  "a lock whose regions have appetites and a side path of one puzzle": {
    floor: floorOf([{ lock: hungryLock() }], { sideSections: [path(1)] }),
    registry: true,
    sound: true,
    minimum: 30,
  },
  "lever with ungated side paths": {
    floor: floorOf([{ lock: leverLock() }], { sideSections: UNGATED }),
    registry: true,
    sound: true,
    minimum: 30,
  },
  "two locks in a chain with ungated side paths": {
    floor: floorOf([{ lock: leverLock() }, { lock: leverLock(), as: "second" }], { sideSections: UNGATED }),
    registry: true,
    sound: true,
    minimum: 30,
  },
  "sluice with ungated side paths": {
    floor: floorOf([{ lock: sluiceLock() }], { sideSections: UNGATED }),
    registry: true,
    sound: true,
    minimum: 30,
  },
  "mirrorFork with two ungated side paths": {
    floor: floorOf([{ lock: mirrorForkLock() }], { pathPuzzles: 0, sideSections: UNGATED }),
    registry: true,
    sound: true,
    minimum: 30,
  },
  "mirrorFork with one ungated and one floor-key-gated side path": {
    floor: floorOf([{ lock: mirrorForkLock() }], { pathPuzzles: 0, sideSections: MIXED }),
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
        sound === false
          ? "walks the strand the lock was written with, on every carve"
          : sound === "some"
            ? "walks sound on some carves, and every other one fails the walk"
            : "walks sound on every carve",
        () => {
          for (const { grid } of carvedOf(name)) {
            const walk = walkFloorLock(grid)
            if (sound === "some") continue
            if (sound === null) expect(walk).toBeUndefined()
            else if (sound) {
              if (!walk!.sound) throw new Error(describeFloorWalkFailure(walk!.failure))
              expect(deadFloorRegions(grid)).toEqual([])
            } else expect(walk!.sound).toBe(false)
          }
          // A tile cannot be walked round, so the order is the walk's to keep and a carve may not allow it.
          if (sound === "some") {
            const walks = carvedOf(name).map(({ grid }) => walkFloorLock(grid)!)
            expect(walks.filter(walk => walk.sound).length).toBeGreaterThan(0)
          }
        }
      )
    })
  }

  it("stands mirrorFork's fork-switch with the lightbeam family, rest and one state for each seam", () => {
    for (const { grid } of carvedOf("mirrorFork without side paths")) {
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

// The cells that answer to one authored side path, by the node they stand on.
const cellsOfSection = (grid: FloorGrid, section: number) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (addressOf(cell) === `s${section}` ? [{ key: `${r},${c}`, cell }] : []))
  )
const roomsOfSection = (grid: FloorGrid, section: number) =>
  cellsOfSection(grid, section).flatMap(({ key, cell }) => (cell.type === "room" ? [{ key, cell }] : []))

const CONTENT_FIXTURES = [
  "lever with ungated side paths",
  "two locks in a chain with ungated side paths",
  "sluice with ungated side paths",
  "mirrorFork with two ungated side paths",
]

describe("an ungated side path of a laid floor is content standing on laid nodes", { timeout: 300_000 }, () => {
  for (const name of CONTENT_FIXTURES)
    describe(name, () => {
      it("stands every room of every ungated side path on a laid node and grows no branch for it", () => {
        for (const { grid, laid } of carvedOf(name)) {
          expect(laid.absorbed.map(({ section }) => section)).toEqual([0, 1])
          for (const { section, cells } of laid.absorbed) {
            const own = cellsOfSection(grid, section).map(({ key }) => key)
            expect(own.sort()).toEqual([...cells].sort())
            for (const key of own) expect(laid.label.has(key), `s${section} at ${key} stands on laid ground`).toBe(true)
          }
        }
      })

      it("keeps each side path's own puzzles and end room", () => {
        for (const { grid } of carvedOf(name))
          UNGATED.forEach((side, i) => {
            const rooms = roomsOfSection(grid, i).map(({ cell }) => cell)
            const indices = rooms.flatMap(room => (room.pathIndex === undefined ? [] : [room.pathIndex]))
            expect(indices.sort((x, y) => x - y)).toEqual(Array.from({ length: side.pathPuzzles }, (_, k) => k))
            expect(rooms.filter(room => room.tags?.includes("treasure"))).toHaveLength(1)
          })
      })

      it("meets each side path's puzzles in their own order along the walk from the way in, and its end room last", () => {
        for (const { grid, laid } of carvedOf(name))
          for (const { section, cells } of laid.absorbed) {
            const rooms = roomsOfSection(grid, section)
            const byIndex = rooms
              .filter(({ cell }) => cell.pathIndex !== undefined)
              .sort((a, b) => a.cell.pathIndex! - b.cell.pathIndex!)
            const depths = byIndex.map(({ key }) => laid.depth.get(key)!)
            expect(depths).toEqual([...depths].sort((a, b) => a - b))
            const end = rooms.find(({ cell }) => cell.pathIndex === undefined)!
            expect(end.key).toBe(cells[cells.length - 1])
            expect(laid.depth.get(end.key)!).toBeGreaterThanOrEqual(depths[depths.length - 1] ?? 0)
          }
      })
    })

  it("keeps a side path out of a region that takes nothing and its puzzles out of one that takes a reward", () => {
    const name = "a lock whose regions have appetites and a side path of one puzzle"
    for (const { grid } of carvedOf(name)) {
      const rooms = roomsOfSection(grid, 0).map(({ cell }) => cell)
      expect(rooms.map(room => room.region)).not.toContain("lever.foyer")
      expect(rooms.filter(room => room.pathIndex !== undefined).map(room => room.region)).not.toContain("lever.landing")
    }
  })

  it("files an absorbed side path's rooms under the same addresses whichever seed carves them", () => {
    const name = "mirrorFork with two ungated side paths"
    const filed = (grid: FloorGrid) =>
      grid.cells
        .flatMap((row, r) =>
          row.flatMap((cell, c) =>
            addressOf(cell)?.startsWith("s") && cell.type === "room"
              ? [`${cell.sectionAddress}|${cellSlot(grid, r, c)}|${cell.sectionHash}|${cell.legacySectionHash}`]
              : []
          )
        )
        .sort()
    const carved = carvedOf(name)
    const first = filed(carved[0].grid)
    expect(first).toHaveLength(5)
    for (const { grid } of carved) expect(filed(grid)).toEqual(first)
    // The rooms moved: the same addresses on different nodes.
    expect(new Set(carved.map(({ laid }) => JSON.stringify(laid.absorbed))).size).toBeGreaterThan(1)
  })
})

describe("a gated side path of a laid floor stays a branch off laid ground", { timeout: 300_000 }, () => {
  const mixed = () => carvedOf("mirrorFork with one ungated and one floor-key-gated side path")

  it("hangs the gated path off laid ground as a branch of its own and fills only the ungated one in", () => {
    for (const { grid, laid } of mixed()) {
      expect(laid.absorbed.map(({ section }) => section)).toEqual([0])
      const gated = cellsOfSection(grid, 1)
      expect(gated.length).toBeGreaterThan(1)
      for (const { key } of gated) expect(laid.label.has(key)).toBe(false)
    }
  })

  it("attaches the gated path to laid ground, never to another side path or through a door", () => {
    for (const { grid, laid } of mixed()) {
      const filledIn = new Set(laid.absorbed.flatMap(({ cells }) => cells))
      grid.cells.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (addressOf(cell) !== "s1" || (cell.type !== "room" && cell.type !== "corridor")) return
          for (const dir of cell.dirs) {
            const [dr, dc] = { n: [-1, 0], e: [0, 1], s: [1, 0], w: [0, -1] }[dir]
            const beside = grid.cells[r + dr][c + dc]
            expect(laid.doors.has(`${r + dr},${c + dc}`), `s1 at ${r},${c} opens onto a door`).toBe(false)
            if (ground(addressOf(beside)) || filledIn.has(`${r + dr},${c + dc}`))
              expect(beside.type === "room" && beside.requiredKeyId).toBeFalsy()
          }
        })
      )
    }
  })

  it("hosts the key its gate waits on in the ungated path's end room, on ground no door shuts", () => {
    for (const { grid, laid } of mixed()) {
      const gate = grid.cells.flat().find(cell => cell.type === "room" && cell.gateVariant === "floor-key")
      if (gate?.type !== "room") throw new Error("the gated path has no gate")
      const [host] = laid.absorbed
      const end = host.cells[host.cells.length - 1]
      const [r, c] = end.split(",").map(Number)
      const room = grid.cells[r][c]
      expect(room.type === "room" && room.reward).toMatchObject({ type: "tombKey", keyId: gate.requiredKeyId })
      for (const cell of host.cells) expect(laid.open.has(cell)).toBe(true)
    }
  })
})

describe("the carve lengthens the cheapest stretch when the laid nodes cannot take a side path", () => {
  const withPath = () => carvedOf("a lock whose regions have appetites and a side path of one puzzle")

  it("lengthens nothing for a floor whose content the laid nodes take", () => {
    for (const { laid } of carvedOf("a lock whose regions have appetites")) expect(laid.lengthened).toEqual([])
  })

  it("lengthens the corridor from the entrance to the foyer by two nodes for a side path of one puzzle and a chest", () => {
    for (const { laid } of withPath())
      expect(laid.lengthened[0]).toMatchObject({ kind: "corridor", id: "entrance>lever.foyer", nodes: 2 })
  })

  it("stands the side path's rooms on the nodes of the corridor it lengthened", () => {
    for (const { laid } of withPath()) {
      const corridor = new Set(laid.stretches.get("corridor:entrance>lever.foyer"))
      expect(laid.absorbed[0].cells.some(cell => corridor.has(cell))).toBe(true)
    }
  })

  it("chooses the stretch whose cost is least of every stretch it weighed", () => {
    for (const { laid } of withPath())
      for (const choice of laid.lengthened) {
        const [first, ...rest] = choice.considered
        expect(first).toMatchObject({ kind: choice.kind, id: choice.id, nodes: choice.nodes })
        expect(rest.length).toBeGreaterThan(0)
        for (const other of rest) {
          const worse = first.cost.findIndex((part, i) => part !== other.cost[i])
          expect(worse < 0 || first.cost[worse] < other.cost[worse]).toBe(true)
        }
      }
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
