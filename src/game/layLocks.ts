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

/** A DESIGNED ROOM'S SHAPE ON THE LATTICE, in cell offsets from its inside's top-left: the inside's size, the parity
 * of that top-left, the cell its node stands on, and its ports, each a door place with the node a way through it
 * arrives at and the first node past the ring. The room's own floor joins every port's node to the anchor. */
export type RoomShape = {
  h: number
  w: number
  pt: number
  pl: number
  anchor: readonly [number, number]
  ports: ReadonlyArray<{
    node: readonly [number, number]
    door: readonly [number, number]
    out: readonly [number, number]
  }>
}

/** A region the floor asks to be laid as a designed room, and the shapes the room may take. */
export type BlockAsk = { region: string; room: string; shapes: readonly RoomShape[] }

/** A REGION LAID AS A DESIGNED ROOM: the shape it took (an index into its ask's shapes) with its inside's top-left at
 * `top`,`left`, the node it stands on, every node its rect and ring hold, and the nodes of the ports its ways take,
 * joined to `anchor` through the room's floor. */
export type LaidBlock = {
  region: string
  room: string
  shape: number
  top: number
  left: number
  anchor: CellKey
  nodes: CellKey[]
  joined: CellKey[]
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
  /** The hops a designed room's floor makes, from its anchor to a port's node, as pair keys like `passages`: no
   * passage of the lattice joins them. */
  joins: string[]
  /** The regions laid as designed rooms; absent where the floor asks none. */
  blocks?: LaidBlock[]
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
  /** The regions laid as designed rooms. */
  blocks?: readonly BlockAsk[]
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
  const sideArms = junction?.arms.filter(id => !plan.corridors.find(corridor => corridor.id === id)?.onRoute) ?? []
  const joint = junction && ways - sideArms.length > 2 ? 2 : 1
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
// Lattice steps one search may take looking for a stretch's walk or a corridor's path. A walk or a path that does
// not exist is otherwise looked for down every self-avoiding walk of its length, which on a crowded grid never ends.
const STEP_BUDGET = 250_000
const RESTARTS = 10
const MAX_EXTRA_NODES = 1
const MAX_EXTRA_PER_REGION = 2
const WALKS_PER_ANCHOR = 3
const PATHS_PER_LENGTH = 2
const DETOUR_HOPS = 4
// How many placements of a designed room one search tries for its region, best first.
const BLOCK_OPTIONS = 60
/** How many of a region's ways beyond its room's doors branch off a porch: the porch's two free sides. */
export const PORCH_WAYS = 2

const DIRS: Array<[number, number, Direction]> = [
  [-1, 0, "n"],
  [0, 1, "e"],
  [1, 0, "s"],
  [0, -1, "w"],
]
const opposite = (d: number) => (d + 2) % 4

/** Every ordered pick of `count` different items of `items`. */
const arrangements = <T>(items: readonly T[], count: number): T[][] =>
  count === 0
    ? [[]]
    : items.flatMap((item, i) =>
        arrangements([...items.slice(0, i), ...items.slice(i + 1)], count - 1).map(rest => [item, ...rest])
      )

type Part = LayRefusal["part"]
type Step = { part: Part; run: (next: () => boolean) => boolean }
type DropAt = { from: number; dir: number }

/** One search at one grid size, with so many extra nodes to give out: the laid floor, or how far it got. With
 * `dropsAhead`, a branch is cut as soon as a laid region can no longer launch or land a drop it still owes. */
const search = (
  plan: LockPlan,
  n: number,
  rand: () => number,
  extraNodes: number,
  dropsAhead = false,
  blockAsks: readonly BlockAsk[] = []
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
  const blockAt = new Map<string, LaidBlock>()
  // A room's ways: the node each of its corridors arrives at, keyed `corridor|region`; and how many of a room's
  // nodes, from its first, are the walk through it.
  const portEnd = new Map<string, number>()
  const walkLength = new Map<string, number>()
  const trail: Array<() => void> = []
  let extraLeft = extraNodes
  let work = 0
  let stepsTaken = 0
  // A search that has taken its last lattice step looks no further: every generator stops and every step refuses.
  const outOfSteps = () => ++stepsTaken > STEP_BUDGET
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
  const spent = () => ++work > WORK_BUDGET || stepsTaken > STEP_BUDGET
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
    const end = portEnd.get(`${corridor.id}|${region}`)
    if (end !== undefined) return [end]
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

  /**
   * A REGION LAID AS A DESIGNED ROOM: the room's rect and ring on free nodes, its anchor the region's, and one port for
   * each of the region's corridors, the corridor arriving at the port's node. The anchor and those ports' nodes are
   * the region's, joined through the room's own floor and never by a passage; every side of them but each port's way
   * out is taken and the room's other nodes are held, so nothing reaches into the room but by its ports. Its nodes
   * list the walk through it first: in by the port the route (or the way in) arrives by, over the anchor, out by the
   * port the route leaves by. A region with more ways than the room has doors takes a porch past the door of its way in
   * or out: that door's node one step out and the node past it, the region's, linked straight on from the door; the
   * ways the room has no door for branch off the porch's far node, the only node of the region with free sides.
   */
  const blockStep = (region: PlanRegion, ask: BlockAsk): Step => ({
    part: { kind: "region", id: region.id },
    run: next => {
      const ways = corridorsOf(region.id)
      const otherOf = (corridor: PlanCorridor) => (corridor.from === region.id ? corridor.to : corridor.from)
      const at = routeIndex.get(region.id)
      const enters = ways.find(corridor =>
        at === undefined
          ? placed.has(otherOf(corridor))
          : corridor.onRoute && routeIndex.get(otherOf(corridor)) === at - 1
      )
      const leaves =
        at === undefined
          ? undefined
          : ways.find(corridor => corridor.onRoute && routeIndex.get(otherOf(corridor)) === at + 1)
      const ordered = [
        ...(enters ? [enters] : []),
        ...(leaves ? [leaves] : []),
        ...ways.filter(corridor => corridor !== enters && corridor !== leaves),
      ]
      if (ordered.length === 0) return false
      const nodeAt = (r: number, c: number) =>
        r < 0 || c < 0 || r >= n || c >= n || r % 2 !== 0 || c % 2 !== 0 ? -1 : idOf(r / 2, c / 2)
      type Port = { node: number; out: number; dir: number }
      type Porch = { p: number; out: number; at: number }
      type Option = { score: number; anchor: number; held: number[]; ports: Port[]; block: LaidBlock; porch?: Porch }
      const options: Option[] = []
      // A room uses as many of its doors as the region has ways: a porch carries only what no door of it can.
      const doors = Math.min(ordered.length, Math.max(...ask.shapes.map(shape => shape.ports.length)))
      ask.shapes.forEach((shape, index) => {
        const k = Math.min(ordered.length, shape.ports.length)
        const extra = ordered.length - k
        if (k < doors || k < Math.min(ordered.length, 2) || extra > PORCH_WAYS) return
        for (let top = 1; top + shape.h <= n - 1; top++) {
          if (top % 2 !== shape.pt) continue
          for (let left = 1; left + shape.w <= n - 1; left++) {
            if (left % 2 !== shape.pl) continue
            const all: number[] = []
            for (let r = top - 1; r <= top + shape.h; r++)
              for (let c = left - 1; c <= left + shape.w; c++) if (r % 2 === 0 && c % 2 === 0) all.push(nodeAt(r, c))
            if (all.some(node => node < 0 || occupied.has(node))) continue
            const anchor = nodeAt(top + shape.anchor[0], left + shape.anchor[1])
            const ports = shape.ports.flatMap(({ node: [ni, nj], out: [oi, oj] }): Port[] => {
              const node = nodeAt(top + ni, left + nj)
              const out = nodeAt(top + oi, left + oj)
              return out < 0 ? [] : [{ node, out, dir: dirBetween(node, out) }]
            })
            for (const pick of arrangements(ports, k)) {
              // Two ways share no port's node but the anchor.
              const joined = pick.map(port => port.node).filter(node => node !== anchor)
              if (new Set(joined).size !== joined.length) continue
              const porches: Array<Porch | undefined> =
                extra === 0
                  ? [undefined]
                  : pick.flatMap((port, p): Porch[] => {
                      // On the walk through, so the porch is route and never a roomless stub of the region.
                      if (p !== 0 && ordered[p] !== leaves) return []
                      const at = step(port.out, port.dir)
                      return at < 0 || occupied.has(port.out) || occupied.has(at) ? [] : [{ p, out: port.out, at }]
                    })
              for (const porch of porches) {
                let score = rand()
                const fits = pick.every((port, w) => {
                  const other = otherOf(ordered[w])
                  const end = porch?.p === w ? porch.at : port.out
                  const owner = occupied.get(port.out)
                  if (owner !== undefined && owner !== other) return false
                  if (placed.has(other)) score += Math.min(...regionNodes.get(other)!.map(node => distance(end, node)))
                  return true
                })
                if (!fits) continue
                const held = all.filter(node => node !== anchor && !joined.includes(node))
                const block: LaidBlock = {
                  region: region.id,
                  room: ask.room,
                  shape: index,
                  top,
                  left,
                  anchor: cell(anchor),
                  nodes: all.map(cell),
                  joined: joined.map(cell),
                }
                options.push({ score, anchor, held, ports: pick, block, ...(porch ? { porch } : {}) })
              }
            }
          }
        }
      })
      options.sort((a, b) => a.score - b.score)
      for (const { anchor, held, ports, block, porch } of options.slice(0, BLOCK_OPTIONS)) {
        if (spent()) return false
        const mark = trail.length
        const nodes = [...new Set([anchor, ...ports.map(port => port.node)])]
        nodes.forEach(node => claim(node, region.id))
        held.forEach(node => claim(node, `block:${region.id}`))
        const outward = new Set(ports.map(port => port.node * 4 + port.dir))
        for (const node of nodes)
          for (let d = 0; d < 4; d++) if (sideFree(node, d) && !outward.has(node * 4 + d)) takeSide(node, d)
        ports.forEach((port, w) =>
          record(portEnd, `${ordered[w].id}|${region.id}`, porch?.p === w ? porch.at : port.node)
        )
        if (porch) {
          const { node, dir } = ports[porch.p]
          claim(porch.out, region.id)
          claim(porch.at, region.id)
          link(node, dir)
          link(porch.out, dir)
          for (let d = 0; d < 4; d++) if (sideFree(porch.out, d)) takeSide(porch.out, d)
        }
        const out = leaves && leaves !== ordered[0] ? [ports[ordered.indexOf(leaves)].node] : []
        const walk = [...new Set([ports[0].node, anchor, ...out])]
        if (porch?.p === 0) walk.unshift(porch.at, porch.out)
        else if (porch) walk.push(porch.out, porch.at)
        record(regionNodes, region.id, [...walk, ...nodes.filter(node => !walk.includes(node))])
        record(walkLength, region.id, walk.length)
        record(blockAt, region.id, block)
        placed.add(region.id)
        trail.push(() => placed.delete(region.id))
        if (next()) return true
        undoTo(mark)
      }
      return false
    },
  })

  const regionStep = (region: PlanRegion, pin: { drop: string; other: string } | undefined): Step => {
    const ask = blockAsks.find(candidate => candidate.region === region.id)
    if (ask) return blockStep(region, ask)
    const entrance = region.id === plan.route[0]
    const junction = junctionOf.get(region.id)
    const ownsOnward =
      junction?.arms.some(id => plan.corridors.find(corridor => corridor.id === id)?.onRoute === true) ?? false
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
        if (outOfSteps()) return
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
                // A junction owning the route's way on stands where that corridor leaves: the stretch's last node.
                const joints = junction
                  ? shuffle(
                      chain
                        .map((_, i) => i)
                        .filter(i => !(pinned && i === anchorIdx) && (!ownsOnward || i === chain.length - 1)),
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
                  if (work > WORK_BUDGET || stepsTaken > STEP_BUDGET) return false
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
        if (outOfSteps()) return
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

  const cellPair = (a: CellKey, b: CellKey) => {
    const [x, y] = [a, b].map(key => {
      const [r, c] = key.split(",").map(Number)
      return r * n + c
    })
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
      const nodes = regionNodes.get(id)!.slice(0, walkLength.get(id))
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
        .filter(([, owner]) => !owner.startsWith("run:") && !owner.startsWith("block:"))
        .map(([i]) => cell(i))
        .sort(),
      held: drops.flatMap(drop => [drop.launchCell, ...drop.run, drop.landingCell]).sort(),
      passages: passages.map(([a, b]) => pkey(a, b)).sort(),
      joins: [...blockAt.values()].flatMap(block => block.joined.map(node => cellPair(block.anchor, node))).sort(),
      ...(blockAt.size > 0 ? { blocks: [...blockAt.values()] } : {}),
    }
  }

  // A loop-closing corridor joins two regions both laid without it in mind, and the search backtracks
  // chronologically, so a region walled in steps earlier is found only when the budget is gone. A placed
  // region needs a usable side (free, with an empty cell or a region it still joins behind it) for each
  // corridor it has yet to lay; a branch short of that can never lay and is cut at once. With `dropsAhead` the same
  // holds for its drops: each needs a side whose straight run is clear and lands on empty ground or on its other
  // region, and the corridors and drops together need as many different sides.
  const walledIn = (): boolean => {
    for (const [region, nodes] of regionNodes) {
      const pending = corridorsOf(region).filter(corridor => !corridorPath.has(corridor.id))
      const owed = dropsAhead ? dropsOf(region).filter(drop => !dropAt.has(drop.id)) : []
      if (pending.length === 0 && owed.length === 0) continue
      const others = new Set(pending.map(corridor => (corridor.from === region ? corridor.to : corridor.from)))
      const usable = new Set<number>()
      for (const node of nodes)
        for (let d = 0; d < 4; d++) {
          const next = step(node, d)
          if (next < 0 || !sideFree(node, d)) continue
          const owner = occupied.get(next)
          if (owner === undefined || others.has(owner)) usable.add(node * 4 + d)
        }
      if (usable.size < pending.length) return true
      for (const drop of owed) {
        const other = drop.launch === region ? drop.landing : drop.launch
        const otherNodes = regionNodes.get(other)
        const lands = (at: number) =>
          otherNodes ? otherNodes.includes(at) && at !== junctionAt.get(other) : !occupied.has(at)
        let fits = false
        for (const node of nodes) {
          if (node === junctionAt.get(region)) continue
          for (let d = 0; d < 4; d++)
            if (dropFits(node, d) && lands(stepBy(node, d, dropHops(d)))) {
              fits = true
              usable.add(node * 4 + d)
            }
        }
        if (!fits) return true
      }
      if (usable.size < pending.length + owed.length) return true
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

/** What one grid's searches decided: the laid floor, or how far the furthest search got. */
type GridOutcome = { laid?: LaidLocks; furthest?: Part }

let gridOutcomesKept = 0
const gridOutcomes = new Map<string, GridOutcome>()

/**
 * THE LAY IS A PURE FUNCTION OF (plan, seed, grid), and the bake's layout search asks it the same question many times
 * over: every packing of one seed lays the same plan with the same seed, only from a different starting grid. With
 * `limit` above 0 each grid's outcome is kept, up to `limit` of them, and read back; 0 (the default, as play runs)
 * keeps none and forgets what was kept.
 */
export const keepLayOutcomes = (limit: number) => {
  gridOutcomesKept = limit
  gridOutcomes.clear()
}
const remembered = (key: string, decide: () => GridOutcome): GridOutcome => {
  if (gridOutcomesKept <= 0) return decide()
  const known = gridOutcomes.get(key)
  if (known) return known
  const outcome = decide()
  if (gridOutcomes.size >= gridOutcomesKept) gridOutcomes.delete(gridOutcomes.keys().next().value!)
  gridOutcomes.set(key, outcome)
  return outcome
}
/**
 * Whether two rooms the lay places that claim floor (the route's exit and every junction) stand one node apart where
 * they can never merge: ortho with no way between them, or diagonal across two regions. The carve keeps such rooms
 * apart (hangBranches), so a restart lays again rather than hand the carve a floor it must refuse.
 */
const crowdsAClaim = (laid: LaidLocks): boolean => {
  const regionOf = (key: CellKey) => laid.regions.find(region => region.nodes.includes(key))?.id
  const claims = [
    { cell: laid.route[laid.route.length - 1], exits: [] as Direction[] },
    ...laid.junctions.map(({ cell, exits }) => ({ cell, exits })),
  ]
  const DIR_OF: Record<string, Direction> = { "-2,0": "n", "2,0": "s", "0,-2": "w", "0,2": "e" }
  return claims.some((a, i) =>
    claims.slice(i + 1).some(b => {
      const [r1, c1] = a.cell.split(",").map(Number)
      const [r2, c2] = b.cell.split(",").map(Number)
      const [dr, dc] = [r2 - r1, c2 - c1]
      if (Math.max(Math.abs(dr), Math.abs(dc)) !== 2) return false
      if (dr === 0 || dc === 0)
        return !a.exits.includes(DIR_OF[`${dr},${dc}`]) && !b.exits.includes(DIR_OF[`${-dr},${-dc}`])
      return regionOf(a.cell) !== regionOf(b.cell)
    })
  )
}

/** A kept laid floor is handed out as a copy, so no caller can change what is kept. */
const handOut = (laid: LaidLocks): LayResult => ({ ok: true, laid: structuredClone(laid) })

/**
 * LAYS A LOCK PLAN ON THE NODE LATTICE: the route first, then each off-route region beside one already laid,
 * a drop's two ends exactly its straight reach apart, a junction's exits the corridors laid out of it. The
 * carve decides every length: stretches take the nodes they need beyond their minimum, corridors the
 * hops, shortest first, and the grid grows from `n` until the plan fits or the ceiling refuses it by name.
 */
export const layLockPlan = (
  plan: LockPlan,
  { seed, n, ceiling = LAY_GRID_CEILING, blocks = [] }: LayOptions
): LayResult => {
  const planKey = gridOutcomesKept > 0 ? JSON.stringify(blocks.length > 0 ? [plan, blocks] : plan) : ""
  let refusal: LayRefusal | undefined
  for (let grid = n; grid <= Math.max(n, ceiling); grid += GRID_STEP) {
    const { laid, furthest } = remembered(`${seed}|${grid}|${planKey}`, () => {
      let furthest = { deepest: -1, part: undefined as Part | undefined }
      for (let extra = 0; extra <= MAX_EXTRA_NODES; extra++)
        for (let restart = 0; restart < RESTARTS; restart++) {
          const rand = mulberry32(seed + grid * 7919 + extra * 104729 + restart * 15485863)
          const { laid, deepest, parts } = search(plan, grid, rand, extra, false, blocks)
          if (laid && !crowdsAClaim(laid)) return { laid }
          if (deepest > furthest.deepest) furthest = { deepest, part: parts[deepest] }
        }
      return { furthest: furthest.part }
    })
    if (laid) return handOut(laid)
    refusal = { part: furthest ? { ...furthest } : { kind: "region", id: plan.route[0] }, grid }
  }
  // Only a plan no search laid is searched again with its drops looked ahead to, so every plan that lays without
  // it lays as it always has. The look-ahead cuts dead branches early, so one search per grid is enough.
  if (plan.drops.length > 0)
    for (let grid = n; grid <= Math.max(n, ceiling); grid += GRID_STEP) {
      const { laid } = remembered(`${seed}|${grid}|ahead|${planKey}`, () => {
        for (let extra = 0; extra <= MAX_EXTRA_NODES; extra++) {
          const { laid } = search(plan, grid, mulberry32(seed + grid * 7919 + extra * 104729), extra, true, blocks)
          if (laid) return { laid }
        }
        return {}
      })
      if (laid) return handOut(laid)
    }
  return { ok: false, refusal: refusal! }
}
