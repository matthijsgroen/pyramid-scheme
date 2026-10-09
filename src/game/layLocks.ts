import type { LockPlan, PlanCorridor, PlanRegion } from "./lockPlan"
import { mulberry32, shuffle } from "./random"
import { DEFAULT_PACKING, oneWayReach, oneWayRunCells } from "./carveConstants"
import type { Direction } from "./siteTypes"

/** A cell of the lattice, "row,col", the way the assembler keys its cells. Nodes stand on even/even cells. */
export type CellKey = string

/** A REGION AS THE STRETCH OF NODES IT CLAIMS, in order from where the route (or its first corridor) enters it. */
export type LaidRegion = { id: string; nodes: CellKey[] }

/** A CORRIDOR from a node of `from` to a node of `to`: the nodes it adds between them and every cell, connectors included, strictly between the two end nodes. */
export type LaidCorridor = {
  id: string
  from: string
  to: string
  start: CellKey
  end: CellKey
  nodes: CellKey[]
  cells: CellKey[]
}

/** A FORK-SWITCH JUNCTION: the one cell of its region the arms leave from, and every direction it has a way out. */
export type LaidJunction = {
  region: string
  control: string
  cell: CellKey
  exits: Direction[]
  arms: { corridor: string; dir: Direction }[]
}

/** A DROP IN THE FORM THE ASSEMBLER WRITES ONE: the node it falls from, the obstacle cells in order from there, the node it lands beside. */
export type LaidDrop = {
  id: string
  launch: string
  landing: string
  from: CellKey
  to: CellKey
  dir: Direction
  launchCell: CellKey
  run: CellKey[]
  landingCell: CellKey
}

/**
 * THE PLAN OF A LOCK FLOOR, LAID ON A LATTICE OF `n` x `n` CELLS: pre-claimed structure the carve grows around.
 * `route` is the whole top-level route, entrance to exit, as one path of nodes. `claimed` is every node cell
 * laid, `held` every cell a drop's run keeps uncarved, and `passages` exactly the ways between claimed nodes
 * (assembler pair keys for this `n`): along a stretch, along a corridor, and nowhere else.
 */
export type LaidLocks = {
  n: number
  route: CellKey[]
  regions: LaidRegion[]
  corridors: LaidCorridor[]
  junctions: LaidJunction[]
  drops: LaidDrop[]
  claimed: CellKey[]
  held: CellKey[]
  passages: string[]
}

/** The part of the plan the search could not place, the furthest it got before running out of room. */
export type LayRefusal = { part: { kind: "region" | "corridor" | "drop"; id: string }; grid: number }

export type LayResult = { ok: true; laid: LaidLocks } | { ok: false; refusal: LayRefusal }

export type LayOptions = {
  seed: number
  /** The grid the floor asks for; it grows from here by the assembler's step. */
  n: number
  /** The largest grid the layout may grow to. */
  ceiling?: number
}

/**
 * HOW MANY NODES A REGION'S STRETCH NEEDS: its plan minimum, and enough sides for every corridor and drop
 * that must reach it (a stretch of k nodes has 2k + 2 sides beyond its own links), and for a junction, a
 * second node whenever anything but the route and its arms lands in the region (the junction cell's sides
 * belong to them alone).
 */
const stretchLength = (plan: LockPlan, region: PlanRegion): number => {
  const ways =
    plan.corridors.filter(corridor => corridor.from === region.id || corridor.to === region.id).length +
    plan.drops.filter(drop => drop.launch === region.id || drop.landing === region.id).length
  const junction = plan.junctions.find(candidate => candidate.region === region.id)
  const joint = junction && ways - junction.arms.length > 2 ? 2 : 1
  return Math.max(region.minNodes, Math.ceil((ways - 2) / 2), joint)
}

/** The grid a plan starts from: the assembler's own sizing formula over the nodes the plan claims at least. */
export const startingGridSize = (plan: LockPlan): number => {
  const content = plan.regions.reduce((sum, region) => sum + stretchLength(plan, region), 0)
  let n = 3
  while (Math.pow((n + 1) / 2, 2) < content + DEFAULT_PACKING * (content * 3 + (n + 1) / 2)) n += 2
  return n
}

export const LAY_GRID_CEILING = 25

const GRID_STEP = 2
// Lattice hops between a drop's two nodes, along lattice direction `d` (an index into DIRS).
const dropHops = (d: number) => oneWayReach(DIRS[d][2]) / GRID_STEP
// Work (candidate placements tried) one search may spend, how many reshuffled searches a grid gets per
// allowance of lengthening, and the most extra nodes any one stretch may take.
const WORK_BUDGET = 400
const RESTARTS = 10
const MAX_EXTRA_NODES = 1
const MAX_EXTRA_PER_REGION = 2
const WALKS_PER_ANCHOR = 3
const PATHS_PER_LENGTH = 2
const DETOUR_HOPS = 4

const DIRS: Array<[number, number, Direction]> = [
  [-1, 0, "n"],
  [0, 1, "e"],
  [1, 0, "s"],
  [0, -1, "w"],
]
const opposite = (d: number) => (d + 2) % 4

type Part = LayRefusal["part"]
type Step = { part: Part; run: (next: () => boolean) => boolean }
type DropAt = { from: number; dir: number }

/** One search at one grid size, with so many extra nodes to give out: the laid floor, or how far it got. */
const search = (
  plan: LockPlan,
  n: number,
  rand: () => number,
  extraNodes: number
): { laid?: LaidLocks; deepest: number; parts: Part[] } => {
  const M = (n + 1) / 2
  const coords = (i: number): [number, number] => [Math.floor(i / M), i % M]
  const idOf = (u: number, v: number) => u * M + v
  const step = (i: number, d: number): number => {
    const [u, v] = coords(i)
    const nu = u + DIRS[d][0]
    const nv = v + DIRS[d][1]
    return nu < 0 || nu >= M || nv < 0 || nv >= M ? -1 : idOf(nu, nv)
  }
  const stepBy = (i: number, d: number, count: number): number => {
    let at = i
    for (let k = 0; k < count && at >= 0; k++) at = step(at, d)
    return at
  }
  const distance = (a: number, b: number) => {
    const [au, av] = coords(a)
    const [bu, bv] = coords(b)
    return Math.abs(au - bu) + Math.abs(av - bv)
  }

  const occupied = new Map<number, string>()
  const sides = new Map<number, number>()
  const passages: Array<[number, number]> = []
  const regionNodes = new Map<string, number[]>()
  const junctionAt = new Map<string, number>()
  const corridorPath = new Map<string, number[]>()
  const dropAt = new Map<string, DropAt>()
  const trail: Array<() => void> = []
  let extraLeft = extraNodes
  let work = 0
  let deepest = -1

  const undoTo = (mark: number) => {
    while (trail.length > mark) trail.pop()!()
  }
  const claim = (i: number, owner: string) => {
    occupied.set(i, owner)
    trail.push(() => occupied.delete(i))
  }
  const takeSide = (i: number, d: number) => {
    const before = sides.get(i) ?? 0
    sides.set(i, before | (1 << d))
    trail.push(() => sides.set(i, before))
  }
  const sideFree = (i: number, d: number) => ((sides.get(i) ?? 0) & (1 << d)) === 0
  const record = <V>(map: Map<string, V>, key: string, value: V) => {
    map.set(key, value)
    trail.push(() => map.delete(key))
  }
  const link = (a: number, d: number): number => {
    const b = step(a, d)
    takeSide(a, d)
    takeSide(b, opposite(d))
    passages.push([a, b])
    trail.push(() => passages.pop())
    return b
  }
  const spendExtra = (count: number) => {
    extraLeft -= count
    trail.push(() => (extraLeft += count))
  }
  const spent = () => ++work > WORK_BUDGET
  const dirBetween = (a: number, b: number) => DIRS.findIndex((_, d) => step(a, d) === b)

  const regionById = new Map(plan.regions.map(region => [region.id, region]))
  const routeIndex = new Map(plan.route.map((id, i) => [id, i]))
  const junctionOf = new Map(plan.junctions.map(junction => [junction.region, junction]))
  const armIds = new Set(plan.junctions.flatMap(junction => junction.arms))
  const corridorsOf = (region: string) =>
    plan.corridors.filter(corridor => corridor.from === region || corridor.to === region)
  const dropsOf = (region: string) => plan.drops.filter(drop => drop.launch === region || drop.landing === region)

  /** Runs of a drop are straight and leave the cells between its two end nodes uncarved. */
  const runUnits = (from: number, dir: number) =>
    Array.from({ length: dropHops(dir) - 1 }, (_, k) => stepBy(from, dir, k + 1))
  const dropFits = (from: number, dir: number): boolean => {
    const to = stepBy(from, dir, dropHops(dir))
    return (
      to >= 0 &&
      sideFree(from, dir) &&
      sideFree(to, opposite(dir)) &&
      runUnits(from, dir).every(unit => unit >= 0 && !occupied.has(unit))
    )
  }
  const layDrop = (id: string, from: number, dir: number) => {
    const to = stepBy(from, dir, dropHops(dir))
    for (const unit of runUnits(from, dir)) claim(unit, `run:${id}`)
    takeSide(from, dir)
    takeSide(to, opposite(dir))
    record(dropAt, id, { from, dir })
  }

  // The order the parts are laid in: the route first, then each off-route region next to one already laid.
  const order: string[] = [...plan.route]
  const remaining = plan.regions.map(region => region.id).filter(id => !routeIndex.has(id))
  while (remaining.length > 0) {
    const nextIdx = remaining.findIndex(id =>
      corridorsOf(id).some(corridor => order.includes(corridor.from === id ? corridor.to : corridor.from))
    )
    order.push(...remaining.splice(nextIdx < 0 ? 0 : nextIdx, 1))
  }

  const attachNodes = (corridor: PlanCorridor, region: string, isFrom: boolean): number[] => {
    const nodes = regionNodes.get(region)!
    const ia = routeIndex.get(corridor.from)
    const ib = routeIndex.get(corridor.to)
    if (corridor.onRoute && ia !== undefined && ib !== undefined) {
      const earlier = ia < ib
      return isFrom === earlier ? [nodes[nodes.length - 1]] : [nodes[0]]
    }
    const junction = junctionAt.get(region)
    if (junction === undefined) return nodes
    return armIds.has(corridor.id) ? [junction] : nodes.filter(node => node !== junction)
  }

  const steps: Step[] = []
  const placed = new Set<string>()

  const regionStep = (region: PlanRegion, pin: { drop: string; other: string } | undefined): Step => {
    const entrance = region.id === plan.route[0]
    const junction = junctionOf.get(region.id)
    const base = stretchLength(plan, region)

    function* anchors(): Generator<{ at: number; pinned?: { id: string; from: number; dir: number } }> {
      if (entrance) {
        const edge: number[] = []
        for (let u = 0; u < M; u++)
          for (let v = 0; v < M; v++) if (u === 0 || v === 0 || u === M - 1 || v === M - 1) edge.push(idOf(u, v))
        yield* shuffle(edge, rand).map(at => ({ at }))
        return
      }
      if (pin) {
        const drop = plan.drops.find(candidate => candidate.id === pin.drop)!
        const otherIsLaunch = drop.launch === pin.other
        const guarded = junctionAt.get(pin.other)
        for (const o of shuffle(regionNodes.get(pin.other)!, rand)) {
          if (o === guarded) continue
          for (const d of shuffle([0, 1, 2, 3], rand)) {
            const t = stepBy(o, d, dropHops(d))
            if (t < 0 || occupied.has(t) || !dropFits(o, d)) continue
            yield {
              at: t,
              pinned: otherIsLaunch ? { id: drop.id, from: o, dir: d } : { id: drop.id, from: t, dir: opposite(d) },
            }
          }
        }
        return
      }
      const parents = corridorsOf(region.id)
        .map(corridor => (corridor.from === region.id ? corridor.to : corridor.from))
        .filter(other => placed.has(other))
        .flatMap(other => regionNodes.get(other)!)
      const free: number[] = []
      for (let i = 0; i < M * M; i++) if (!occupied.has(i)) free.push(i)
      const near = (i: number) => Math.min(...parents.map(parent => distance(i, parent)))
      yield* shuffle(free, rand)
        .sort((a, b) => near(a) - near(b))
        .map(at => ({ at }))
    }

    function* walks(from: number, count: number): Generator<number[]> {
      let found = 0
      const path: number[] = []
      function* grow(at: number, left: number): Generator<number[]> {
        if (left === 0) {
          found++
          yield [...path]
          return
        }
        for (const d of shuffle([0, 1, 2, 3], rand)) {
          if (found >= WALKS_PER_ANCHOR) return
          const next = step(at, d)
          if (next < 0 || occupied.has(next) || path.includes(next)) continue
          path.push(next)
          yield* grow(next, left - 1)
          path.pop()
        }
      }
      yield* grow(from, count)
    }

    return {
      part: { kind: "region", id: region.id },
      run: next => {
        const reserve =
          entrance || region.id === plan.route[plan.route.length - 1] || region.answersTo !== undefined
            ? 0
            : MAX_EXTRA_PER_REGION
        for (let extra = 0; extra <= Math.min(extraLeft, reserve); extra++) {
          for (const { at, pinned } of anchors()) {
            if (spent()) return false
            const mark = trail.length
            if (pinned) layDrop(pinned.id, pinned.from, pinned.dir)
            claim(at, region.id)
            for (const walk of walks(at, base + extra - 1)) {
              for (const flipped of base + extra > 1 ? [false, true] : [false]) {
                const chain = flipped ? [...walk].reverse().concat(at) : [at, ...walk]
                const anchorIdx = chain.indexOf(at)
                const joints = junction
                  ? shuffle(
                      chain.map((_, i) => i).filter(i => !(pinned && i === anchorIdx)),
                      rand
                    )
                  : [-1]
                for (const joint of joints) {
                  const inner = trail.length
                  walk.forEach(node => claim(node, region.id))
                  for (let i = 0; i + 1 < chain.length; i++) link(chain[i], dirBetween(chain[i], chain[i + 1]))
                  record(regionNodes, region.id, chain)
                  if (joint >= 0) record(junctionAt, region.id, chain[joint])
                  spendExtra(extra)
                  placed.add(region.id)
                  trail.push(() => placed.delete(region.id))
                  if (next()) return true
                  undoTo(inner)
                  if (work > WORK_BUDGET) return false
                }
              }
            }
            undoTo(mark)
          }
        }
        return false
      },
    }
  }

  const corridorStep = (corridor: PlanCorridor): Step => {
    function* paths(s: number, t: number, hops: number): Generator<number[]> {
      let found = 0
      const path = [s]
      function* walk(at: number, left: number): Generator<number[]> {
        for (const d of shuffle([0, 1, 2, 3], rand)) {
          if (found >= PATHS_PER_LENGTH) return
          if (at === s && !sideFree(s, d)) continue
          const next = step(at, d)
          if (next < 0) continue
          if (left === 1) {
            if (next === t && sideFree(t, opposite(d))) {
              found++
              yield [...path, t]
            }
            continue
          }
          if (occupied.has(next) || path.includes(next) || distance(next, t) > left - 1) continue
          path.push(next)
          yield* walk(next, left - 1)
          path.pop()
        }
      }
      yield* walk(s, hops)
    }

    return {
      part: { kind: "corridor", id: corridor.id },
      run: next => {
        const starts = attachNodes(corridor, corridor.from, true)
        const ends = attachNodes(corridor, corridor.to, false)
        const pairs = shuffle(
          starts.flatMap(s => ends.map(t => [s, t] as const)),
          rand
        ).sort((a, b) => distance(...a) - distance(...b))
        for (const [s, t] of pairs) {
          const base = Math.max(corridor.minNodes + 1, distance(s, t))
          const first = base + ((base - distance(s, t)) % 2)
          for (let hops = first; hops <= first + DETOUR_HOPS; hops += 2) {
            for (const path of paths(s, t, hops)) {
              if (spent()) return false
              const mark = trail.length
              path.slice(1, -1).forEach(node => claim(node, corridor.id))
              for (let i = 0; i + 1 < path.length; i++) link(path[i], dirBetween(path[i], path[i + 1]))
              record(corridorPath, corridor.id, path)
              if (next()) return true
              undoTo(mark)
            }
          }
        }
        return false
      },
    }
  }

  const dropStep = (id: string): Step => {
    const drop = plan.drops.find(candidate => candidate.id === id)!
    return {
      part: { kind: "drop", id },
      run: next => {
        const launchNodes = regionNodes.get(drop.launch)!.filter(node => node !== junctionAt.get(drop.launch))
        const landing = new Set(regionNodes.get(drop.landing)!.filter(node => node !== junctionAt.get(drop.landing)))
        for (const q of shuffle(launchNodes, rand)) {
          for (const d of shuffle([0, 1, 2, 3], rand)) {
            if (!landing.has(stepBy(q, d, dropHops(d))) || !dropFits(q, d)) continue
            if (spent()) return false
            const mark = trail.length
            layDrop(id, q, d)
            if (next()) return true
            undoTo(mark)
          }
        }
        return false
      },
    }
  }

  const laidCorridors = new Set<string>()
  const laidDrops = new Set<string>()
  const pinnedDrops = new Set<string>()
  const inOrder = new Set<string>()
  for (const id of order) {
    const region = regionById.get(id)!
    const pinDrop = dropsOf(id).find(drop => inOrder.has(drop.launch === id ? drop.landing : drop.launch))
    if (pinDrop) pinnedDrops.add(pinDrop.id)
    inOrder.add(id)
    steps.push(
      regionStep(
        region,
        pinDrop ? { drop: pinDrop.id, other: pinDrop.launch === id ? pinDrop.landing : pinDrop.launch } : undefined
      )
    )
    for (const drop of dropsOf(id))
      if (!laidDrops.has(drop.id) && inOrder.has(drop.launch) && inOrder.has(drop.landing)) {
        laidDrops.add(drop.id)
        if (!pinnedDrops.has(drop.id)) steps.push(dropStep(drop.id))
      }
    for (const corridor of corridorsOf(id))
      if (!laidCorridors.has(corridor.id) && inOrder.has(corridor.from) && inOrder.has(corridor.to)) {
        laidCorridors.add(corridor.id)
        steps.push(corridorStep(corridor))
      }
  }

  const cell = (i: number): CellKey => {
    const [u, v] = coords(i)
    return `${2 * u},${2 * v}`
  }
  const between = (a: number, b: number): CellKey => {
    const [au, av] = coords(a)
    const [bu, bv] = coords(b)
    return `${au + bu},${av + bv}`
  }
  const pkey = (a: number, b: number) => {
    const [au, av] = coords(a)
    const [bu, bv] = coords(b)
    const x = 2 * au * n + 2 * av
    const y = 2 * bu * n + 2 * bv
    return x < y ? `${x}-${y}` : `${y}-${x}`
  }

  const snapshot = (): LaidLocks => {
    const interior = (path: number[]) => path.slice(1, -1)
    const cellsOf = (path: number[]) =>
      path
        .slice(0, -1)
        .flatMap((node, i) => (i === 0 ? [between(node, path[1])] : [cell(node), between(node, path[i + 1])]))
    const corridors: LaidCorridor[] = plan.corridors.map(corridor => {
      const path = corridorPath.get(corridor.id)!
      return {
        id: corridor.id,
        from: corridor.from,
        to: corridor.to,
        start: cell(path[0]),
        end: cell(path[path.length - 1]),
        nodes: interior(path).map(cell),
        cells: cellsOf(path),
      }
    })
    const regions: LaidRegion[] = plan.regions.map(region => {
      const nodes = regionNodes.get(region.id)!
      const entering = !routeIndex.has(region.id)
        ? corridorsOf(region.id).find(corridor => {
            const other = corridor.from === region.id ? corridor.to : corridor.from
            return order.indexOf(other) < order.indexOf(region.id)
          })
        : undefined
      const path = entering ? corridorPath.get(entering.id)! : undefined
      const entry = path ? (entering!.from === region.id ? path[0] : path[path.length - 1]) : nodes[0]
      return { id: region.id, nodes: (entry === nodes[nodes.length - 1] ? [...nodes].reverse() : nodes).map(cell) }
    })
    const route = plan.route.flatMap((id, i) => {
      const nodes = regionNodes.get(id)!
      const next = plan.route[i + 1]
      if (next === undefined) return nodes.map(cell)
      const corridor = plan.corridors.find(
        candidate =>
          candidate.onRoute &&
          ((candidate.from === id && candidate.to === next) || (candidate.from === next && candidate.to === id))
      )!
      const path = corridorPath.get(corridor.id)!
      return [...nodes, ...interior(corridor.from === id ? path : [...path].reverse())].map(cell)
    })
    const drops: LaidDrop[] = plan.drops.map(drop => {
      const { from, dir } = dropAt.get(drop.id)!
      const [u, v] = coords(from)
      const along = (offset: number) => `${2 * u + DIRS[dir][0] * offset},${2 * v + DIRS[dir][1] * offset}`
      return {
        id: drop.id,
        launch: drop.launch,
        landing: drop.landing,
        from: cell(from),
        to: cell(stepBy(from, dir, dropHops(dir))),
        dir: DIRS[dir][2],
        launchCell: along(1),
        run: Array.from({ length: oneWayRunCells(DIRS[dir][2]) }, (_, k) => along(k + 2)),
        landingCell: along(oneWayRunCells(DIRS[dir][2]) + 2),
      }
    })
    const junctions: LaidJunction[] = plan.junctions.map(junction => {
      const at = junctionAt.get(junction.region)!
      return {
        region: junction.region,
        control: junction.control,
        cell: cell(at),
        exits: passages
          .flatMap(([a, b]) => (a === at ? [b] : b === at ? [a] : []))
          .map(other => DIRS[dirBetween(at, other)][2]),
        arms: junction.arms.map(id => {
          const path = corridorPath.get(id)!
          const corridor = plan.corridors.find(candidate => candidate.id === id)!
          const second = corridor.from === junction.region ? path[1] : path[path.length - 2]
          return { corridor: id, dir: DIRS[dirBetween(at, second)][2] }
        }),
      }
    })
    return {
      n,
      route,
      regions,
      corridors,
      junctions,
      drops,
      claimed: [...occupied.entries()]
        .filter(([, owner]) => !owner.startsWith("run:"))
        .map(([i]) => cell(i))
        .sort(),
      held: drops.flatMap(drop => [drop.launchCell, ...drop.run, drop.landingCell]).sort(),
      passages: passages.map(([a, b]) => pkey(a, b)).sort(),
    }
  }

  // A loop-closing corridor joins two regions both laid without it in mind, and the search backtracks
  // chronologically, so a region walled in steps earlier is found only when the budget is gone. A placed
  // region needs a usable side (free, with an empty cell or a region it still joins behind it) for each
  // corridor it has yet to lay; a branch short of that can never lay and is cut at once.
  const walledIn = (): boolean => {
    for (const [region, nodes] of regionNodes) {
      const pending = corridorsOf(region).filter(corridor => !corridorPath.has(corridor.id))
      if (pending.length === 0) continue
      const others = new Set(pending.map(corridor => (corridor.from === region ? corridor.to : corridor.from)))
      let usable = 0
      for (const node of nodes)
        for (let d = 0; d < 4; d++) {
          const next = step(node, d)
          if (next < 0 || !sideFree(node, d)) continue
          const owner = occupied.get(next)
          if (owner === undefined || others.has(owner)) usable++
        }
      if (usable < pending.length) return true
    }
    return false
  }

  let laid: LaidLocks | undefined
  const run = (i: number): boolean => {
    if (i === steps.length) {
      laid = snapshot()
      return true
    }
    deepest = Math.max(deepest, i)
    if (walledIn()) return false
    return steps[i].run(() => run(i + 1))
  }
  run(0)
  return { laid, deepest, parts: steps.map(entry => entry.part) }
}

/**
 * LAYS A LOCK PLAN ON THE NODE LATTICE: the route first, then each off-route region beside one already laid,
 * a drop's two ends exactly its straight reach apart, a junction's exits the corridors laid out of it. The
 * carve decides every length: stretches take the nodes they need beyond their minimum, corridors the
 * hops, shortest first, and the grid grows from `n` until the plan fits or the ceiling refuses it by name.
 */
export const layLockPlan = (plan: LockPlan, { seed, n, ceiling = LAY_GRID_CEILING }: LayOptions): LayResult => {
  let refusal: LayRefusal | undefined
  for (let grid = n; grid <= Math.max(n, ceiling); grid += GRID_STEP) {
    let furthest = { deepest: -1, part: undefined as Part | undefined }
    for (let extra = 0; extra <= MAX_EXTRA_NODES; extra++)
      for (let restart = 0; restart < RESTARTS; restart++) {
        const rand = mulberry32(seed + grid * 7919 + extra * 104729 + restart * 15485863)
        const { laid, deepest, parts } = search(plan, grid, rand, extra)
        if (laid) return { ok: true, laid }
        if (deepest > furthest.deepest) furthest = { deepest, part: parts[deepest] }
      }
    refusal = { part: furthest.part ?? { kind: "region", id: plan.route[0] }, grid }
  }
  return { ok: false, refusal: refusal! }
}
