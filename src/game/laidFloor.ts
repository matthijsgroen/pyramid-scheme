import type { CellKey, LaidDrop, LaidLocks } from "./layLocks"
import type { LockPlan, PlanCorridor } from "./lockPlan"
import { appetiteAccepts } from "./regions"
import type { ContentKind, RegionAppetite } from "./regions"

type Cell = [number, number]

const rc = (cell: CellKey): Cell => cell.split(",").map(Number) as Cell

/** The doors a corridor carries, nearest its `from` end first: the doors of a region barrier standing at each end of it, with the corridor's own gates between. */
type CorridorDoor = { kind: "gate"; id: string } | { kind: "region"; barrier: string; region: string; entrance: string }

const doorsOnCorridor = (plan: LockPlan, corridor: PlanCorridor): CorridorDoor[] => {
  const regionDoors = (region: string, entrance: string): CorridorDoor[] =>
    (plan.regions.find(candidate => candidate.id === region)?.seats ?? []).flatMap(seat =>
      seat.for === "door" && seat.entrance === entrance
        ? [{ kind: "region" as const, barrier: seat.barrier, region, entrance }]
        : []
    )
  return [
    ...regionDoors(corridor.from, corridor.to),
    ...corridor.barriers.map((id): CorridorDoor => ({ kind: "gate", id })),
    ...regionDoors(corridor.to, corridor.from),
  ]
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
}

const decodePassage = (key: string, n: number): [CellKey, CellKey] => {
  const [x, y] = key.split("-").map(Number)
  return [`${Math.floor(x / n)},${x % n}`, `${Math.floor(y / n)},${y % n}`]
}

/** READS THE LAID STRUCTURE INTO THE FORM THE CARVE SEATS ROOMS ON. Pure: no draw is made, so one laid plan always reads the same way. */
export const seatLaidFloor = (plan: LockPlan, laid: LaidLocks): LaidFloor => {
  const label = new Map<CellKey, string>()
  for (const region of laid.regions) for (const node of region.nodes) label.set(node, region.id)

  const junctionRegions = new Set(plan.junctions.map(junction => junction.region))
  const gateDoor = new Map<string, CellKey>()
  const regionDoors: LaidRegionDoor[] = []
  const doorCells = new Set<CellKey>()
  for (const corridor of plan.corridors) {
    const laidCorridor = laid.corridors.find(candidate => candidate.id === corridor.id)!
    const doors = doorsOnCorridor(plan, corridor)
    const k = laidCorridor.nodes.length
    const m = doors.length
    // A corridor ending at a junction's region has its nearest door beside the junction, at its far end.
    const firstDoor = junctionRegions.has(corridor.to) && !junctionRegions.has(corridor.from) ? k - m : 0
    const split = m > 0 ? firstDoor : Math.ceil(k / 2)
    laidCorridor.nodes.forEach((node, i) => label.set(node, i < split ? corridor.from : corridor.to))
    doors.forEach((door, j) => {
      const cell = laidCorridor.nodes[firstDoor + j]
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
    seatDemand: new Map(plan.regions.map(region => [region.id, nodesForSeats(plan, region)])),
    junctions,
    chains,
    drops: laid.drops,
    held: laid.held,
    passages: laid.passages,
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
