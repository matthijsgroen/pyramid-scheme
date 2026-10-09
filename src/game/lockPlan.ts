import type { ExpandedFloor } from "./floorLocks"
import type { Alignment } from "./lockAuthoring"
import type { ResolveMechanicKind } from "./mechanics"
import { resolveMechanicKind } from "./mechanics"
import type { Control, OneWayObstacle } from "./obstacles"
import { controlKindOf, fallingStretches, floorCorridors, isForkSwitch, isRegionGate } from "./obstacles"
import { offRouteChains, regionRoute } from "./regions"

/** What a region must hold a node for. A door is a region barrier's: one stands in from each entrance. */
export type PlanSeat =
  | { for: "control"; control: string }
  | { for: "tile"; control: string; step: number }
  | { for: "junction"; control: string }
  /** `corridor`: the corridor it stands on, named where its pair has more than one. */
  | { for: "door"; barrier: string; entrance: string; corridor?: string }

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
  /** A falling corridor's ledge or landing: one node the layout does not name, answering to this region. */
  answersTo?: string
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
  /** The aligned gates, read from `from` to `to`; a gate it does not name is free. */
  align?: Record<string, Alignment>
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

  const regionDrops = obstacles.flatMap(obstacle =>
    obstacle.kind === "oneWay" ? [[obstacle.at.between[0], obstacle.at.between[1]] as const] : []
  )
  const route = regionRoute(layout)
  const onRoute = new Set(route)
  const routeLinks = new Set(route.slice(1).map((region, i) => keyOf(route[i], region)))
  const mouthOf = new Map<string, string>()
  for (const { mouth, regions } of offRouteChains(layout, regionDrops))
    for (const region of regions) mouthOf.set(region, mouth)
  const ownerOf = new Map(placed.flatMap(({ instance, regions }) => regions.map(region => [region, instance] as const)))

  const pick = (align: Readonly<Record<string, Alignment>>, ids: readonly string[]) => {
    const kept = Object.fromEntries(ids.flatMap(id => (align[id] ? [[id, align[id]] as const] : [])))
    return Object.keys(kept).length > 0 ? { align: kept } : {}
  }
  const corridors: PlanCorridor[] = []
  const stretchEnds: PlanRegion[] = []
  const ends = new Map<string, { launch: string; landing: string }>()
  const firstOfPair = new Set<string>()
  const pairCount = new Map<string, number>()
  const floor = floorCorridors(layout, obstacles, config.barrierOrder ?? [])
  for (const corridor of floor)
    if (corridor.drop === undefined) pairCount.set(corridor.key, (pairCount.get(corridor.key) ?? 0) + 1)
  const layoutCorridors: { corridor: PlanCorridor; repeated: boolean }[] = []
  for (const corridor of floor) {
    if (corridor.drop === undefined) {
      const [from, to] = corridor.between
      const first = !firstOfPair.has(corridor.key)
      firstOfPair.add(corridor.key)
      const planned: PlanCorridor = {
        id: first ? corridorId(from, to) : `${corridorId(from, to)}~${corridor.index}`,
        from,
        to,
        onRoute: first && routeLinks.has(corridor.key),
        barriers: [...corridor.barriers],
        minNodes: Math.max(0, corridor.barriers.length - 1),
        ...pick(corridor.align, corridor.barriers),
      }
      corridors.push(planned)
      layoutCorridors.push({ corridor: planned, repeated: (pairCount.get(corridor.key) ?? 0) > 1 })
      continue
    }
    // A FALLING CORRIDOR: its drop, with a stretch hung from each region it joins for the items on that side.
    const drop = obstacles.find(o => o.id === corridor.drop) as OneWayObstacle
    const { launch, landing, upstream, downstream, align } = fallingStretches(corridor, drop)
    const end = (id: string, answersTo: string): PlanRegion => ({
      id,
      ...(ownerOf.get(answersTo) === undefined ? {} : { owner: ownerOf.get(answersTo) }),
      onRoute: false,
      answersTo,
      seats: [],
      minNodes: 1,
    })
    const ledge = upstream.length > 0 ? `${drop.id}:ledge` : launch
    const lands = downstream.length > 0 ? `${drop.id}:landing` : landing
    if (upstream.length > 0) {
      stretchEnds.push(end(ledge, launch))
      corridors.push({
        id: corridorId(launch, ledge),
        from: launch,
        to: ledge,
        onRoute: false,
        barriers: upstream,
        minNodes: upstream.length - 1,
        ...pick(align, upstream),
      })
    }
    if (downstream.length > 0) {
      stretchEnds.push(end(lands, landing))
      corridors.push({
        id: corridorId(lands, landing),
        from: lands,
        to: landing,
        onRoute: false,
        barriers: downstream,
        minNodes: downstream.length - 1,
        ...pick(align, downstream),
      })
    }
    ends.set(drop.id, { launch: ledge, landing: lands })
  }
  const drops: PlanDrop[] = obstacles.flatMap(obstacle =>
    obstacle.kind === "oneWay"
      ? [
          {
            id: obstacle.id,
            launch: ends.get(obstacle.id)?.launch ?? obstacle.at.between[0],
            landing: ends.get(obstacle.id)?.landing ?? obstacle.at.between[1],
          },
        ]
      : []
  )

  const seatsIn = new Map<string, PlanSeat[]>()
  const seat = (region: string, entry: PlanSeat) => seatsIn.set(region, [...(seatsIn.get(region) ?? []), entry])
  for (const control of controls) for (const { region, seat: entry } of seatsOf(control, kinds)) seat(region, entry)
  for (const obstacle of obstacles) {
    if (!isRegionGate(obstacle)) continue
    const { region } = obstacle.at
    for (const { corridor, repeated } of layoutCorridors)
      if (corridor.from === region || corridor.to === region)
        seat(region, {
          for: "door",
          barrier: obstacle.id,
          entrance: corridor.from === region ? corridor.to : corridor.from,
          ...(repeated ? { corridor: corridor.id } : {}),
        })
  }

  const regions: PlanRegion[] = [
    ...layout.regions.map(({ name }): PlanRegion => {
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
    }),
    ...stretchEnds,
  ]

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
