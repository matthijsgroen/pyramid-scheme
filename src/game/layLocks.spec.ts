import { describe, expect, it } from "vitest"
import { expandFloorLocks } from "./floorLocks"
import type { PlacedLock } from "./floorLocks"
import { keepLayOutcomes, layLockPlan, startingGridSize } from "./layLocks"
import type { RoomShape } from "./layLocks"
import { planLockFloor } from "./lockPlan"
import type { LockPlan } from "./lockPlan"
import type { FloorConfig } from "./siteTypes"
import { expectLaidPlan } from "./testSupport/laidLocksInvariants"
import { leverLock, strandingLock } from "./testSupport/floorLockFixtures"
import { BINDING, mirrorForkLock, sluiceLock } from "./testSupport/lockFixtures"
import { freeRegions } from "./lockAuthoring"
import { parseLock } from "./lockNotation"
import { planToLay } from "./laidFloor"

const planOf = (locks: PlacedLock[], realisations = BINDING): LockPlan => {
  const floor: FloorConfig = {
    pathPuzzles: 2,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [],
    realisations,
    locks,
  }
  const result = expandFloorLocks(floor)
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.reasons)}`)
  return planLockFloor(result)!
}

const STONES = { ...BINDING, weights: "stonePlate" }

const FIXTURES: Record<string, () => LockPlan> = {
  sluice: () => planOf([{ lock: sluiceLock() }]),
  lever: () => planOf([{ lock: leverLock() }]),
  "two locks in sequence": () => planOf([{ lock: leverLock() }, { lock: strandingLock() }]),
  "a lock nested in a lock": () =>
    planOf([{ lock: leverLock() }, { lock: leverLock(), as: "inner", inside: { instance: "lever" } }]),
  mirrorFork: () => planOf([{ lock: mirrorForkLock() }]),
}
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)

describe("laying a lock plan on the lattice", { timeout: 120_000 }, () => {
  for (const [name, build] of Object.entries(FIXTURES))
    it(`${name}: lays on seeds 1..40 with its stretches, corridors, junction, drops, walls and route intact`, () => {
      const plan = build()
      const laidSeeds = SEEDS.flatMap(seed => {
        const result = layLockPlan(plan, { seed, n: startingGridSize(plan) })
        if (!result.ok) return []
        expectLaidPlan(plan, result.laid)
        return [seed]
      })
      const minimum = name === "mirrorFork" ? 30 : 40
      expect(laidSeeds.length).toBeGreaterThanOrEqual(minimum)
    })

  // A MADE-UP ROOM: a 3x3 inside with its node in one corner and a door on its west and its south wall.
  it("holds a lay with a designed room to the same claims, its floor's joins read as passages", () => {
    const shape: RoomShape = {
      h: 3,
      w: 3,
      pt: 0,
      pl: 0,
      anchor: [0, 0],
      ports: [
        { node: [0, 0], door: [0, -1], out: [0, -2] },
        { node: [2, 0], door: [3, 0], out: [4, 0] },
      ],
    }
    const plan = FIXTURES.lever()
    const ends = (id: string) => plan.corridors.filter(corridor => corridor.from === id || corridor.to === id).length
    const room = plan.regions.find(
      region =>
        region.owner !== undefined &&
        region.answersTo === undefined &&
        region.seats.every(seat => seat.for === "control" || seat.for === "door") &&
        plan.drops.every(drop => drop.launch !== region.id && drop.landing !== region.id) &&
        plan.junctions.every(junction => junction.region !== region.id) &&
        ends(region.id) === 2
    )!
    const roomed = SEEDS.slice(0, 10).flatMap(seed => {
      const result = layLockPlan(plan, {
        seed,
        n: startingGridSize(plan),
        blocks: [{ region: room.id, room: "made-up", shapes: [shape] }],
      })
      if (!result.ok) return []
      expectLaidPlan(plan, result.laid)
      return result.laid.blocks ? [seed] : []
    })
    expect(roomed.length).toBeGreaterThan(0)
  })

  it("never lays a junction one node from the exit or another junction where the two can never merge", () => {
    const plan = FIXTURES.mirrorFork()
    const at = (key: string) => key.split(",").map(Number)
    for (const seed of SEEDS) {
      const result = layLockPlan(plan, { seed, n: startingGridSize(plan) })
      if (!result.ok) continue
      const { route, junctions, regions } = result.laid
      const regionOf = (key: string) => regions.find(region => region.nodes.includes(key))?.id
      const exit = route[route.length - 1]
      for (const junction of junctions) {
        const [r1, c1] = at(junction.cell)
        const [r2, c2] = at(exit)
        if (Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)) !== 2) continue
        const toExit = r2 < r1 ? "n" : r2 > r1 ? "s" : c2 < c1 ? "w" : "e"
        if (r1 !== r2 && c1 !== c2) expect(regionOf(junction.cell)).toBe(regionOf(exit))
        else expect(junction.exits).toContain(toExit)
      }
    }
  })

  it("lays the same floor for the same seed", () => {
    const plan = FIXTURES.mirrorFork()
    const lay = () => layLockPlan(plan, { seed: 7, n: startingGridSize(plan) })
    expect(lay()).toEqual(lay())
  })

  it("lays the same floor from kept outcomes after a caller changed the one it was handed", () => {
    const plan = FIXTURES.sluice()
    keepLayOutcomes(64)
    try {
      const first = layLockPlan(plan, { seed: 3, n: startingGridSize(plan) })
      const kept = structuredClone(first)
      if (first.ok) first.laid.route.push("99,99")
      else first.refusal.part.id = "changed"
      expect(layLockPlan(plan, { seed: 3, n: startingGridSize(plan) })).toEqual(kept)
    } finally {
      keepLayOutcomes(0)
    }
  })

  it("lays from kept outcomes, from any starting grid, the floor a lay that keeps none lays", () => {
    const plan = FIXTURES.mirrorFork()
    const asked = startingGridSize(plan)
    const fresh = (n: number, seed: number) => {
      keepLayOutcomes(0)
      return layLockPlan(plan, { seed, n })
    }
    keepLayOutcomes(256)
    try {
      for (const seed of SEEDS.slice(0, 12)) {
        const grown = layLockPlan(plan, { seed, n: asked })
        const larger = grown.ok ? grown.laid.n : asked + 2
        keepLayOutcomes(256)
        layLockPlan(plan, { seed, n: asked })
        const fromKept = layLockPlan(plan, { seed, n: larger })
        expect(fromKept).toEqual(fresh(larger, seed))
        expect(grown).toEqual(fresh(asked, seed))
        keepLayOutcomes(256)
      }
    } finally {
      keepLayOutcomes(0)
    }
  })

  it("lays different floors for different seeds", () => {
    const plan = FIXTURES.sluice()
    const routes = new Set(
      SEEDS.map(seed => {
        const result = layLockPlan(plan, { seed, n: startingGridSize(plan) })
        return result.ok ? JSON.stringify(result.laid.route) : "refused"
      })
    )
    expect(routes.size).toBeGreaterThan(5)
  })

  it("grows the grid past the size it was asked for when the plan does not fit there", () => {
    const plan = FIXTURES.mirrorFork()
    const asked = startingGridSize(plan)
    const sizes = SEEDS.map(seed => {
      const result = layLockPlan(plan, { seed, n: asked })
      return result.ok ? result.laid.n : asked
    })
    expect(Math.max(...sizes)).toBeGreaterThan(asked)
  })

  it("lays a corridor held to more nodes than its ends are apart as a path that never crosses itself", () => {
    const plan = FIXTURES["two locks in sequence"]()
    const roomy = {
      ...plan,
      corridors: plan.corridors.map(corridor => ({ ...corridor, minNodes: corridor.minNodes + 3 })),
    }
    const laidSeeds = SEEDS.flatMap(seed => {
      const result = layLockPlan(roomy, { seed, n: startingGridSize(roomy) })
      if (!result.ok) return []
      for (const corridor of result.laid.corridors) {
        const chain = [corridor.start, ...corridor.nodes, corridor.end]
        expect(new Set(chain).size, `${corridor.id} on seed ${seed}`).toBe(chain.length)
      }
      expect(new Set(result.laid.route).size).toBe(result.laid.route.length)
      return [seed]
    })
    expect(laidSeeds.length).toBeGreaterThanOrEqual(30)
  })

  it("refuses by name the part that did not fit when the grid may not grow past the ceiling", () => {
    const plan = FIXTURES.sluice()
    const result = layLockPlan(plan, { seed: 1, n: 3, ceiling: 3 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const ids = [...plan.regions.map(r => r.id), ...plan.corridors.map(c => c.id)]
    expect(ids).toContain(result.refusal.part.id)
    expect(result.refusal.part.id).not.toBe(plan.route[0])
    expect(result.refusal.grid).toBe(3)
  })

  // A MADE-UP PLAN, as a floor's lengthening handed it to the lay: a drop from a long `in` stretch onto `path`, and
  // a door back from `ledge`. At this seed one search's corridor has no path of any of its lengths, and looking
  // down every self-avoiding walk for one never ended.
  it("gives up a search that cannot find a corridor's path, and lays on a later one", () => {
    const region = (id: string, onRoute: boolean, minNodes: number, extra: object = {}) => ({
      id,
      onRoute,
      seats: [],
      minNodes,
      ...extra,
    })
    const corridor = (from: string, to: string, onRoute: boolean, barriers: string[], minNodes: number) => ({
      id: `${from}>${to}`,
      from,
      to,
      onRoute,
      barriers,
      minNodes,
    })
    const plan = {
      route: ["entrance", "in", "out", "exit"],
      regions: [
        region("entrance", true, 1),
        region("in", true, 3, { owner: "made" }),
        region("path", false, 1, { owner: "made", mouth: "in" }),
        {
          ...region("ledge", false, 1, { owner: "made", mouth: "in" }),
          seats: [{ for: "control", control: "made.G" }],
        },
        region("out", true, 1, { owner: "made" }),
        region("exit", true, 1),
      ],
      corridors: [
        corridor("entrance", "in", true, [], 0),
        corridor("path", "ledge", false, [], 0),
        corridor("ledge", "in", false, ["ledge-in"], 1),
        corridor("in", "out", true, ["in-out"], 1),
        corridor("out", "exit", true, [], 0),
      ],
      junctions: [],
      drops: [{ id: "in>path", launch: "in", landing: "path" }],
      nested: [],
    } as unknown as LockPlan
    const result = layLockPlan(plan, { seed: 3205065431912577, n: 21 })
    expect(result.ok).toBe(true)
    if (result.ok) expectLaidPlan(plan, result.laid)
  })

  // A MADE-UP LOCK, never a catalogue one. `hub` takes four ways and sits on two loops (hub-a-b-c-hub and
  // hall-hub-c-hall), so the ways that close them join regions both laid earlier, round a hub with no side to spare.
  it("lays a plan whose ways close loops round a hub with no side to spare", () => {
    const ROUND_THE_HUB =
      "in -- hall -[p]- out\nhall -- hub\nhub -- a\na -- b\nb -- c\nc -- hub\nhub -- d\nc -- hall\np plate @d stone"
    const plan = planToLay(planOf([{ lock: freeRegions(parseLock(ROUND_THE_HUB, "hub").lock) }], STONES), {
      content: [],
      appetite: new Map(),
      corridorRooms: new Map(),
    })
    const laidSeeds = SEEDS.slice(0, 10).flatMap(seed => {
      const result = layLockPlan(plan, { seed, n: startingGridSize(plan) })
      if (!result.ok) return []
      expectLaidPlan(plan, result.laid)
      return [seed]
    })
    expect(laidSeeds).toHaveLength(10)
  })
  // A MADE-UP LOCK, never a catalogue one. `out` is one node whose four sides are its two route corridors and its two
  // drops, so a lay that crowds one side is dead long before the drops are reached.
  it("lays a plan whose route region launches two drops from a node with no side to spare", () => {
    const TWO_DROPS = "in -[A]- p -[B]- q\nin -[C]- out\nout >> p\nout >> q\nA toggle @in\nB toggle @p\nC toggle @q"
    const plan = planToLay(planOf([{ lock: freeRegions(parseLock(TWO_DROPS, "twoDrops").lock) }]), {
      content: ["puzzle", "puzzle", "reward"],
      appetite: new Map(),
      corridorRooms: new Map(),
    })
    const laidSeeds = SEEDS.slice(0, 10).flatMap(seed => {
      const result = layLockPlan(plan, { seed, n: startingGridSize(plan) })
      if (!result.ok) return []
      expectLaidPlan(plan, result.laid)
      return [seed]
    })
    expect(laidSeeds).toHaveLength(10)
  })
})

describe("laying corridors that share a pair, and corridors that fall", { timeout: 120_000 }, () => {
  const planFor = (text: string, name: string) =>
    planToLay(planOf([{ lock: freeRegions(parseLock(text, name).lock) }]), {
      content: [],
      appetite: new Map(),
      corridorRooms: new Map(),
    })
  const nodesOf = (laid: { regions: { id: string; nodes: string[] }[] }, id: string) =>
    laid.regions.find(region => region.id === id)!.nodes
  const layAll = (plan: ReturnType<typeof planFor>) =>
    SEEDS.slice(0, 20).flatMap(seed => {
      const result = layLockPlan(plan, { seed, n: startingGridSize(plan) })
      if (!result.ok) return []
      expectLaidPlan(plan, result.laid)
      return [result.laid]
    })

  it("lays both corridors of one pair, only the first on the route", () => {
    const plan = planFor("in -[A]- hall\nin -[B]- hall\nhall -- out\nA toggle @in\nB toggle @in", "twin")
    const laid = layAll(plan)
    expect(laid.length).toBeGreaterThanOrEqual(15)
    for (const floor of laid) {
      const second = floor.corridors.find(c => c.id === "twin.in>twin.hall~1")!
      expect(nodesOf(floor, "twin.in")).toContain(second.start)
      expect(nodesOf(floor, "twin.hall")).toContain(second.end)
      expect(second.nodes.some(node => floor.route.includes(node))).toBe(false)
    }
  })

  it("lays a falling corridor's door, its ledge, and a drop from the ledge landing on a node of its region", () => {
    const plan = planFor("in -- out\nin -[A]- >> pit\npit -- out\nA toggle @in", "fall")
    const laid = layAll(plan)
    expect(laid.length).toBeGreaterThanOrEqual(15)
    for (const floor of laid) {
      const drop = floor.drops.find(d => d.id === "fall.in>pit")!
      expect(nodesOf(floor, "fall.in>pit:ledge")).toEqual([drop.from])
      expect(nodesOf(floor, "fall.pit")).toContain(drop.to)
      expect(floor.corridors.find(c => c.id === "fall.in>fall.in>pit:ledge")!.nodes.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("lands a drop with items on both sides on its downstream stretch", () => {
    const plan = planFor("in -- out\nin -[A]- >> -[A]- pit\npit -- out\nA toggle @in", "fall")
    const laid = layAll(plan)
    expect(laid.length).toBeGreaterThanOrEqual(15)
    for (const floor of laid) {
      const drop = floor.drops.find(d => d.id === "fall.in>pit")!
      expect(nodesOf(floor, "fall.in>pit:landing")).toEqual([drop.to])
      expect(nodesOf(floor, "fall.in>pit:ledge")).toEqual([drop.from])
    }
  })
})
