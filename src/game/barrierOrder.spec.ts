import { beforeAll, describe, expect, it } from "vitest"
import { resolveEncounterMeta as resolveEncounter } from "@/mods/allFamilyMeta"
import { dropUnownedAuthoring } from "@/worldGen/modOwnedAuthoring"
import { TOPOLOGY_OFF, isRealisationRefusal, outcomeOf } from "./testSupport/modOff"
import { assembleFloor } from "./siteAssembler"
import { cellSlot } from "./cellSlot"
import { floorLock, regionsOf } from "./floorLock"
import { barrierRuns, seatBarrierRun, topologyFaults } from "./obstacles"
import type { BarrierOrder, TopologyFault } from "./obstacles"
import type { Direction, FloorConfig, FloorGrid, GridCell, RoomCell } from "./siteTypes"
import {
  forkSeamWithSecondGateFloor,
  twoGatesOffRouteFloor,
  twoGatesOnRouteFloor,
  twoGatesOnRouteWrittenBackwardsFloor,
} from "./testSupport/barrierOrderFixtures"
import { andDoorFloor } from "./testSupport/gateFaceFixtures"
import { MECHANISM_AT_REST } from "./siteTypes"

const KEY = (id: string) => `obstacle:test#0#0:${id}`
const SEEDS = Array.from({ length: 40 }, (_, n) => n + 1)
// The designer's doubleBack carves rarely (7 of seeds 1-120 with the second gate, 3 without it), and
// finding those costs a minute; these are the seeds that carve, and each test asserts at least one does.
const FORK_SEEDS = [48, 58, 66, 70, 81, 86, 101]
const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const BACK: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }
const at = (r: number, c: number) => `${r},${c}`

const walkable = (cell: GridCell | undefined): cell is GridCell & { dirs: ReadonlySet<Direction> } =>
  cell?.type === "room" || cell?.type === "corridor"

// The cells a player steps to from one cell: a way out the far cell names back.
const stepsFrom = (grid: FloorGrid, r: number, c: number): [number, number][] => {
  const here = grid.cells[r][c]
  if (!walkable(here)) return []
  return [...here.dirs].flatMap(dir => {
    const [nr, nc] = [r + MOVES[dir][0], c + MOVES[dir][1]]
    const there = grid.cells[nr]?.[nc]
    return walkable(there) && there.dirs.has(BACK[dir]) ? [[nr, nc] as [number, number]] : []
  })
}

const rooms = (grid: FloorGrid): { r: number; c: number; cell: RoomCell }[] =>
  grid.cells.flatMap((row, r) => row.flatMap((cell, c) => (cell.type === "room" ? [{ r, c, cell }] : [])))

const doorOf = (grid: FloorGrid, id: string) => {
  const doors = rooms(grid).filter(({ cell }) => cell.requiredKeyId === KEY(id))
  expect(doors, `door of ${id}`).toHaveLength(1)
  return doors[0]
}

type Carved = { seed: number; grid: FloorGrid }

const carves = new Map<() => FloorConfig, Carved[]>()
const carveAll = (make: () => FloorConfig, seeds: number[]): Carved[] => {
  const known = carves.get(make)
  if (known) return known
  const found = seeds.flatMap(seed => {
    const result = assembleFloor("test", make(), seed, resolveEncounter)
    return result.success ? [{ seed, grid: result.grid }] : []
  })
  carves.set(make, found)
  return found
}

const refusedWith = (config: FloorConfig): TopologyFault[] => {
  const result = assembleFloor("test", config, 1, resolveEncounter)
  expect(result.success).toBe(false)
  return result.success ? [] : (result.reasons as TopologyFault[])
}

const faultsOf = (config: FloorConfig): TopologyFault[] =>
  topologyFaults(
    config.regionLayout,
    config.obstacles ?? [],
    config.controls ?? [],
    config.forks ?? [],
    config.barrierOrder ?? []
  )

const withOrder = (make: () => FloorConfig, barrierOrder: BarrierOrder[] | undefined): FloorConfig => ({
  ...make(),
  barrierOrder,
})

describe("the order of the barriers on one connection is stated, and refused where it does not resolve", () => {
  it("accepts every shipped multi-gate fixture as written", () => {
    for (const make of [
      twoGatesOnRouteFloor,
      twoGatesOnRouteWrittenBackwardsFloor,
      twoGatesOffRouteFloor,
      forkSeamWithSecondGateFloor,
    ])
      expect(faultsOf(make())).toEqual([])
  })

  it("refuses a connection carrying several gates with no stated order, naming each gate", () => {
    expect(faultsOf(withOrder(twoGatesOnRouteFloor, undefined))).toEqual([
      { type: "barrierUnordered", id: "ironDoor", between: ["hall", "vault"] },
      { type: "barrierUnordered", id: "sandDoor", between: ["hall", "vault"] },
    ])
  })

  it("refuses a gate an order leaves out, naming only that gate", () => {
    expect(faultsOf(withOrder(twoGatesOnRouteFloor, [{ between: ["hall", "vault"], barriers: ["ironDoor"] }]))).toEqual(
      [{ type: "barrierUnordered", id: "sandDoor", between: ["hall", "vault"] }]
    )
  })

  it("refuses an order naming a barrier no obstacle defines", () => {
    expect(
      faultsOf(
        withOrder(twoGatesOnRouteFloor, [
          { between: ["hall", "vault"], barriers: ["ironDoor", "ghostDoor", "sandDoor"] },
        ])
      )
    ).toEqual([{ type: "barrierNotDefined", id: "ghostDoor", between: ["hall", "vault"] }])
  })

  it("refuses an order naming a gate that stands on a different connection", () => {
    const config = twoGatesOnRouteFloor()
    config.obstacles = [
      ...config.obstacles!,
      { id: "hallDoor", kind: "gate", at: { on: "connection", between: ["mouth", "hall"] } },
    ]
    config.controls = [
      ...config.controls!,
      {
        id: "hallLever",
        in: "mouth",
        states: ["off", "on"],
        initial: "off",
        returnsToInitial: true,
        opens: { on: ["hallDoor"] },
      },
    ]
    config.barrierOrder = [{ between: ["hall", "vault"], barriers: ["ironDoor", "hallDoor", "sandDoor"] }]

    expect(faultsOf(config)).toEqual([{ type: "barrierNotOnConnection", id: "hallDoor", between: ["hall", "vault"] }])
  })

  it("refuses an order that lists one gate twice", () => {
    expect(
      faultsOf(
        withOrder(twoGatesOnRouteFloor, [
          { between: ["hall", "vault"], barriers: ["ironDoor", "sandDoor", "ironDoor"] },
        ])
      )
    ).toEqual([{ type: "barrierListedTwice", id: "ironDoor", between: ["hall", "vault"] }])
  })

  it("refuses an order for a pair of regions the layout does not join", () => {
    expect(
      faultsOf(
        withOrder(twoGatesOnRouteFloor, [
          { between: ["hall", "vault"], barriers: ["ironDoor", "sandDoor"] },
          { between: ["mouth", "vault"], barriers: [] },
        ])
      )
    ).toEqual([{ type: "barrierOrderNamesNoConnection", between: ["mouth", "vault"] }])
  })

  it("refuses two orders for one connection, however the ends are written", () => {
    expect(
      faultsOf(
        withOrder(twoGatesOnRouteFloor, [
          { between: ["hall", "vault"], barriers: ["ironDoor", "sandDoor"] },
          { between: ["vault", "hall"], barriers: ["sandDoor", "ironDoor"] },
        ])
      )
    ).toEqual([{ type: "barrierOrderRepeated", between: ["vault", "hall"] }])
  })

  it("refuses an order on a floor that authors no layout at all", () => {
    const config = { ...twoGatesOnRouteFloor(), regionLayout: undefined }

    expect(faultsOf(config)).toEqual([
      { type: "barrierOrderNamesNoConnection", between: ["hall", "vault"] },
      { type: "obstacleNamesNoConnection", id: "ironDoor" },
      { type: "obstacleNamesNoConnection", id: "sandDoor" },
      { type: "controlUnsatisfied", id: "ironLever", what: "mouth" },
      { type: "controlUnsatisfied", id: "sandLever", what: "hall" },
    ])
  })

  // An obstacle is placed by its own `at`, so a defined gate can only stand nowhere by naming a
  // connection or region the layout does not have, and each of those is refused by name.
  it("refuses a gate defined on a connection the layout does not join, and a barrier over a region it does not have", () => {
    const config = twoGatesOnRouteFloor()
    config.obstacles = [
      { id: "lostDoor", kind: "gate", at: { on: "connection", between: ["mouth", "vault"] } },
      { id: "floodedNowhere", kind: "gate", at: { on: "region", region: "attic" } },
    ]
    config.controls = [
      {
        id: "lever",
        in: "mouth",
        states: ["off", "on"],
        initial: "off",
        returnsToInitial: true,
        opens: { on: ["lostDoor", "floodedNowhere"] },
      },
    ]
    config.barrierOrder = undefined

    expect(faultsOf(config)).toEqual([
      { type: "obstacleNamesNoConnection", id: "lostDoor" },
      { type: "obstacleNamesNoRegion", id: "floodedNowhere" },
    ])
  })

  it("refuses the floor before any wall is carved, with the same faults", () => {
    expect(refusedWith(withOrder(twoGatesOnRouteFloor, undefined))).toEqual([
      { type: "barrierUnordered", id: "ironDoor", between: ["hall", "vault"] },
      { type: "barrierUnordered", id: "sandDoor", between: ["hall", "vault"] },
    ])
  })

  it("requires the gate a fork-switch owns to be first from the fork's side, whichever end the order is written from", () => {
    const written = (between: [string, string], barriers: string[]) =>
      faultsOf(withOrder(forkSeamWithSecondGateFloor, [{ between, barriers }]))

    expect(written(["entrance", "rightLower"], ["forkRight", "extraRight"])).toEqual([])
    expect(written(["rightLower", "entrance"], ["extraRight", "forkRight"])).toEqual([])
    expect(written(["entrance", "rightLower"], ["extraRight", "forkRight"])).toEqual([
      { type: "forkGateNotFirst", id: "forkRight", owner: "Y", between: ["entrance", "rightLower"] },
    ])
    expect(written(["rightLower", "entrance"], ["forkRight", "extraRight"])).toEqual([
      { type: "forkGateNotFirst", id: "forkRight", owner: "Y", between: ["rightLower", "entrance"] },
    ])
  })
})

describe(seatBarrierRun, () => {
  const labels = ["a", "a", "b", "b", "b", "b", "c"]

  it("stands the gate nearest the way in on the seam and the rest on later free steps of the far region", () => {
    expect(seatBarrierRun(labels, ["a", "b"], 3, () => true)).toEqual([2, 3, 4])
  })

  it("skips steps something else holds, so content may fall between two gates", () => {
    expect(seatBarrierRun(labels, ["a", "b"], 2, step => step !== 3)).toEqual([2, 4])
  })

  it("answers the steps from the first region named, whichever way the route runs", () => {
    expect(seatBarrierRun(labels, ["b", "a"], 3, () => true)).toEqual([4, 3, 2])
  })

  it("answers nothing when the far region cannot hold every gate, never spilling into the next region", () => {
    expect(seatBarrierRun(labels, ["a", "b"], 5, () => true)).toBeUndefined()
  })

  it("answers nothing for regions the path never joins", () => {
    expect(seatBarrierRun(labels, ["a", "c"], 2, () => true)).toBeUndefined()
  })
})

describe(barrierRuns, () => {
  it("orders a connection's gates by the stated order and leaves a lone gate as its own run", () => {
    const config = twoGatesOnRouteFloor()
    config.obstacles = [
      ...config.obstacles!,
      { id: "hallDoor", kind: "gate", at: { on: "connection", between: ["mouth", "hall"] } },
    ]

    const runs = barrierRuns(config.obstacles, [{ between: ["vault", "hall"], barriers: ["sandDoor", "ironDoor"] }])

    expect(runs.map(run => ({ between: run.between, gates: run.gates.map(gate => gate.id) }))).toEqual([
      { between: ["vault", "hall"], gates: ["sandDoor", "ironDoor"] },
      { between: ["mouth", "hall"], gates: ["hallDoor"] },
    ])
  })
})

type Case = {
  name: string
  make: () => FloorConfig
  seeds: number[]
  runs: { between: [string, string]; gates: string[] }[]
  /** Whether the way in reaches the first region of each run's `between` before the second. */
  enteredFirst: boolean
}

const CASES: Case[] = [
  {
    name: "two gates on a connection the route threads",
    make: twoGatesOnRouteFloor,
    seeds: SEEDS,
    runs: [{ between: ["hall", "vault"], gates: ["ironDoor", "sandDoor"] }],
    enteredFirst: true,
  },
  {
    name: "the same two gates written from the far end",
    make: twoGatesOnRouteWrittenBackwardsFloor,
    seeds: SEEDS,
    runs: [{ between: ["vault", "hall"], gates: ["sandDoor", "ironDoor"] }],
    enteredFirst: false,
  },
  {
    name: "two gates on a connection of an off-route chain",
    make: twoGatesOffRouteFloor,
    seeds: SEEDS,
    runs: [{ between: ["annex", "cellar"], gates: ["wardDoor", "flameDoor"] }],
    enteredFirst: true,
  },
  {
    name: "a second gate after the one a fork-switch owns",
    make: forkSeamWithSecondGateFloor,
    seeds: FORK_SEEDS,
    runs: [{ between: ["entrance", "rightLower"], gates: ["forkRight", "extraRight"] }],
    enteredFirst: true,
  },
]

// Steps from one cell to every cell a player could reach with every door standing open.
const distancesFrom = (grid: FloorGrid, start: readonly [number, number]): Map<string, number> => {
  const seen = new Map([[at(start[0], start[1]), 0]])
  const queue: [number, number][] = [[start[0], start[1]]]
  for (let n = 0; n < queue.length; n++)
    for (const [r, c] of stepsFrom(grid, ...queue[n]))
      if (!seen.has(at(r, c))) {
        seen.set(at(r, c), seen.get(at(...queue[n]))! + 1)
        queue.push([r, c])
      }
  return seen
}

// The ground a door touches on each side, as the lock compiles it: one compiled region per side.
const groundsBeside = (grid: FloorGrid, of: Map<string, string>, door: { r: number; c: number }) =>
  new Set(stepsFrom(grid, door.r, door.c).map(([r, c]) => of.get(at(r, c))!))

describe.each(CASES)("barriers carved for $name", ({ make, seeds, runs, enteredFirst }) => {
  let carved: Carved[] = []
  beforeAll(() => {
    carved = carveAll(make, seeds)
  }, 120_000)

  it("carves on at least one seed", () => {
    expect(carved.length).toBeGreaterThan(0)
  })

  it("stands the gates along the seam in the stated order, from the first region to the second", () => {
    for (const { seed, grid } of carved)
      for (const { between, gates } of runs) {
        const { of } = regionsOf(grid)
        const doors = gates.map(id => doorOf(grid, id))
        // Each gate is joined to the next by ground of its own.
        for (let i = 0; i + 1 < doors.length; i++) {
          const shared = [...groundsBeside(grid, of, doors[i])].filter(id =>
            groundsBeside(grid, of, doors[i + 1]).has(id)
          )
          expect(shared, `seed ${seed}, ${gates[i]} to ${gates[i + 1]}`).toHaveLength(1)
        }
        // The way in is on the first region's side, so the gates stand ever further from it in the order stated.
        const from = distancesFrom(grid, grid.entrancePos)
        const walked = doors.map(({ r, c }) => from.get(at(r, c))!)
        const outwards = enteredFirst ? [...walked] : [...walked].reverse()
        expect(outwards, `seed ${seed}: ${between.join(" to ")}`).toEqual([...outwards].sort((a, b) => a - b))
        expect(new Set(walked).size, `seed ${seed}`).toBe(walked.length)
      }
  })

  it("leaves at least one walkable non-door cell between consecutive gates, and ground on each side of every gate", () => {
    for (const { seed, grid } of carved)
      for (const { gates } of runs) {
        const { of } = regionsOf(grid)
        const doors = gates.map(id => doorOf(grid, id))
        for (const door of doors) expect(groundsBeside(grid, of, door).size, `seed ${seed}`).toBe(2)
        for (let i = 0; i + 1 < doors.length; i++) {
          const [stretch] = [...groundsBeside(grid, of, doors[i])].filter(id =>
            groundsBeside(grid, of, doors[i + 1]).has(id)
          )
          const cells = [...of].filter(([, id]) => id === stretch).map(([key]) => key)
          expect(cells.length, `seed ${seed}`).toBeGreaterThanOrEqual(1)
          for (const key of cells) {
            const [r, c] = key.split(",").map(Number)
            expect(
              grid.cells[r][c].type === "room" ? (grid.cells[r][c] as RoomCell).requiredKeyId : undefined
            ).toBeUndefined()
          }
        }
      }
  })

  it("compiles the stretch between two gates as a region of its own that the solver walks between them", () => {
    for (const { seed, grid } of carved)
      for (const { gates } of runs) {
        const lock = floorLock(grid)!
        const { of } = regionsOf(grid)
        const doors = gates.map(id => doorOf(grid, id))
        const doorRegion = ([r, c]: [number, number]) => `door ${r},${c}`
        for (let i = 0; i + 1 < doors.length; i++) {
          const [stretch] = [...groundsBeside(grid, of, doors[i])].filter(id =>
            groundsBeside(grid, of, doors[i + 1]).has(id)
          )
          const outer = doorRegion([doors[i].r, doors[i].c])
          const inner = doorRegion([doors[i + 1].r, doors[i + 1].c])

          expect(lock.regions, `seed ${seed}`).toContain(stretch)
          expect(lock.gates[`${outer}|${stretch}`], `seed ${seed}`).toBeDefined()
          expect(lock.gates[`${inner}|${stretch}`], `seed ${seed}`).toBeDefined()
          const beforeOuter = [...groundsBeside(grid, of, doors[i])].find(id => id !== stretch)!
          const beyondInner = [...groundsBeside(grid, of, doors[i + 1])].find(id => id !== stretch)!
          expect(new Set([beforeOuter, stretch, beyondInner]).size, `seed ${seed}`).toBe(3)
        }
      }
  })

  it("gives every gate a slot of its own named for its authored id", () => {
    for (const { seed, grid } of carved)
      for (const { gates } of runs) {
        const slots = gates.map(id => {
          const { r, c } = doorOf(grid, id)
          return cellSlot(grid, r, c)
        })
        expect(slots, `seed ${seed}`).toEqual(gates.map(id => `xobstacle:${id}`))
      }
  })
})

describe("what the carve distributes between two barriers", () => {
  it("lets a puzzle or chest stand between two gates on at least one seed, the carve's to place", () => {
    const between = carveAll(twoGatesOnRouteFloor, SEEDS).flatMap(({ grid }) => {
      const { of } = regionsOf(grid)
      const doors = ["ironDoor", "sandDoor"].map(id => doorOf(grid, id))
      const [stretch] = [...groundsBeside(grid, of, doors[0])].filter(id => groundsBeside(grid, of, doors[1]).has(id))
      return rooms(grid).filter(
        ({ r, c, cell }) =>
          of.get(at(r, c)) === stretch &&
          cell.roomType === "encounter" &&
          cell.family !== undefined &&
          cell.requiredKeyId === undefined &&
          cell.mechanism === undefined
      )
    })

    expect(between.length).toBeGreaterThan(0)
  })
})

describe("a gate that follows another on its fork seam", () => {
  let carved: Carved[] = []
  beforeAll(() => {
    carved = carveAll(forkSeamWithSecondGateFloor, FORK_SEEDS)
  }, 120_000)

  it("leaves the fork-switch's rest and one state per seam, its gate still the one beside the junction", () => {
    expect(carved.length).toBeGreaterThan(0)
    for (const { seed, grid } of carved) {
      const junction = rooms(grid).find(({ cell }) => cell.mechanismId === "Y")!
      const { states } = junction.cell.mechanism!
      expect([states[0], [...states.slice(1)].sort()], `seed ${seed}`).toEqual([
        MECHANISM_AT_REST,
        [KEY("forkLeft"), KEY("forkRight")].sort(),
      ])
      const fork = doorOf(grid, "forkRight")
      // One node and its connector away: the junction's own seam, with nothing between.
      expect(distancesFrom(grid, [junction.r, junction.c]).get(at(fork.r, fork.c)), `seed ${seed}`).toBe(2)
    }
  })
})

describe("with the topology mod off", () => {
  const off = (config: FloorConfig): FloorConfig =>
    dropUnownedAuthoring(config, TOPOLOGY_OFF.modIds, TOPOLOGY_OFF.resolveEncounter) as unknown as FloorConfig
  const assembleOff = (config: FloorConfig, seed: number) =>
    assembleFloor("test", off(config), seed, TOPOLOGY_OFF.resolveEncounter, {
      resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
    })

  it("keeps the order with the obstacles: gates and their order are core authoring", () => {
    const kept = off(twoGatesOnRouteFloor())

    expect([kept.obstacles, kept.controls, kept.barrierOrder]).toEqual([
      twoGatesOnRouteFloor().obstacles,
      twoGatesOnRouteFloor().controls,
      twoGatesOnRouteFloor().barrierOrder,
    ])
  })

  it("refuses the floor by name for the levers whose realisation left, instead of carving it without its doors", () => {
    const result = assembleOff(twoGatesOnRouteFloor(), 1)

    expect(result.success).toBe(false)
    expect(!result.success && result.reasons).toEqual([
      { type: "realisationMissing", mechanic: "ironLever", kind: "toggle", realisation: "default-control" },
      { type: "realisationMissing", mechanic: "sandLever", kind: "toggle", realisation: "default-control" },
    ])
  })

  it("keeps the order with them when the mod is registered", () => {
    const kept = dropUnownedAuthoring(twoGatesOnRouteFloor(), new Set(["topology"]), undefined)

    expect(kept.barrierOrder).toEqual(twoGatesOnRouteFloor().barrierOrder)
  })

  it("never carves other walls than the mod on does: identical, or refused by name", () => {
    const outcomes = new Set<string>()
    for (const make of [twoGatesOnRouteFloor, twoGatesOffRouteFloor])
      for (const seed of SEEDS) {
        const outcome = outcomeOf(assembleFloor("test", make(), seed, resolveEncounter), assembleOff(make(), seed))
        if (outcome.kind === "notCarvedWithMod") continue
        expect(outcome.kind === "identical" || isRealisationRefusal(outcome), `seed ${seed}`).toBe(true)
        outcomes.add(outcome.kind)
      }
    expect([...outcomes]).toEqual(["refused"])
  })
})

// Seven gates fit no carve however wide, so a few attempts say as much as sixty without the minutes.
const FEW_ATTEMPTS = { maxAttempts: 3 }

describe("a connection whose gates cannot all be seated", () => {
  const crowded = (
    count: number,
    sideSections: FloorConfig["sideSections"],
    between: [string, string],
    inRegion: string
  ): FloorConfig => {
    const ids = Array.from({ length: count }, (_, i) => `door${i}`)
    return {
      ...twoGatesOnRouteFloor(),
      pathPuzzles: 0,
      sideSections,
      regionLayout:
        sideSections.length === 0 ? twoGatesOnRouteFloor().regionLayout : twoGatesOffRouteFloor().regionLayout,
      obstacles: ids.map(id => ({ id, kind: "gate" as const, at: { on: "connection" as const, between } })),
      controls: [
        {
          id: "lever",
          in: inRegion,
          states: ["off", "on"],
          initial: "off",
          returnsToInitial: true,
          opens: { on: ids },
        },
      ],
      barrierOrder: [{ between, barriers: ids }],
    }
  }

  it("is refused naming the connection and the barriers in the order stated, on the route", () => {
    const reasons = assembleFloor("test", crowded(7, [], ["hall", "vault"], "mouth"), 1, resolveEncounter, FEW_ATTEMPTS)

    expect(reasons.success).toBe(false)
    expect(!reasons.success && reasons.reasons).toContainEqual({
      type: "barriersNotSeated",
      between: ["hall", "vault"],
      barriers: ["door0", "door1", "door2", "door3", "door4", "door5", "door6"],
    })
  })

  it("is refused the same way on an off-route chain", () => {
    const sideSections = [{ pathPuzzles: 3, difficulty: "expert" as const, end: "treasure" as const }]
    const reasons = assembleFloor(
      "test",
      crowded(7, sideSections, ["annex", "cellar"], "mouth"),
      1,
      resolveEncounter,
      FEW_ATTEMPTS
    )

    expect(reasons.success).toBe(false)
    expect(!reasons.success && reasons.reasons).toContainEqual({
      type: "barriersNotSeated",
      between: ["annex", "cellar"],
      barriers: ["door0", "door1", "door2", "door3", "door4", "door5", "door6"],
    })
  })
})

describe("a single gate on each connection", () => {
  it("keeps its slot and needs no stated order", () => {
    const result = assembleFloor("test", andDoorFloor(), 1, resolveEncounter)

    expect(result.success).toBe(true)
    if (!result.success) return
    const door = rooms(result.grid).find(({ cell }) => cell.requiredKeyId === KEY("vaultDoor"))!
    expect(cellSlot(result.grid, door.r, door.c)).toBe("xobstacle:vaultDoor")
  })
})
