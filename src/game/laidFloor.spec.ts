import { describe, expect, it } from "vitest"
import { expandFloorLocks } from "./floorLocks"
import type { PlacedLock } from "./floorLocks"
import {
  fillLaidFloor,
  lengthenPlan,
  lengtheningCandidates,
  placeContentOnRoute,
  planToLay,
  seatLaidFloor,
} from "./laidFloor"
import type { LaidFloor } from "./laidFloor"
import { layLockPlan, startingGridSize } from "./layLocks"
import { planLockFloor } from "./lockPlan"
import type { LockPlan } from "./lockPlan"
import { freeRegions } from "./lockAuthoring"
import { parseLock } from "./lockNotation"
import type { RegionAppetite } from "./regions"
import type { FloorConfig } from "./siteTypes"
import { leverLock } from "./testSupport/floorLockFixtures"
import { BINDING, mirrorForkLock, sluiceLock } from "./testSupport/lockFixtures"

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
    const plan = planToLay(planOf([{ lock: mirrorForkLock() }]), WANTS)
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

// Each test seats the mirrorFork at several seeds, ~2.5s here; CI runs 2-3x slower than the 5s default allows.
describe("the laid floor as the carve seats rooms on it", { timeout: 60_000 }, () => {
  it("stands every door of a gate on a node of its own corridor, strictly between the two stretches it shuts", () => {
    const plan = planOf([{ lock: mirrorForkLock() }])
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
  })

  it("puts the door of each arm on the cell beside the junction", () => {
    const plan = planOf([{ lock: mirrorForkLock() }])
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
    const plan = planOf([{ lock: mirrorForkLock() }])
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
    const plan = planOf([{ lock: mirrorForkLock() }])
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
    const plan = planOf([{ lock: mirrorForkLock() }])
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

// A straight route of nodes, one per entry of `labels`: the way in at its head, the way out at its tail.
const straight = (labels: string[]) => {
  const keys = labels.map((_, i) => `0,${2 * i}`)
  return {
    route: keys.map((key): [number, number] => key.split(",").map(Number) as [number, number]),
    routeLabels: labels,
    label: new Map(keys.map((key, i) => [key, labels[i]])),
    depth: new Map(keys.map((key, i) => [key, i])),
    open: new Set(keys),
    doors: new Set<string>(),
    junctions: [],
    drops: [],
    seatDemand: new Map<string, number>(),
  }
}

describe("the floor's side sections filled into the laid nodes", () => {
  const hall = straight(["entrance", "hall", "hall", "hall", "hall", "vault", "vault", "exit"])
  const appetite = new Map<string, RegionAppetite>([
    ["hall", "puzzles"],
    ["vault", "reward"],
  ])
  const cellsOf = (result: ReturnType<typeof fillLaidFloor>) => {
    if (!("placed" in result)) throw new Error(`missing ${JSON.stringify(result.missing)}`)
    return result.placed.map(place => place.cells)
  }
  const stepOf = (key: string) => Number(key.split(",")[1]) / 2

  it("stands a section's puzzles in walk order and its end room last", () => {
    const [cells] = cellsOf(
      fillLaidFloor(hall, new Set(), [{ section: 0, kinds: ["puzzle", "puzzle", "reward"] }], appetite)
    )
    const steps = cells.map(stepOf)
    expect([...steps].sort((a, b) => a - b)).toEqual(steps)
    expect(new Set(steps).size).toBe(3)
    expect(hall.routeLabels[steps[2]]).toBe("vault")
  })

  it("puts a room only in a region whose appetite takes its kind, though a refusing node lies nearer its spread", () => {
    // The vault nodes ahead of the hall are the nearest to where the puzzle is spread to.
    const floor = straight(["entrance", "vault", "vault", "hall", "hall", "vault", "exit"])
    const [cells] = cellsOf(fillLaidFloor(floor, new Set(), [{ section: 0, kinds: ["puzzle", "reward"] }], appetite))
    expect(cells.map(key => floor.label.get(key))).toEqual(["hall", "vault"])
  })

  it("never takes a door, a junction, a drop end, the way in, the way out or a node the main content has", () => {
    const keys = [...hall.label.keys()]
    const floor = {
      ...hall,
      doors: new Set([keys[1]]),
      junctions: [{ cell: keys[2] }] as never,
      drops: [{ from: keys[3], to: keys[6] }] as never,
    }
    const result = fillLaidFloor(floor, new Set([keys[4]]), [{ section: 0, kinds: ["reward"] }], appetite)
    // Of the vault's two nodes one is a drop end: the reward goes to the other.
    expect(cellsOf(result)).toEqual([[keys[5]]])
    const refused = fillLaidFloor(floor, new Set([keys[4]]), [{ section: 0, kinds: ["puzzle"] }], appetite)
    expect("missing" in refused).toBe(true)
  })

  it("leaves a region the nodes its mechanics will seat on", () => {
    const seats = { ...hall, seatDemand: new Map([["hall", 3]]) }
    const result = fillLaidFloor(seats, new Set(), [{ section: 0, kinds: ["puzzle", "puzzle"] }], appetite)
    expect(result).toEqual({ missing: [{ kind: "puzzle", open: false }] })
  })

  it("names the kinds of room that found no node, with the ground each asked for", () => {
    const result = fillLaidFloor(
      hall,
      new Set(),
      [
        { section: 0, kinds: ["puzzle", "puzzle", "puzzle", "puzzle", "puzzle"] },
        { section: 1, kinds: ["reward", "reward", "reward"], open: true },
      ],
      appetite
    )
    expect(result).toEqual({
      missing: [
        { kind: "puzzle", open: false },
        { kind: "reward", open: true },
      ],
    })
  })

  it("keeps a section that hosts a key on ground no door shuts", () => {
    const keys = [...hall.label.keys()]
    const shut = { ...hall, open: new Set(keys.slice(0, 3)) }
    const [cells] = cellsOf(fillLaidFloor(shut, new Set(), [{ section: 0, kinds: ["puzzle"], open: true }], appetite))
    expect(shut.open.has(cells[0])).toBe(true)
    const none = fillLaidFloor(shut, new Set(), [{ section: 0, kinds: ["reward"], open: true }], appetite)
    expect(none).toEqual({ missing: [{ kind: "reward", open: true }] })
  })

  it("packs from the way in when spreading the rooms along the walk would strand one", () => {
    const strand = straight(["entrance", "hall", "hall", "hall", "vault", "exit"])
    const [cells] = cellsOf(
      fillLaidFloor(strand, new Set(), [{ section: 0, kinds: ["puzzle", "puzzle", "puzzle"] }], appetite)
    )
    expect(cells.map(stepOf)).toEqual([1, 2, 3])
  })
})

describe("the stretch the carve lengthens when the laid nodes cannot take the content", () => {
  const region = (id: string, onRoute: boolean) => ({ id, onRoute, seats: [], minNodes: 1 })
  const corridor = (from: string, to: string, onRoute: boolean) => ({
    id: `${from}>${to}`,
    from,
    to,
    onRoute,
    barriers: [],
    minNodes: 0,
  })
  // A route A, B with a side stretch C off B, joined by a corridor each.
  const plan: LockPlan = {
    route: ["A", "B"],
    regions: [region("A", true), region("B", true), region("C", false)],
    corridors: [corridor("A", "B", true), corridor("B", "C", false)],
    junctions: [],
    drops: [],
    nested: [],
  }
  const stretches = (lengths: Record<string, number>) =>
    new Map(Object.entries(lengths).map(([part, length]) => [part, Array.from({ length }, (_, i) => `${part}:${i}`)]))
  const laid = (lengths: Record<string, number>, open: string[] = []) => ({
    stretches: stretches(lengths),
    open: new Set(open),
  })
  const FLAT = { "region:A": 2, "region:B": 2, "region:C": 2, "corridor:A>B": 2, "corridor:B>C": 2 }
  const ids = (found: ReturnType<typeof lengtheningCandidates>) => found.map(({ kind, id }) => `${kind}:${id}`)
  const puzzle = [{ kind: "puzzle" as const, open: false }]

  it("prefers a stretch off the route to one on it, since a route node lengthens every walk past it", () => {
    const found = lengtheningCandidates(plan, laid(FLAT), puzzle, new Map())
    expect(ids(found).slice(0, 2).sort()).toEqual(["corridor:B>C", "region:C"])
    expect(found[0].cost[1]).toBe(0)
    expect(found[found.length - 1].cost[1]).toBe(1)
  })

  it("prefers a stretch that takes everything missing to one that takes only some of it", () => {
    const appetite = new Map<string, RegionAppetite>([
      ["C", "puzzles"],
      ["A", "free"],
    ])
    const missing = [
      { kind: "puzzle" as const, open: false },
      { kind: "reward" as const, open: false },
    ]
    const [first] = lengtheningCandidates(plan, laid(FLAT), missing, appetite)
    expect(first.id).not.toBe("C")
    expect(first.cost[0]).toBe(0)
    const partial = lengtheningCandidates(plan, laid(FLAT), missing, appetite).find(found => found.id === "C")!
    expect(partial).toMatchObject({ kind: "region", nodes: 1 })
    expect(partial.cost[0]).toBe(1)
  })

  it("prefers the stretch laid shorter, then the one whose id sorts first", () => {
    const shorter = lengtheningCandidates(plan, laid({ ...FLAT, "corridor:B>C": 3, "region:C": 1 }), puzzle, new Map())
    expect(ids(shorter)[0]).toBe("region:C")
    const tied = lengtheningCandidates(plan, laid({ ...FLAT, "region:C": 2, "corridor:B>C": 2 }), puzzle, new Map())
    expect(ids(tied).slice(0, 2)).toEqual(["corridor:B>C", "region:C"])
  })

  it("never offers a stretch whose new node's region refuses what is missing", () => {
    const appetite = new Map<string, RegionAppetite>([
      ["C", "nothing"],
      ["B", "reward"],
    ])
    const found = lengtheningCandidates(plan, laid(FLAT), puzzle, appetite)
    expect(ids(found)).not.toContain("region:C")
    expect(ids(found)).not.toContain("region:B")
  })

  it("offers only whole regions the way in reaches before any door when a room asks for open ground", () => {
    const keys = ["region:A:0", "region:A:1"]
    const found = lengtheningCandidates(plan, laid(FLAT, keys), [{ kind: "reward", open: true }], new Map())
    expect(ids(found)).toEqual(["region:A"])
  })

  it("asks the lay for the laid length of a stretch plus the nodes wanted, and no other stretch for more", () => {
    const grown = lengthenPlan(plan, laid({ ...FLAT, "corridor:B>C": 4 }), { kind: "corridor", id: "B>C", nodes: 2 })
    expect(grown.corridors.map(found => found.minNodes)).toEqual([0, 6])
    expect(grown.regions.map(found => found.minNodes)).toEqual([1, 1, 1])
    const region = lengthenPlan(plan, laid(FLAT), { kind: "region", id: "C", nodes: 1 })
    expect(region.regions.map(found => found.minNodes)).toEqual([1, 1, 3])
  })
})

describe("doors on corridors that carry items", { timeout: 60_000 }, () => {
  const planFor = (text: string, name: string) => planOf([{ lock: freeRegions(parseLock(text, name).lock) }])

  it("labels a falling corridor's stretches and ledge by the region each hangs from, and stands its door on them", () => {
    const plan = planFor("in -- out\nin -[A]- >> -[A]- pit\npit -- out\nA toggle @in", "fall")
    for (const seed of SEEDS) {
      const floor = seated(plan, seed)
      const up = floor.gateDoor.get("fall.in-pit")!
      const down = floor.gateDoor.get("fall.in-pit#2")!
      expect(floor.label.get(up)).toBe("fall.in")
      expect(floor.label.get(down)).toBe("fall.pit")
      const [drop] = floor.drops
      expect(floor.label.get(drop.from)).toBe("fall.in")
      expect(floor.label.get(drop.to)).toBe("fall.pit")
      expect(floor.seatDemand.has("fall.in>pit:ledge")).toBe(false)
    }
  })

  it("stands a door aligned right on the node beside the region after it", () => {
    const base = planFor("in ---[A]- hall\nhall -- out\nA toggle @in", "aligned")
    const plan = { ...base, corridors: base.corridors.map(c => ({ ...c, minNodes: c.minNodes + 2 })) }
    for (const seed of SEEDS) {
      const toLay = planToLay(plan, WANTS)
      const result = layLockPlan(toLay, { seed, n: startingGridSize(toLay) })
      if (!result.ok) continue
      const floor = seatLaidFloor(plan, result.laid)
      const nodes = result.laid.corridors.find(c => c.id === "aligned.in>aligned.hall")!.nodes
      expect(floor.gateDoor.get("aligned.in-hall")).toBe(nodes[nodes.length - 1])
    }
  })
})
