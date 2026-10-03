import { describe, expect, it } from "vitest"
import { expandFloorLocks } from "./floorLocks"
import type { PlacedLock } from "./floorLocks"
import { placeContentOnRoute, planToLay, seatLaidFloor } from "./laidFloor"
import type { LaidFloor } from "./laidFloor"
import { layLockPlan, startingGridSize } from "./layLocks"
import { planLockFloor } from "./lockPlan"
import type { LockPlan } from "./lockPlan"
import type { RegionAppetite } from "./regions"
import type { FloorConfig } from "./siteTypes"
import { leverLock } from "./testSupport/floorLockFixtures"
import { BINDING, doubleBackLock, sluiceLock } from "./testSupport/lockFixtures"

const planOf = (locks: PlacedLock[]): LockPlan => {
  const floor: FloorConfig = {
    pathPuzzles: 2,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [],
    realisations: BINDING,
    locks,
  }
  const result = expandFloorLocks(floor)
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.reasons)}`)
  return planLockFloor(result)!
}

const FREE = new Map<string, RegionAppetite>()
const WANTS = { content: [] as Array<"puzzle" | "reward">, appetite: FREE }

const seated = (plan: LockPlan, seed: number, content: Array<"puzzle" | "reward"> = []): LaidFloor => {
  const toLay = planToLay(plan, { content, appetite: FREE })
  const result = layLockPlan(toLay, { seed, n: startingGridSize(toLay) })
  if (!result.ok) throw new Error("did not lay")
  return seatLaidFloor(plan, result.laid)
}

const SEEDS = Array.from({ length: 8 }, (_, i) => i + 1)
const rc = (cell: string) => cell.split(",").map(Number)
const apart = (a: string, b: string) => Math.abs(rc(a)[0] - rc(b)[0]) + Math.abs(rc(a)[1] - rc(b)[1])

describe("the plan the carve asks to be laid", () => {
  it("holds a node on a corridor for each door on it and none for a corridor that carries none", () => {
    const plan = planToLay(planOf([{ lock: doubleBackLock() }]), WANTS)
    for (const corridor of plan.corridors) expect(corridor.minNodes).toBe(corridor.barriers.length)
  })

  it("moves the doors of a region barrier onto the corridors that enter the region, so the region keeps no node for them", () => {
    const original = planOf([{ lock: sluiceLock() }])
    const plan = planToLay(original, WANTS)
    const hall = plan.regions.find(region => region.id === "sluice.hall")!
    expect(original.regions.find(region => region.id === "sluice.hall")!.minNodes).toBe(2)
    expect(hall.minNodes).toBe(1)
    const entering = plan.corridors.filter(corridor => [corridor.from, corridor.to].includes("sluice.hall"))
    expect(entering.map(corridor => corridor.minNodes)).toEqual([1, 1])
  })

  it("gives the route a spare node for each piece of the floor's own content", () => {
    const original = planOf([{ lock: leverLock() }])
    const spare = (content: Array<"puzzle" | "reward">) =>
      planToLay(original, { content, appetite: FREE })
        .regions.filter(region => original.route.slice(1, -1).includes(region.id))
        .reduce((sum, region) => sum + region.minNodes - region.seats.length, 0)
    expect(spare([])).toBeLessThan(3)
    expect(spare(["puzzle", "puzzle", "reward"])).toBeGreaterThanOrEqual(3)
  })

  it("puts that room only in regions whose appetite takes the content", () => {
    const original = planOf([{ lock: leverLock() }])
    const appetite = new Map<string, RegionAppetite>([
      ["lever.foyer", "nothing"],
      ["lever.hall", "puzzles"],
      ["lever.landing", "reward"],
    ])
    const grown = planToLay(original, { content: ["puzzle", "puzzle", "puzzle"], appetite })
    const minimum = (id: string) => grown.regions.find(region => region.id === id)!.minNodes
    expect(minimum("lever.foyer")).toBe(1)
    expect(minimum("lever.hall")).toBeGreaterThan(1)
    expect(minimum("lever.landing")).toBe(1)
  })
})

describe("the laid floor as the carve seats rooms on it", () => {
  it("stands every door of a gate on a node of its own corridor, strictly between the two stretches it shuts", () => {
    const plan = planOf([{ lock: doubleBackLock() }])
    for (const seed of SEEDS) {
      const floor = seated(plan, seed)
      const chain = (cell: string) => floor.label.get(cell)
      expect(floor.gateDoor.size).toBe(plan.corridors.flatMap(corridor => corridor.barriers).length)
      for (const [id, cell] of floor.gateDoor) {
        const corridor = plan.corridors.find(candidate => candidate.barriers.includes(id))!
        expect([corridor.from, corridor.to]).toContain(chain(cell))
        expect(floor.doors.has(cell)).toBe(true)
        expect(floor.ground.get(cell)).toBe(`door ${cell}`)
      }
    }
  }, 60_000)

  it("puts the door of each arm on the cell beside the junction", () => {
    const plan = planOf([{ lock: doubleBackLock() }])
    for (const seed of SEEDS) {
      const floor = seated(plan, seed)
      const [junction] = floor.junctions
      expect(junction.arms).toHaveLength(2)
      for (const arm of junction.arms) {
        expect(apart(arm.first, junction.cell)).toBe(2)
        expect([...floor.gateDoor.values()]).toContain(arm.first)
      }
    }
  })

  it("seats a region barrier's door beside the region on the corridor from each entrance", () => {
    const plan = planOf([{ lock: sluiceLock() }])
    for (const seed of SEEDS) {
      const floor = seated(plan, seed)
      const doors = floor.regionDoors.map(door => `${door.barrier}@${door.entrance}`).sort()
      expect(doors).toEqual([
        "sluice.floodedHall@sluice.annex",
        "sluice.floodedHall@sluice.pumpRoom",
        "sluice.floodedVault@sluice.pumpRoom",
      ])
      for (const door of floor.regionDoors) expect(floor.doors.has(door.cell)).toBe(true)
    }
  })

  it("labels the route by the regions it threads, in the plan's order, and reserves its doors and junction", () => {
    const plan = planOf([{ lock: doubleBackLock() }])
    for (const seed of SEEDS) {
      const floor = seated(plan, seed)
      expect(floor.routeLabels.filter((label, i, all) => label !== all[i - 1])).toEqual(plan.route)
      const [junction] = floor.junctions
      expect(floor.reserved.has(junction.step)).toBe(true)
      for (const cell of floor.doors) {
        const step = floor.route.findIndex(([r, c]) => `${r},${c}` === cell)
        if (step >= 0) expect(floor.reserved.has(step)).toBe(true)
      }
    }
  })

  it("keeps every off-route node in exactly one chain, hung from a node that is already laid", () => {
    const plan = planOf([{ lock: doubleBackLock() }])
    for (const seed of SEEDS) {
      const floor = seated(plan, seed)
      const route = new Set(floor.route.map(([r, c]) => `${r},${c}`))
      const offRoute = [...floor.label.keys()].filter(cell => !route.has(cell))
      const inChains = floor.chains.flatMap(chain => chain.cells.map(([r, c]) => `${r},${c}`))
      expect(inChains.sort()).toEqual(offRoute.sort())
      for (const chain of floor.chains) {
        const from = `${chain.attachedAt![0]},${chain.attachedAt![1]}`
        expect(floor.label.has(from)).toBe(true)
        expect(apart(from, `${chain.cells[0][0]},${chain.cells[0][1]}`)).toBe(2)
      }
    }
  })

  it("splits ground at every door and at every change of region, so a leftover maze edge cannot cross either", () => {
    const plan = planOf([{ lock: doubleBackLock() }])
    for (const seed of SEEDS) {
      const floor = seated(plan, seed)
      const labelled = new Map<string, Set<string>>()
      for (const [cell, ground] of floor.ground)
        labelled.set(ground, (labelled.get(ground) ?? new Set()).add(floor.label.get(cell)!))
      for (const labels of labelled.values()) expect(labels.size).toBe(1)
    }
  })
})

describe("the route's own content", () => {
  const lever = planOf([{ lock: leverLock() }])

  it("ends on the goal, off every reserved step, in as many places as the floor has content", () => {
    for (const seed of SEEDS) {
      const floor = seated(lever, seed, ["puzzle", "puzzle", "reward"])
      const wanted = [3, 4, 5]
      const placed = placeContentOnRoute(floor, wanted, { leverFirst: false, appetite: FREE })!
      expect(placed).toHaveLength(3)
      expect(new Set(placed).size).toBe(3)
      expect([...placed].sort((a, b) => a - b)).toEqual(placed)
      for (const step of placed) {
        expect(floor.reserved.has(step)).toBe(false)
        expect(step).toBeGreaterThan(0)
        expect(step).toBeLessThan(floor.route.length - 1)
      }
    }
  })

  // Two stretches of three free steps each: one takes puzzles only, the next a reward only.
  const stretches = {
    route: Array.from({ length: 8 }, (_, i): [number, number] => [0, 2 * i]),
    routeLabels: ["entrance", "hall", "hall", "hall", "vault", "vault", "vault", "exit"],
    reserved: new Set<number>(),
    seatDemand: new Map<string, number>(),
  }
  const appetite = new Map<string, RegionAppetite>([
    ["hall", "puzzles"],
    ["vault", "reward"],
  ])

  it("puts puzzles only where the region takes a puzzle and the goal only where it takes a reward", () => {
    // Both puzzles were spread into the vault, which takes none.
    const placed = placeContentOnRoute(stretches, [4, 5, 6], { leverFirst: false, appetite })!
    expect(placed.map(step => stretches.routeLabels[step])).toEqual(["hall", "hall", "vault"])
    expect(placed[placed.length - 1]).toBe(6)
  })

  it("lets a lever stand in any region, because it holds neither a puzzle nor a reward", () => {
    const placed = placeContentOnRoute(stretches, [5, 2, 6], { leverFirst: true, appetite })!
    expect(placed).toEqual([2, 5, 6])
  })

  it("leaves a region the nodes its mechanics will seat on", () => {
    const seated = { ...stretches, seatDemand: new Map([["hall", 2]]) }
    expect(placeContentOnRoute(seated, [1, 2, 6], { leverFirst: false, appetite })).toBeUndefined()
    expect(placeContentOnRoute(seated, [1, 6], { leverFirst: false, appetite })).toEqual([1, 6])
  })

  it("refuses a route with no step left for the content rather than crowd a region's seats", () => {
    const floor = seated(lever, 1)
    const slots = Array.from({ length: floor.route.length }, (_, i) => i + 1)
    expect(placeContentOnRoute(floor, slots, { leverFirst: false, appetite: FREE })).toBeUndefined()
  })
})
