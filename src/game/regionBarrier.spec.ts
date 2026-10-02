import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { Direction, FloorConfig, FloorGrid, GridCell, RoomCell } from "./siteTypes"
import { cellSlot } from "./cellSlot"
import { floorLock, regionsOf } from "./floorLock"
import { deadRegions, reachableStates, walkLock } from "./lockWalk"
import { openDoorsFor, openWaysOut } from "./mechanismDoors"
import { seatBarrierDoors, topologyFaults } from "./obstacles"
import type { Control, Obstacle, RegionGateObstacle } from "./obstacles"
import type { RegionGraph } from "./regions"
import { forkSwitchFloorConfig } from "./testSupport/forkSwitchFixtures"
import { soloLeverDoorFloor } from "./testSupport/gateFaceFixtures"
import { offRouteSluiceFloor, onRouteSluiceFloor } from "./testSupport/regionBarrierFixtures"

const SEEDS = Array.from({ length: 12 }, (_, n) => (n + 1) * 7919)
const KEY = (id: string) => `obstacle:test#0#0:${id}`
const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const BACK: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }
const at = (r: number, c: number) => `${r},${c}`

const carved = (make: () => FloorConfig): FloorGrid[] =>
  SEEDS.flatMap(seed => {
    const result = assembleFloor("test", make(), seed)
    return result.success ? [result.grid] : []
  })

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

const doorsOf = (grid: FloorGrid, id: string) =>
  rooms(grid).filter(({ cell }) => cell.requiredKeyId === KEY(id) && cell.regionBarrier !== undefined)

// Everything the player reaches from `from` without standing on a cell in `shut`.
const flood = (grid: FloorGrid, from: [number, number], shut: ReadonlySet<string>): Set<string> => {
  const seen = new Set([at(...from)])
  const queue = [from]
  for (let n = 0; n < queue.length; n++)
    for (const [r, c] of stepsFrom(grid, ...queue[n])) {
      if (shut.has(at(r, c)) || seen.has(at(r, c))) continue
      seen.add(at(r, c))
      queue.push([r, c])
    }
  return seen
}

const isNode = (grid: FloorGrid, r: number, c: number) =>
  r % 2 === grid.entrancePos[0] % 2 && c % 2 === grid.entrancePos[1] % 2

// Every region's connections to H in the layout: the entrances a barrier on H has.
const entrancesOf = (layout: RegionGraph, region: string): string[] =>
  layout.connections.flatMap(([a, b]) => (a === region ? [b] : b === region ? [a] : [])).sort()

const BARRIERS: { name: string; make: () => FloorConfig; id: string; region: string }[] = [
  { name: "an off-route hall with two entrances", make: offRouteSluiceFloor, id: "floodedHall", region: "hall" },
  { name: "an off-route vault with one entrance", make: offRouteSluiceFloor, id: "floodedVault", region: "vault" },
  { name: "an on-route hall with two entrances", make: onRouteSluiceFloor, id: "floodedHall", region: "hall" },
]

describe.each(BARRIERS)("a region barrier on $name", ({ make, id, region }) => {
  const grids = carved(make)
  const layout = make().regionLayout!

  it("carves on at least one seed", () => {
    expect(grids.length).toBeGreaterThan(0)
  })

  it("stands one door inside the region for every entrance it has", () => {
    for (const grid of grids) {
      const doors = doorsOf(grid, id)

      expect(doors.map(({ cell }) => cell.regionBarrier!.entrance).sort()).toEqual(entrancesOf(layout, region))
      expect(doors.map(({ cell }) => cell.region)).toEqual(doors.map(() => region))
      expect(doors.map(({ cell }) => cell.regionBarrier!.region)).toEqual(doors.map(() => region))
    }
  })

  it("gives every door of one barrier the one key and a slot of its own", () => {
    for (const grid of grids) {
      const doors = doorsOf(grid, id)
      const slots = doors.map(({ r, c }) => cellSlot(grid, r, c))

      expect(new Set(slots).size).toBe(doors.length)
      expect(slots.sort()).toEqual(entrancesOf(layout, region).map(entrance => `xobstacle:${id}@${entrance}`))
    }
  })

  it("shows the first stretch of the region before each door and no door at the join itself", () => {
    for (const grid of grids) {
      const doors = doorsOf(grid, id)
      const shut = new Set(doors.map(({ r, c }) => at(r, c)))
      for (const { r, c, cell } of doors) {
        const entrance = cell.regionBarrier!.entrance
        // The join: a cell of the neighbouring region the player steps from onto one of the barred region.
        const joins = grid.cells.flatMap((row, jr) =>
          row.flatMap((from, jc) =>
            walkable(from) && (from as { region?: string }).region === entrance
              ? stepsFrom(grid, jr, jc)
                  .filter(([nr, nc]) => (grid.cells[nr][nc] as { region?: string }).region === region)
                  .map(([nr, nc]) => [jr, jc, nr, nc] as const)
              : []
          )
        )
        const stretch = joins.map(([jr, jc]) => flood(grid, [jr, jc], shut))
        const door = at(r, c)

        // Exactly one stretch touches this door, it holds at least one node of the region, and the
        // join itself is not the door.
        const touching = stretch.filter(cells => stepsFrom(grid, r, c).some(([nr, nc]) => cells.has(at(nr, nc))))
        expect(touching.length).toBeGreaterThan(0)
        for (const cells of touching) {
          const regionNodes = [...cells].filter(key => {
            const [kr, kc] = key.split(",").map(Number)
            return (grid.cells[kr][kc] as { region?: string }).region === region && isNode(grid, kr, kc)
          })
          expect(regionNodes.length).toBeGreaterThanOrEqual(1)
          expect(cells.has(door)).toBe(false)
        }
      }
    }
  })

  it("walks sound: every reachable state can still reach the way out", () => {
    for (const grid of grids) {
      const lock = floorLock(grid)!

      expect(walkLock(lock).sound).toBe(true)
      expect(deadRegions(lock)).toEqual([])
    }
  })
})

describe("a shut region barrier", () => {
  // `dry` shuts floodedHall, `wet` shuts floodedVault: the sluice's own two states.
  it.each([
    { make: offRouteSluiceFloor, state: "dry", shuts: "floodedHall", region: "hall" },
    { make: offRouteSluiceFloor, state: "wet", shuts: "floodedVault", region: "vault" },
    { make: onRouteSluiceFloor, state: "dry", shuts: "floodedHall", region: "hall" },
  ])(
    "puts exactly the ground behind its doors out of reach while the sluice is $state",
    ({ make, state, shuts, region }) => {
      const grids = carved(make)
      expect(grids.length).toBeGreaterThan(0)
      for (const grid of grids) {
        const lock = floorLock(grid)!
        const found = reachableStates(lock)
        if (found === "tooLarge") throw new Error("lock too large")
        const sluice = Object.keys(lock.mechanisms).find(name => lock.mechanisms[name].states.includes("dry"))!
        const { of } = regionsOf(grid)
        const shut = new Set(doorsOf(grid, shuts).map(({ r, c }) => at(r, c)))
        // The cells' own walk with only this barrier's doors held shut, read through the lock's region names.
        const reachable = [...flood(grid, grid.entrancePos as [number, number], shut)].map(key => of.get(key)!)
        const standing = found.order.filter(s => s.config[sluice] === state).map(s => s.region)

        expect([...new Set(standing)].sort()).toEqual([...new Set(reachable)].sort())
        // And the barred region really does have ground beyond its doors.
        const cutOff = grid.cells.flatMap((row, r) =>
          row.flatMap((cell, c) =>
            walkable(cell) && (cell as { region?: string }).region === region && !reachable.includes(of.get(at(r, c))!)
              ? [at(r, c)]
              : []
          )
        )
        expect(cutOff.length).toBeGreaterThan(0)
      }
    }
  )
})

describe("an open region barrier", () => {
  it("hands its doors back as ground walked without a prompt, and keeps the shut barrier's doors", () => {
    for (const grid of carved(offRouteSluiceFloor)) {
      // The sluice starts dry: floodedVault stands open, floodedHall stays shut.
      const open = openDoorsFor(grid, 0, new Map())
      const walked = openWaysOut(grid, open)

      expect([...open]).toEqual([KEY("floodedVault")])
      for (const { r, c } of doorsOf(grid, "floodedVault")) {
        const cell = walked.cells[r][c]
        expect(cell.type).toBe("corridor")
        expect(cell.type === "corridor" && [...cell.dirs].sort()).toEqual(
          [...(grid.cells[r][c] as RoomCell).dirs].sort()
        )
      }
      for (const { r, c } of doorsOf(grid, "floodedHall")) expect(walked.cells[r][c].type).toBe("room")
    }
  })
})

describe("the slots of gate doors", () => {
  it("keeps an edge gate's slot as the authored id alone", () => {
    const result = assembleFloor("test", soloLeverDoorFloor(), 7919)
    if (!result.success) throw new Error(JSON.stringify(result.reasons))
    const gate = rooms(result.grid).find(({ cell }) => cell.requiredKeyId === KEY("vaultDoor"))!

    expect(cellSlot(result.grid, gate.r, gate.c)).toBe("xobstacle:vaultDoor")
  })
})

const regions = (names: string[]): RegionGraph["regions"] => names.map(name => ({ name, appetite: "free" as const }))
const layout: RegionGraph = {
  regions: regions(["mouth", "hall", "vault", "cellar"]),
  connections: [
    ["mouth", "hall"],
    ["hall", "vault"],
    ["hall", "cellar"],
  ],
  in: "mouth",
  out: "vault",
}
const barrier = (id: string, region: string, owners?: string[]): RegionGateObstacle => ({
  id,
  kind: "gate",
  at: { on: "region", region },
  ...(owners ? { owners } : {}),
})
const edge = (id: string, between: [string, string]): Obstacle => ({
  id,
  kind: "gate",
  at: { on: "connection", between },
})
const toggle = (id: string, region: string, opens: Record<string, string[]>): Control => ({
  id,
  in: region,
  states: ["dry", "wet"],
  initial: "dry",
  returnsToInitial: true,
  opens,
})

describe("a region barrier that is refused where it is written", () => {
  it("refuses a barrier on the region the lock is entered through", () => {
    const faults = topologyFaults(layout, [barrier("b", "mouth")], [toggle("s", "hall", { wet: ["b"] })])

    expect(faults).toEqual([{ type: "regionBarrierHoldsPort", id: "b", region: "mouth", port: "in" }])
  })

  it("refuses a barrier on the region the lock is left through", () => {
    const faults = topologyFaults(layout, [barrier("b", "vault")], [toggle("s", "hall", { wet: ["b"] })])

    expect(faults).toEqual([{ type: "regionBarrierHoldsPort", id: "b", region: "vault", port: "out" }])
  })

  it("refuses a barrier on a region the layout does not have", () => {
    const faults = topologyFaults(layout, [barrier("b", "attic")], [toggle("s", "mouth", { wet: ["b"] })])

    expect(faults).toEqual([{ type: "obstacleNamesNoRegion", id: "b" }])
  })

  it("refuses a barrier on a floor that authors no layout", () => {
    expect(topologyFaults(undefined, [barrier("b", "hall")], [])).toEqual([{ type: "obstacleNamesNoRegion", id: "b" }])
  })

  it("refuses a barrier no control opens in any state", () => {
    const faults = topologyFaults(layout, [barrier("b", "hall")], [toggle("s", "mouth", { dry: [], wet: [] })])

    expect(faults).toEqual([{ type: "obstacleUnowned", id: "b" }])
  })

  it("refuses an id used twice across a barrier and a gate", () => {
    const faults = topologyFaults(
      layout,
      [barrier("b", "hall"), edge("b", ["hall", "vault"])],
      [toggle("s", "mouth", { wet: ["b"] })]
    )

    expect(faults).toEqual([{ type: "obstacleIdRepeated", id: "b" }])
  })

  it("refuses a control that stands in the region it bars, in whichever state it names the barrier", () => {
    const wet = topologyFaults(layout, [barrier("b", "hall")], [toggle("s", "hall", { dry: [], wet: ["b"] })])
    const dry = topologyFaults(layout, [barrier("b", "hall")], [toggle("s", "hall", { dry: ["b"], wet: [] })])

    expect(wet).toEqual([{ type: "mechanicStandsInBarredRegion", id: "s", region: "hall", barrier: "b" }])
    expect(dry).toEqual(wet)
  })

  it("lets a control shut an edge behind itself, because it stays in reach to open it again", () => {
    const faults = topologyFaults(
      layout,
      [edge("g", ["hall", "vault"])],
      [toggle("s", "hall", { dry: ["g"], wet: [] })]
    )

    expect(faults).toEqual([])
  })

  it("refuses a barrier on a region a drop lands in, an entrance no barrier can stand across", () => {
    const faults = topologyFaults(
      layout,
      [barrier("b", "cellar"), { id: "d", kind: "oneWay", at: { on: "connection", between: ["mouth", "cellar"] } }],
      [toggle("s", "mouth", { wet: ["b"] })]
    )

    expect(faults).toEqual([{ type: "regionBarrierDropLands", id: "b", region: "cellar", drop: "d" }])
  })

  it("refuses a fork-switch owning a barrier, since its gates must be the seams of its junction", () => {
    const base = forkSwitchFloorConfig()
    const faults = topologyFaults(
      base.regionLayout,
      [...base.obstacles!, barrier("floodedChamber", "s1Chamber", ["Y"])],
      base.controls!,
      base.forks
    )

    expect(faults).toEqual([{ type: "gateOwnedOffSeam", id: "floodedChamber", owner: "Y" }])
  })

  it("refuses a floor whose control stands in the region it bars before carving anything", () => {
    const config = {
      ...offRouteSluiceFloor(),
      controls: [toggle("sluice", "hall", { dry: [], wet: ["floodedHall", "floodedVault"] })],
    }

    expect(assembleFloor("test", config, 7919)).toEqual({
      success: false,
      reasons: [{ type: "mechanicStandsInBarredRegion", id: "sluice", region: "hall", barrier: "floodedHall" }],
    })
  })

  it("refuses a floor barring its own way in before carving anything", () => {
    const config = {
      ...offRouteSluiceFloor(),
      obstacles: [barrier("floodedPump", "pumpRoom")],
      controls: [toggle("lever", "hall", { dry: [], wet: ["floodedPump"] })],
    }

    expect(assembleFloor("test", config, 7919)).toEqual({
      success: false,
      reasons: [{ type: "regionBarrierHoldsPort", id: "floodedPump", region: "pumpRoom", port: "in" }],
    })
  })
})

describe("a region barrier the carve cannot seat", () => {
  it("is refused by the barrier's own name when the budget ends before every entrance has a door", () => {
    const result = assembleFloor("test", onRouteSluiceFloor(), 7919, undefined, { maxAttempts: 1 })

    expect(result).toEqual({
      success: false,
      reasons: [{ type: "regionBarrierNotSeated", id: "floodedHall", region: "hall" }, { type: "layoutNotFound" }],
    })
  })
})

describe("the doors a barrier gets on one path", () => {
  const free = () => true

  it("seats one door per entrance, each with a step of the region in front of it", () => {
    const labels = ["in", "hall", "hall", "hall", "hall", "out"]

    expect(seatBarrierDoors(labels, "hall", free)).toEqual([
      { entrance: "in", step: 2 },
      { entrance: "out", step: 3 },
    ])
  })

  it("seats nothing when two entrances share one free step, rather than putting a door elsewhere", () => {
    const labels = ["in", "hall", "hall", "hall", "out"]

    expect(seatBarrierDoors(labels, "hall", free)).toBeUndefined()
  })

  it("skips a step something else claims and takes the next one in", () => {
    const labels = ["in", "hall", "hall", "hall", "hall", "hall", "out"]

    expect(seatBarrierDoors(labels, "hall", step => step !== 2)).toEqual([
      { entrance: "in", step: 3 },
      { entrance: "out", step: 4 },
    ])
  })

  it("never seats a door on the region's last step, where the far side would be the next region", () => {
    expect(seatBarrierDoors(["mouth", "vault", "vault"], "vault", free)).toBeUndefined()
  })
})
