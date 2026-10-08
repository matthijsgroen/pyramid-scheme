import type { ExpandedFloor } from "./floorLocks"
import type { ResolveMechanicKind } from "./mechanics"
import { resolveMechanicKind } from "./mechanics"
import type { Control, EdgeGateObstacle } from "./obstacles"
import { controlKindOf, isEdgeGate, isForkSwitch, isRegionGate } from "./obstacles"
import { offRouteChains, regionRoute } from "./regions"

/** What a region must hold a node for. A door is a region barrier's: one stands in from each entrance. */
export type PlanSeat =
  | { for: "control"; control: string }
  | { for: "tile"; control: string; step: number }
  | { for: "junction"; control: string }
  | { for: "door"; barrier: string; entrance: string }

/**
 * A REGION AS A STRETCH OF NODES THE CARVE MUST LAY. `minNodes` is a floor, never a target: one node per
 * seat, and at least one for a region with none, because a region is a stretch of the lattice before it
 * is anything else. The carve decides every length and may lengthen any stretch.
 */
export type PlanRegion = {
  id: string
  /** The lock instance the region belongs to; absent for the floor's entrance and exit. */
  owner?: string
  onRoute: boolean
  /** The on-route region an off-route region hangs off, as the carve seats it. */
  mouth?: string
  seats: PlanSeat[]
  minNodes: number
}

/**
 * A CONNECTION AS A CORRIDOR, written from `from` to `to` as the layout joins them. `barriers` are the edge
 * gates standing on it, nearest `from` first. A door needs a node before it and the region it leaves holds
 * that one, so a corridor itself needs a node only between two doors: `minNodes` is one fewer than its
 * barriers, never below none.
 */
export type PlanCorridor = {
  id: string
  from: string
  to: string
  onRoute: boolean
  barriers: string[]
  minNodes: number
}

/** A FORK-SWITCH REGION AS ONE JUNCTION CELL; its arms are its seams, the corridors whose gate the switch owns. */
export type PlanJunction = { region: string; control: string; arms: string[] }

/** A DROP, run straight from a cell of its launch region to a cell of its landing region. */
export type PlanDrop = { id: string; launch: string; landing: string }

/** A lock spliced into its host's nest spot, between the spot's two regions. */
export type PlanNesting = { host: string; between: [string, string]; instance: string }

/**
 * WHAT A LOCK FLOOR OWES THE LATTICE, as data: the regions with the nodes they need, the corridors that join
 * them and the barriers on each, the junctions, the drops, the route `entrance -> ... -> exit` and the locks
 * nested in a host's nest spot.
 */
export type LockPlan = {
  route: string[]
  regions: PlanRegion[]
  corridors: PlanCorridor[]
  junctions: PlanJunction[]
  drops: PlanDrop[]
  nested: PlanNesting[]
}

const keyOf = (a: string, b: string): string => JSON.stringify([a, b].sort())

const corridorId = (from: string, to: string): string => `${from}>${to}`

const seatsOf = (control: Control, kinds: ResolveMechanicKind) =>
  (kinds(controlKindOf(control))?.seats?.(control) ?? []).map(({ region, seat }, step) => ({
    region,
    seat:
      seat === "tile"
        ? ({ for: "tile", control: control.id, step } as const)
        : ({ for: seat, control: control.id } as const),
  }))

/**
 * THE PLAN OF A FLOOR'S EXPANDED LOCKS, or undefined for a floor that places none. Pure: it reads the floor
 * vocabulary `expandFloorLocks` produced, so a floor written longhand has no plan of its own.
 */
export const planLockFloor = (
  expanded: ExpandedFloor,
  kinds: ResolveMechanicKind = resolveMechanicKind
): LockPlan | undefined => {
  const { config, placed } = expanded
  const layout = config.regionLayout
  if (!placed || !layout) return undefined
  const obstacles = config.obstacles ?? []
  const controls = config.controls ?? []

  const drops = obstacles.flatMap(obstacle =>
    obstacle.kind === "oneWay"
      ? [{ id: obstacle.id, launch: obstacle.at.between[0], landing: obstacle.at.between[1] }]
      : []
  )
  const route = regionRoute(layout)
  const onRoute = new Set(route)
  const routeLinks = new Set(route.slice(1).map((region, i) => keyOf(route[i], region)))
  const mouthOf = new Map<string, string>()
  for (const { mouth, regions } of offRouteChains(
    layout,
    drops.map(drop => [drop.launch, drop.landing] as const)
  ))
    for (const region of regions) mouthOf.set(region, mouth)
  const ownerOf = new Map(placed.flatMap(({ instance, regions }) => regions.map(region => [region, instance] as const)))

  const gatesOn = new Map<string, EdgeGateObstacle[]>()
  for (const obstacle of obstacles) {
    if (!isEdgeGate(obstacle)) continue
    const key = keyOf(...obstacle.at.between)
    gatesOn.set(key, [...(gatesOn.get(key) ?? []), obstacle])
  }
  const corridors: PlanCorridor[] = layout.connections.map(([from, to]) => {
    const key = keyOf(from, to)
    const gates = gatesOn.get(key) ?? []
    const stated = (config.barrierOrder ?? []).find(order => keyOf(...order.between) === key)
    const barriers = stated
      ? stated.between[0] === from
        ? [...stated.barriers]
        : [...stated.barriers].reverse()
      : gates.map(gate => gate.id)
    return {
      id: corridorId(from, to),
      from,
      to,
      onRoute: routeLinks.has(key),
      barriers,
      minNodes: Math.max(0, barriers.length - 1),
    }
  })

  const seatsIn = new Map<string, PlanSeat[]>()
  const seat = (region: string, entry: PlanSeat) => seatsIn.set(region, [...(seatsIn.get(region) ?? []), entry])
  for (const control of controls) for (const { region, seat: entry } of seatsOf(control, kinds)) seat(region, entry)
  for (const obstacle of obstacles) {
    if (!isRegionGate(obstacle)) continue
    const { region } = obstacle.at
    for (const [a, b] of layout.connections)
      if (a === region || b === region)
        seat(region, { for: "door", barrier: obstacle.id, entrance: a === region ? b : a })
  }

  const regions: PlanRegion[] = layout.regions.map(({ name }) => {
    const seats = seatsIn.get(name) ?? []
    const owner = ownerOf.get(name)
    const mouth = mouthOf.get(name)
    return {
      id: name,
      ...(owner === undefined ? {} : { owner }),
      onRoute: onRoute.has(name),
      ...(mouth === undefined ? {} : { mouth }),
      seats,
      minNodes: Math.max(1, seats.length),
    }
  })

  const junctions: PlanJunction[] = (config.forks ?? []).flatMap(fork => {
    if (!("in" in fork)) return []
    const control = controls.find(candidate => isForkSwitch(candidate) && candidate.in === fork.in)
    if (!control) return []
    const owned = new Set(
      obstacles.filter(obstacle => obstacle.kind === "gate" && obstacle.owners?.includes(control.id)).map(o => o.id)
    )
    const arms = corridors
      .filter(
        corridor =>
          (corridor.from === fork.in || corridor.to === fork.in) && corridor.barriers.some(id => owned.has(id))
      )
      .map(corridor => corridor.id)
    return [{ region: fork.in, control: control.id, arms }]
  })

  return {
    route,
    regions,
    corridors,
    junctions,
    drops,
    nested: placed.flatMap(({ instance, inside }) =>
      inside ? [{ host: inside.host, between: inside.between, instance }] : []
    ),
  }
}
