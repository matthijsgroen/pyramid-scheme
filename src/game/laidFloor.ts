import type { CellKey, LaidDrop, LaidLocks } from "./layLocks"
import type { Alignment } from "./lockAuthoring"
import type { LockPlan, PlanCorridor } from "./lockPlan"
import { appetiteAccepts } from "./regions"
import type { ContentKind, RegionAppetite } from "./regions"

type Cell = [number, number]

const rc = (cell: CellKey): Cell => cell.split(",").map(Number) as Cell

/**
 * WHERE EACH OF A CORRIDOR'S ITEMS STANDS AMONG ITS `k` NODES. Its `k - m` spare nodes fall into `m + 1` gaps: before
 * the first item, between each two, after the last. A gap is closed when the item after it is aligned left, the item
 * before it is aligned right, or it touches the junction end. Each centred item first takes one spare node into each
 * open gap beside it (a shared gap once); the rest go to the default gap — after the last item, or before the first
 * when the junction is at the end — or, closed, to the nearest open gap, or, every gap closed, to it anyway. With
 * nothing aligned this is where the carve has always stood a corridor's doors.
 */
export const seatItems = (
  k: number,
  aligns: ReadonlyArray<Alignment | undefined>,
  junction?: "start" | "end"
): number[] => {
  const m = aligns.length
  const gaps = Array<number>(m + 1).fill(0)
  const closed = gaps.map(
    (_, g) =>
      aligns[g] === "left" ||
      aligns[g - 1] === "right" ||
      (g === 0 && junction === "start") ||
      (g === m && junction === "end")
  )
  let spare = k - m
  const filled = new Set<number>()
  aligns.forEach((align, j) => {
    if (align !== "center") return
    for (const g of [j, j + 1])
      if (!closed[g] && !filled.has(g) && spare > 0) {
        gaps[g]++
        filled.add(g)
        spare--
      }
  })
  const preferred = junction === "end" ? 0 : m
  const open = gaps.map((_, g) => g).filter(g => !closed[g])
  const into =
    closed[preferred] && open.length > 0
      ? open.reduce((best, g) => (Math.abs(g - preferred) < Math.abs(best - preferred) ? g : best))
      : preferred
  gaps[into] += spare
  const at: number[] = []
  let node = gaps[0]
  for (let j = 0; j < m; j++) {
    at.push(node)
    node += 1 + gaps[j + 1]
  }
  return at
}

/** The doors a corridor carries, nearest its `from` end first: the doors of a region barrier standing at each end of it, with the corridor's own gates between. */
type CorridorDoor = { kind: "gate"; id: string } | { kind: "region"; barrier: string; region: string; entrance: string }

const doorsOnCorridor = (plan: LockPlan, corridor: PlanCorridor): CorridorDoor[] => {
  const regionDoors = (region: string, entrance: string): CorridorDoor[] =>
    (plan.regions.find(candidate => candidate.id === region)?.seats ?? []).flatMap(seat =>
      seat.for === "door" &&
      seat.entrance === entrance &&
      (seat.corridor === undefined || seat.corridor === corridor.id)
        ? [{ kind: "region" as const, barrier: seat.barrier, region, entrance }]
        : []
    )
  return [
    ...regionDoors(corridor.from, corridor.to),
    ...corridor.barriers.map((id): CorridorDoor => ({ kind: "gate", id })),
    ...regionDoors(corridor.to, corridor.from),
  ]
}

/** The region a plan region's nodes answer to: a ledge's or a landing's own region, otherwise itself. */
const labelOf = (plan: LockPlan, id: string): string => plan.regions.find(region => region.id === id)?.answersTo ?? id

/**
 * WHERE A CORRIDOR OF `k` NODES STANDS ITS DOORS (`seatItems`, its junction end closed) and how it is split between
 * its two regions: the nodes before its first door answer to `from`, the rest to `to`; with no door, halfway.
 */
const corridorSeats = (plan: LockPlan, corridor: PlanCorridor, k: number): { doors: number[]; split: number } => {
  const junctionRegions = new Set(plan.junctions.map(junction => junction.region))
  const end = junctionRegions.has(corridor.from) ? "start" : junctionRegions.has(corridor.to) ? "end" : undefined
  const doors = seatItems(
    k,
    doorsOnCorridor(plan, corridor).map(door => (door.kind === "gate" ? corridor.align?.[door.id] : undefined)),
    end
  )
  return { doors, split: doors.length > 0 ? doors[0] : Math.ceil(k / 2) }
}

const corridorLabels = (plan: LockPlan, corridor: PlanCorridor, k: number): string[] => {
  const { split } = corridorSeats(plan, corridor, k)
  return Array.from({ length: k }, (_, i) => labelOf(plan, i < split ? corridor.from : corridor.to))
}

/**
 * HOW MANY NODES A REGION'S MECHANICS WANT, beyond the doors its corridors carry: one per control and tile, and
 * for a region with tiles one more for every way off the route that leaves it, because a tile stands on a node
 * with two ways and not three.
 */
const nodesForSeats = (plan: LockPlan, region: LockPlan["regions"][number]): number => {
  const seats = region.seats.filter(seat => seat.for === "control" || seat.for === "tile")
  if (!seats.some(seat => seat.for === "tile")) return seats.length
  const leaves =
    plan.corridors.filter(corridor => !corridor.onRoute && (corridor.from === region.id || corridor.to === region.id))
      .length + plan.drops.filter(drop => drop.launch === region.id || drop.landing === region.id).length
  return seats.length + leaves
}

/**
 * A LOCK PLAN AS THE CARVE ASKS IT TO BE LAID. Every door stands on a node of the corridor it shuts, so a
 * door always has a node of its own between the two stretches it separates and never takes one a region
 * needs for a seat: a corridor holds a node for each door on it, and a region none for the doors of its own
 * barrier. The route holds room for the floor's own content, in regions that take it, because the main path
 * is the route and nothing else.
 */
export const planToLay = (
  plan: LockPlan,
  floor: { content: ContentKind[]; appetite: ReadonlyMap<string, RegionAppetite> }
): LockPlan => {
  const regions = plan.regions.map(region => ({
    ...region,
    minNodes: Math.max(1, region.seats.filter(seat => seat.for === "junction").length + nodesForSeats(plan, region)),
  }))
  const middle = plan.route.slice(1, -1)
  const spare = new Map(middle.map(id => [id, 0]))
  for (const region of regions)
    if (spare.has(region.id)) {
      const wanted = region.seats.filter(seat => seat.for === "junction").length + nodesForSeats(plan, region)
      spare.set(region.id, region.minNodes - wanted)
    }
  for (const kind of floor.content) {
    const roomy = middle.find(id => (spare.get(id) ?? 0) > 0 && appetiteAccepts(floor.appetite.get(id) ?? "free", kind))
    const into = roomy ?? middle.find(id => appetiteAccepts(floor.appetite.get(id) ?? "free", kind)) ?? middle[0]
    if (into === undefined) continue
    if (roomy === undefined) regions.find(region => region.id === into)!.minNodes += 1
    else spare.set(into, spare.get(into)! - 1)
  }
  return {
    ...plan,
    regions,
    corridors: plan.corridors.map(corridor => ({ ...corridor, minNodes: doorsOnCorridor(plan, corridor).length })),
  }
}

/** A STRETCH OF LAID NODES OFF THE ROUTE, hung from the node it grows from. `attachedAt` is absent for ground only a drop reaches. */
export type LaidChain = { cells: Cell[]; attachedAt?: Cell }

/** A FORK-SWITCH JUNCTION AS THE CARVE USES IT: its route step, and for every arm the seam it is and the cell it leaves by. */
export type LaidJunctionSeat = {
  region: string
  control: string
  cell: CellKey
  step: number
  arms: Array<{ seam: [string, string]; first: CellKey }>
}

/** A DOOR OF A REGION BARRIER, on the node where the corridor from `entrance` arrives in `region`. */
export type LaidRegionDoor = { barrier: string; region: string; entrance: string; cell: CellKey }

/**
 * THE LAID LOCKS READ THE WAY THE CARVE'S PASSES ASK ABOUT THEM: the route as steps with a region label each,
 * every node's label, which node each door stands on, the junctions with their arms, the off-route stretches
 * as chains, and the ground (door-bounded, label-bounded) a stray maze edge may not leave.
 */
export type LaidFloor = {
  n: number
  route: Cell[]
  routeLabels: string[]
  label: Map<CellKey, string>
  ground: Map<CellKey, string>
  gateDoor: Map<string, CellKey>
  regionDoors: LaidRegionDoor[]
  /** Every node a door stands on, edge gates and region barriers alike. */
  doors: Set<CellKey>
  /** Route steps nothing else may take: every door on the route and every junction. */
  reserved: Set<number>
  /** How many nodes of each region a mechanic's seat will want: the controls and sequence tiles standing in it. */
  seatDemand: Map<string, number>
  junctions: LaidJunctionSeat[]
  chains: LaidChain[]
  drops: LaidDrop[]
  held: CellKey[]
  passages: string[]
  /** Walk distance from the way in, over the laid passages, of every laid node. */
  depth: Map<CellKey, number>
  /** The nodes the way in reaches without opening a door. */
  open: Set<CellKey>
  /** The nodes each laid stretch holds, keyed `region:<id>` and `corridor:<id>`. */
  stretches: Map<string, CellKey[]>
  /** The authored side sections the carve filled into laid nodes; empty until the carve has filled the floor. */
  absorbed: AbsorbedPlace[]
  /** The stretches the carve lengthened to hold that content, in the order it chose them. */
  lengthened: LengtheningChoice[]
}

const decodePassage = (key: string, n: number): [CellKey, CellKey] => {
  const [x, y] = key.split("-").map(Number)
  return [`${Math.floor(x / n)},${x % n}`, `${Math.floor(y / n)},${y % n}`]
}

/** READS THE LAID STRUCTURE INTO THE FORM THE CARVE SEATS ROOMS ON. Pure: no draw is made, so one laid plan always reads the same way. */
export const seatLaidFloor = (plan: LockPlan, laid: LaidLocks): LaidFloor => {
  const label = new Map<CellKey, string>()
  for (const region of laid.regions) for (const node of region.nodes) label.set(node, labelOf(plan, region.id))

  const gateDoor = new Map<string, CellKey>()
  const regionDoors: LaidRegionDoor[] = []
  const doorCells = new Set<CellKey>()
  for (const corridor of plan.corridors) {
    const laidCorridor = laid.corridors.find(candidate => candidate.id === corridor.id)!
    const doors = doorsOnCorridor(plan, corridor)
    const k = laidCorridor.nodes.length
    const labels = corridorLabels(plan, corridor, k)
    const { doors: at } = corridorSeats(plan, corridor, k)
    laidCorridor.nodes.forEach((node, i) => label.set(node, labels[i]))
    doors.forEach((door, j) => {
      const cell = laidCorridor.nodes[at[j]]
      doorCells.add(cell)
      if (door.kind === "gate") gateDoor.set(door.id, cell)
      else regionDoors.push({ barrier: door.barrier, region: door.region, entrance: door.entrance, cell })
    })
  }

  const junctionCells = new Set(laid.junctions.map(junction => junction.cell))

  const routeStep = new Map(laid.route.map((node, i) => [node, i] as const))
  const routeSet = new Set(laid.route)
  const reserved = new Set<number>()
  for (const cell of [...doorCells, ...junctionCells]) {
    const step = routeStep.get(cell)
    if (step !== undefined) reserved.add(step)
  }

  const junctions: LaidJunctionSeat[] = laid.junctions.map(junction => {
    const planned = plan.junctions.find(candidate => candidate.region === junction.region)!
    return {
      region: junction.region,
      control: junction.control,
      cell: junction.cell,
      step: routeStep.get(junction.cell)!,
      arms: planned.arms.map(id => {
        const corridor = plan.corridors.find(candidate => candidate.id === id)!
        const path = laid.corridors.find(candidate => candidate.id === id)!
        const leavesFromStart = corridor.from === junction.region
        const first = leavesFromStart ? (path.nodes[0] ?? path.end) : (path.nodes[path.nodes.length - 1] ?? path.start)
        return { seam: [corridor.from, corridor.to] as [string, string], first }
      }),
    }
  })

  const neighbours = new Map<CellKey, CellKey[]>()
  for (const key of laid.passages) {
    const [a, b] = decodePassage(key, laid.n)
    neighbours.set(a, [...(neighbours.get(a) ?? []), b])
    neighbours.set(b, [...(neighbours.get(b) ?? []), a])
  }
  for (const list of neighbours.values()) list.sort()

  const depth = new Map<CellKey, number>([[laid.route[0], 0]])
  const queue = [laid.route[0]]
  for (let i = 0; i < queue.length; i++)
    for (const next of neighbours.get(queue[i]) ?? [])
      if (!depth.has(next)) {
        depth.set(next, depth.get(queue[i])! + 1)
        queue.push(next)
      }
  const open = new Set<CellKey>([laid.route[0]])
  const reached = [laid.route[0]]
  for (let i = 0; i < reached.length; i++)
    for (const next of neighbours.get(reached[i]) ?? [])
      if (!open.has(next) && !doorCells.has(next)) {
        open.add(next)
        reached.push(next)
      }

  // The off-route nodes, as chains: each walk continues through the first unseen neighbour and leaves the
  // others to chains of their own, so a node with three ways out hangs two chains off the one that reached it.
  const seen = new Set<CellKey>(routeSet)
  const chains: LaidChain[] = []
  const pending: Array<{ from: CellKey; first: CellKey }> = []
  for (const node of laid.route)
    for (const next of neighbours.get(node) ?? []) if (!routeSet.has(next)) pending.push({ from: node, first: next })
  const grow = (from: CellKey, first: CellKey) => {
    const cells: Cell[] = []
    let at: CellKey | undefined = first
    let behind = from
    while (at !== undefined) {
      seen.add(at)
      cells.push(rc(at))
      const onward: CellKey[] = (neighbours.get(at) ?? []).filter(next => next !== behind && !seen.has(next))
      for (const other of onward.slice(1)) pending.push({ from: at, first: other })
      behind = at
      at = onward[0]
    }
    chains.push({ cells, attachedAt: rc(from) })
  }
  for (let i = 0; i < pending.length; i++) {
    const { from, first } = pending[i]
    if (!seen.has(first)) grow(from, first)
  }
  // Ground a drop alone reaches has no corridor to hang from.
  for (const node of [...label.keys()].sort()) {
    if (seen.has(node)) continue
    const cells: Cell[] = []
    let at: CellKey | undefined = node
    while (at !== undefined) {
      seen.add(at)
      cells.push(rc(at))
      at = (neighbours.get(at) ?? []).find(next => !seen.has(next))
    }
    chains.push({ cells })
  }

  // A door is a ground of its own; elsewhere ground is walked both ways inside one label.
  const ground = new Map<CellKey, string>()
  for (const node of [...label.keys()].sort()) {
    if (ground.has(node)) continue
    if (doorCells.has(node)) {
      ground.set(node, `door ${node}`)
      continue
    }
    const stack = [node]
    ground.set(node, `at ${node}`)
    while (stack.length > 0) {
      const at = stack.pop()!
      for (const next of neighbours.get(at) ?? []) {
        if (ground.has(next) || doorCells.has(next) || label.get(next) !== label.get(at)) continue
        ground.set(next, `at ${node}`)
        stack.push(next)
      }
    }
  }

  return {
    n: laid.n,
    route: laid.route.map(rc),
    routeLabels: laid.route.map(node => label.get(node)!),
    label,
    ground,
    gateDoor,
    regionDoors,
    doors: doorCells,
    reserved,
    seatDemand: new Map(
      plan.regions
        .filter(region => region.answersTo === undefined)
        .map(region => [region.id, nodesForSeats(plan, region)])
    ),
    junctions,
    chains,
    drops: laid.drops,
    held: laid.held,
    passages: laid.passages,
    depth,
    open,
    stretches: new Map([
      ...laid.regions.map(region => [`region:${region.id}`, region.nodes] as const),
      ...laid.corridors.map(corridor => [`corridor:${corridor.id}`, corridor.nodes] as const),
    ]),
    absorbed: [],
    lengthened: [],
  }
}

/**
 * WHICH ROUTE STEPS THE FLOOR'S OWN CONTENT STANDS ON, in path order with the goal last, or undefined when the
 * route has no room for it. The goal takes the latest step whose region takes a reward; each puzzle the free
 * step nearest where it was spread to, in a region that takes a puzzle (a lever takes any). A door, a junction
 * and the nodes a region keeps for its mechanics' seats are never taken.
 */
export const placeContentOnRoute = (
  floor: Pick<LaidFloor, "route" | "routeLabels" | "reserved" | "seatDemand">,
  wanted: readonly number[],
  options: { leverFirst: boolean; appetite: ReadonlyMap<string, RegionAppetite> }
): number[] | undefined => {
  const last = floor.route.length - 2
  const room = new Map<string, number>()
  for (let step = 1; step <= last; step++)
    if (!floor.reserved.has(step)) room.set(floor.routeLabels[step], (room.get(floor.routeLabels[step]) ?? 0) + 1)
  for (const [region, seats] of floor.seatDemand) room.set(region, (room.get(region) ?? 0) - seats)
  const taken = new Set<number>()
  const takes = (step: number, kind: ContentKind | undefined): boolean =>
    !floor.reserved.has(step) &&
    !taken.has(step) &&
    (room.get(floor.routeLabels[step]) ?? 0) > 0 &&
    (kind === undefined || appetiteAccepts(options.appetite.get(floor.routeLabels[step]) ?? "free", kind))
  const take = (step: number) => {
    taken.add(step)
    room.set(floor.routeLabels[step], room.get(floor.routeLabels[step])! - 1)
    return step
  }
  let goal: number | undefined
  for (let step = last; step >= 1 && goal === undefined; step--) if (takes(step, "reward")) goal = take(step)
  if (goal === undefined) return undefined
  const puzzles: number[] = []
  for (const [slot, spread] of wanted.slice(0, -1).entries()) {
    const kind = options.leverFirst && slot === 0 ? undefined : "puzzle"
    let best: number | undefined
    for (let step = 1; step < goal; step++)
      if (takes(step, kind) && (best === undefined || Math.abs(step - spread) < Math.abs(best - spread))) best = step
    if (best === undefined) return undefined
    puzzles.push(take(best))
  }
  return [...puzzles.sort((a, b) => a - b), goal]
}

/**
 * What an authored side section holds, in the order the player meets it: its puzzles, then its end room.
 * `open` asks for ground the way in reaches without opening a door, for a section hosting a key that the floor's
 * own gates wait on.
 */
export type AbsorbedDemand = { section: number; kinds: ContentKind[]; open?: boolean }

/** A room of a section no laid node took. */
export type MissingRoom = { kind: ContentKind; open: boolean }

/** The laid node each room of an absorbed section stands on, the end room last. */
export type AbsorbedPlace = { section: number; cells: CellKey[] }

/** A stretch of the plan the carve asked the lay for more nodes on, and how many. */
export type Lengthening = { kind: "region" | "corridor"; id: string; nodes: number }

/**
 * FILLS THE FLOOR'S AUTHORED SIDE SECTIONS INTO THE LAID NODES, or names the kinds of room that found none.
 * A room may stand on any node that is no door, junction, drop end, entrance, exit or node the main content
 * took, in a region whose appetite takes its kind, and a region always keeps the nodes its mechanics' seats
 * want: on the route those come off the route's nodes, off it off the region's own. A section's rooms stand
 * in walk order from the way in, its puzzles first and its end room last, spread along the walk; a floor the
 * spread cannot seat is packed from the way in instead.
 */
export const fillLaidFloor = (
  floor: Pick<
    LaidFloor,
    "route" | "routeLabels" | "label" | "depth" | "open" | "doors" | "junctions" | "drops" | "seatDemand"
  >,
  taken: ReadonlySet<CellKey>,
  demands: readonly AbsorbedDemand[],
  appetite: ReadonlyMap<string, RegionAppetite>
): { placed: AbsorbedPlace[] } | { missing: MissingRoom[] } => {
  const routeKeys = new Set(floor.route.map(([r, c]) => `${r},${c}`))
  const [entrance, exit] = [floor.route[0], floor.route[floor.route.length - 1]].map(([r, c]) => `${r},${c}`)
  const held = new Set([
    entrance,
    exit,
    ...taken,
    ...floor.doors,
    ...floor.junctions.map(junction => junction.cell),
    ...floor.drops.flatMap(drop => [drop.from, drop.to]),
  ])
  const candidates = [...floor.label.keys()]
    .filter(key => !held.has(key) && floor.depth.has(key))
    .sort((a, b) => floor.depth.get(a)! - floor.depth.get(b)! || (a < b ? -1 : 1))
  const onRoute = new Set(floor.routeLabels)
  const poolOf = (key: CellKey) => `${floor.label.get(key)!}|${routeKeys.has(key) ? "route" : "chain"}`
  const allowance = new Map<string, number>()
  for (const key of candidates) allowance.set(poolOf(key), (allowance.get(poolOf(key)) ?? 0) + 1)
  for (const [region, seats] of floor.seatDemand) {
    const pool = `${region}|${onRoute.has(region) ? "route" : "chain"}`
    allowance.set(pool, Math.max(0, (allowance.get(pool) ?? 0) - seats))
  }
  const accepts = (key: CellKey, kind: ContentKind, open: boolean) =>
    appetiteAccepts(appetite.get(floor.label.get(key)!) ?? "free", kind) && (!open || floor.open.has(key))

  const fill = (spread: boolean): { placed: AbsorbedPlace[]; missing: MissingRoom[] } => {
    const room = new Map(allowance)
    const used = new Set<number>()
    const placed: AbsorbedPlace[] = []
    const missing: MissingRoom[] = []
    demands.forEach(({ section, kinds, open = false }, s) => {
      const cells: CellKey[] = []
      let behind = -1
      for (const [j, kind] of kinds.entries()) {
        const target = spread
          ? Math.floor(((j + (s + 1) / (demands.length + 1)) / kinds.length) * candidates.length)
          : behind + 1
        let best = -1
        for (let p = behind + 1; p < candidates.length; p++) {
          const key = candidates[p]
          if (used.has(p) || !accepts(key, kind, open) || (room.get(poolOf(key)) ?? 0) <= 0) continue
          if (best < 0 || Math.abs(p - target) < Math.abs(best - target)) best = p
          if (p >= target) break
        }
        if (best < 0) {
          missing.push(...kinds.slice(j).map(missed => ({ kind: missed, open })))
          break
        }
        used.add(best)
        room.set(poolOf(candidates[best]), room.get(poolOf(candidates[best]))! - 1)
        cells.push(candidates[best])
        behind = best
      }
      placed.push({ section, cells })
    })
    return { placed, missing }
  }

  const spread = fill(true)
  if (spread.missing.length === 0) return { placed: spread.placed }
  const packed = fill(false)
  return packed.missing.length === 0 ? { placed: packed.placed } : { missing: packed.missing }
}

/** A stretch the carve could lengthen to take what is missing, with what it would cost. */
export type LengtheningCandidate = Lengthening & { cost: [number, number, number, string] }

/** A stretch the carve lengthened, with every stretch it weighed it against, cheapest first. */
export type LengtheningChoice = Lengthening & { considered: LengtheningCandidate[] }

/**
 * THE STRETCHES THAT COULD TAKE WHAT IS MISSING, CHEAPEST FIRST. A lengthening adds nodes to one stretch of
 * the plan, and the node it adds answers to a region (a corridor's new node answers to whichever end its split
 * gives it to), so only a stretch whose new node's appetite takes a missing kind is a candidate, and it is asked
 * for as many nodes as there are rooms it takes. The cost, read left to right: the rooms still missing once it
 * is lengthened (none, for a stretch that takes everything), a stretch off the route before one on it (a route
 * node lengthens every walk past it), the shorter stretch as laid, then the id so the same floor always chooses
 * the same stretch.
 */
export const lengtheningCandidates = (
  plan: LockPlan,
  floor: Pick<LaidFloor, "stretches" | "open">,
  missing: readonly MissingRoom[],
  appetite: ReadonlyMap<string, RegionAppetite>
): LengtheningCandidate[] => {
  const found: LengtheningCandidate[] = []
  // Ground the way in reaches before any door is a whole region's: a corridor's new node may lie past one.
  const isOpen = (kind: Lengthening["kind"], id: string) => {
    const nodes = floor.stretches.get(`${kind}:${id}`) ?? []
    return kind === "region" && nodes.length > 0 && nodes.every(node => floor.open.has(node))
  }
  const consider = (kind: Lengthening["kind"], id: string, label: string, onRoute: boolean) => {
    const fits = missing.filter(
      missed => appetiteAccepts(appetite.get(label) ?? "free", missed.kind) && (!missed.open || isOpen(kind, id))
    )
    if (fits.length === 0) return
    found.push({
      kind,
      id,
      nodes: fits.length,
      cost: [
        missing.length - fits.length,
        onRoute ? 1 : 0,
        floor.stretches.get(`${kind}:${id}`)?.length ?? 0,
        `${kind}:${id}`,
      ],
    })
  }
  for (const region of plan.regions)
    if (region.answersTo === undefined) consider("region", region.id, region.id, region.onRoute)
  for (const corridor of plan.corridors) {
    const k = floor.stretches.get(`corridor:${corridor.id}`)?.length ?? 0
    const before = corridorLabels(plan, corridor, k)
    const after = corridorLabels(plan, corridor, k + 1)
    const gained = after.filter(label => after.filter(l => l === label).length > before.filter(l => l === label).length)
    consider("corridor", corridor.id, gained[0] ?? corridor.to, corridor.onRoute)
  }
  return found.sort((a, b) => {
    for (let i = 0; i < a.cost.length; i++) if (a.cost[i] !== b.cost[i]) return a.cost[i] < b.cost[i] ? -1 : 1
    return 0
  })
}

/** THE PLAN ASKING THE LAY FOR MORE NODES ON ONE STRETCH than it was laid with, so the next lay must give them. */
export const lengthenPlan = (plan: LockPlan, floor: Pick<LaidFloor, "stretches">, part: Lengthening): LockPlan => {
  const laidLength = floor.stretches.get(`${part.kind}:${part.id}`)?.length ?? 0
  const grown = (minNodes: number) => Math.max(minNodes, laidLength) + part.nodes
  return {
    ...plan,
    regions: plan.regions.map(region =>
      part.kind === "region" && region.id === part.id ? { ...region, minNodes: grown(region.minNodes) } : region
    ),
    corridors: plan.corridors.map(corridor =>
      part.kind === "corridor" && corridor.id === part.id
        ? { ...corridor, minNodes: grown(corridor.minNodes) }
        : corridor
    ),
  }
}
