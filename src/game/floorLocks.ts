import type { Lock, LockMechanic } from "./lockAuthoring"
import { isRegionGate, joinOf } from "./lockAuthoring"
import { compileLock } from "./lockCompile"
import type { LockFragment, RealisationBinding } from "./lockCompile"
import type { BarrierOrder, Obstacle } from "./obstacles"
import type { Region } from "./regions"
import type { AssemblerReason, FloorConfig } from "./siteTypes"

/**
 * A LOCK PLACED ON A FLOOR. `lock` is shared by reference between every floor that uses it; `as` names this
 * instance, defaulting to the lock's own name. Two placements of one lock on a floor are two instances, so the
 * second must say `as`.
 *
 * `inside` seats the lock in a region of another placement instead of in the floor's sequence. Neither lock
 * knows: the host is written exactly as it would be alone.
 */
export type PlacedLock = { lock: Lock; as?: string; inside?: { instance: string; region: string } }

/** A LOCK NESTED IN A REGION OF ANOTHER, as the expansion leaves it for the floor's walk: the inner instance,
 * its host instance, and the inner's own regions and ports under their floor (namespaced) names. */
export type LockNesting = { instance: string; host: string; regions: string[]; in: string; out: string }

/** A LOCK INSTANCE AS PLACED ON A FLOOR: its regions under their floor (namespaced) names, and the host region it stands in when nested. */
export type PlacedInstance = { instance: string; regions: string[]; inside?: { host: string; region: string } }

/** What `expandFloorLocks` hands back for a floor that places locks: the config the carve sees, and what the planner reads beside it. */
export type ExpandedFloor = { config: FloorConfig; nesting?: LockNesting[]; placed?: PlacedInstance[] }

/** EVERY WAY A NESTING IS REFUSED, naming the host, region or instance to fix. Authored names. */
export type LockNestingFault =
  | { type: "hostUnknown"; host: string }
  | { type: "regionUnknown"; host: string; region: string }
  /** The host's `in` or `out`: a port cannot hold another lock. */
  | { type: "atPort"; host: string; region: string }
  | { type: "cycle"; through: string[] }
  /** One host region holds one lock; `with` is the placement that got there first. */
  | { type: "regionShared"; host: string; region: string; with: string }
  /** The region is barred as a whole, so the inner lock would stand behind a wall of the host's. */
  | { type: "regionBarred"; host: string; region: string; barriers: string[] }
  | { type: "regionHoldsMechanic"; host: string; region: string; mechanics: string[] }
  /** The region is not a stretch of the host's route with exactly one way in and one way out. */
  | { type: "notPassThrough"; host: string; region: string; joins: number }
  /** Both neighbours are equally far from the host's `in`, so which side the inner's `in` faces is not said. */
  | { type: "directionAmbiguous"; host: string; region: string }

/** The floor's own ground before its first lock and after its last. Belongs to no lock, so the exit is outside every one. */
export const FLOOR_ENTRANCE = "entrance"
export const FLOOR_EXIT = "exit"

/** The fields a floor's locks compile into; authoring any of them beside `locks` would be two statements of one thing. */
const COMPILED_FIELDS = [
  "regionLayout",
  "obstacles",
  "controls",
  "barrierOrder",
  "oneWayRealisation",
  "regionBarrierRealisation",
] as const

const contradictions = (config: FloorConfig): string[] => [
  ...COMPILED_FIELDS.filter(field => config[field] !== undefined),
  ...((config.forks ?? []).some(fork => "in" in fork) ? ["forks"] : []),
]

const instanceName = (placed: PlacedLock): string => placed.as ?? placed.lock.name

const regionsHeldBy = (mechanic: LockMechanic): string[] =>
  mechanic.control === "sequence" ? mechanic.steps.map(step => step.in) : [mechanic.in]

/** The two regions a pass-through region joins, the one nearer the lock's `in` first; undefined when neither is nearer. */
const sidesOf = (lock: Lock, region: string, neighbours: [string, string]): [string, string] | undefined => {
  const joins = lock.connections.map(joinOf).filter(([a, b]) => a !== region && b !== region)
  const distance = new Map<string, number>([[lock.in, 0]])
  const queue = [lock.in]
  for (let at = 0; at < queue.length; at++)
    for (const [a, b] of joins) {
      const from = queue[at]
      const to = a === from ? b : b === from ? a : undefined
      if (to === undefined || distance.has(to)) continue
      distance.set(to, distance.get(from)! + 1)
      queue.push(to)
    }
  const [first, second] = neighbours.map(name => distance.get(name) ?? Infinity)
  if (first === second) return undefined
  return first < second ? neighbours : [neighbours[1], neighbours[0]]
}

type Seat = { instance: string; host: string; region: string; near: string; far: string }

/** Every reason the nested placements cannot be seated, and the seats of those that can. */
const seatNested = (placements: PlacedLock[]): { reasons: AssemblerReason[]; seats: Seat[] } => {
  const reasons: AssemblerReason[] = []
  const seats: Seat[] = []
  const byName = new Map<string, PlacedLock>()
  for (const placed of placements) if (!byName.has(instanceName(placed))) byName.set(instanceName(placed), placed)
  const refuse = (instance: string, fault: LockNestingFault) =>
    reasons.push({ type: "lockNestingRefused", instance, fault })

  const taken = new Map<string, string>()
  for (const placed of placements) {
    if (!placed.inside) continue
    const instance = instanceName(placed)
    const { instance: host, region } = placed.inside
    const hostLock = byName.get(host)?.lock
    if (!hostLock) {
      refuse(instance, { type: "hostUnknown", host })
      continue
    }
    if (!Object.hasOwn(hostLock.regions, region)) {
      refuse(instance, { type: "regionUnknown", host, region })
      continue
    }
    if (region === hostLock.in || region === hostLock.out) refuse(instance, { type: "atPort", host, region })

    const first = taken.get(`${host}|${region}`)
    if (first === undefined) taken.set(`${host}|${region}`, instance)
    else refuse(instance, { type: "regionShared", host, region, with: first })

    const barriers = Object.entries(hostLock.gates)
      .filter(([, gate]) => isRegionGate(gate) && gate.region === region)
      .map(([id]) => id)
    if (barriers.length > 0) refuse(instance, { type: "regionBarred", host, region, barriers })
    const mechanics = Object.entries(hostLock.mechanics)
      .filter(([, mechanic]) => regionsHeldBy(mechanic).includes(region))
      .map(([id]) => id)
    if (mechanics.length > 0) refuse(instance, { type: "regionHoldsMechanic", host, region, mechanics })

    const neighbours = hostLock.connections
      .map(joinOf)
      .filter(([a, b]) => a === region || b === region)
      .map(([a, b]) => (a === region ? b : a))
    if (neighbours.length !== 2) {
      refuse(instance, { type: "notPassThrough", host, region, joins: neighbours.length })
      continue
    }
    const sides = sidesOf(hostLock, region, [neighbours[0], neighbours[1]])
    if (!sides) refuse(instance, { type: "directionAmbiguous", host, region })
    else seats.push({ instance, host, region, near: sides[0], far: sides[1] })
  }

  for (const placed of placements) {
    if (!placed.inside) continue
    const start = instanceName(placed)
    const through = [start]
    let at: string | undefined = placed.inside.instance
    while (at !== undefined && at !== start && !through.includes(at)) {
      through.push(at)
      at = byName.get(at)?.inside?.instance
    }
    if (at === start) refuse(start, { type: "cycle", through })
  }
  return { reasons, seats }
}

/**
 * THE FLOOR'S LOCKS COMPILED INTO ITS OWN VOCABULARY, or every reason they cannot be. The one place a floor's
 * `locks` and its `realisations` binding are read; the carve sees only what comes out, so a floor with locks
 * and the same floor written longhand carve alike.
 *
 * The layout is ONE container whose regions are the floor's entrance, each lock's regions in sequence, and the
 * floor's exit: `entrance -> lock1.in ... lock1.out -> lock2.in ... lock2.out -> exit`. `Placement` seats a
 * single container on a stretch of the main path and leaves the rest unlabelled; two locks in sequence need
 * the stretch between them to be a region of its own, so the sequence is composed directly instead.
 *
 * A NESTED LOCK TAKES THE PLACE OF ONE REGION OF ITS HOST: the region leaves the layout, the host join on its
 * near side (the one nearer the host's `in`) is re-pointed at the inner's `in` and the join on its far side at
 * the inner's `out`, so the route walks host, inner, host. Gates, drops and `barrierOrder` standing on those
 * joins move with them. Nested locks are no part of the floor's sequence.
 */
export const expandFloorLocks = (
  config: FloorConfig
): ({ ok: true } & ExpandedFloor) | { ok: false; reasons: AssemblerReason[] } => {
  const placements = config.locks ?? []
  if (placements.length === 0) return { ok: true, config }

  const clashing = contradictions(config)
  if (clashing.length > 0) return { ok: false, reasons: [{ type: "locksContradictFloor", fields: clashing }] }

  const reasons: AssemblerReason[] = []
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const placed of placements) {
    const name = instanceName(placed)
    if (seen.has(name)) repeated.add(name)
    seen.add(name)
  }
  for (const instance of repeated) reasons.push({ type: "lockInstanceRepeated", instance })

  const nested = seatNested(placements)
  reasons.push(...nested.reasons)

  const binding: RealisationBinding = config.realisations ?? {}
  const compiled: LockFragment[] = []
  for (const placed of placements) {
    const instance = instanceName(placed)
    const result = compileLock(placed.lock, binding, { namespace: instance })
    if (result.ok) compiled.push(result.fragment)
    else for (const fault of result.faults) reasons.push({ type: "lockRefused", instance, fault })
  }
  if (reasons.length > 0) return { ok: false, reasons }

  const names = placements.map(instanceName)
  const fragments = new Map<string, LockFragment>(names.map((name, i) => [name, compiled[i]]))
  for (const { instance, host, region, near, far } of nested.seats) {
    const inner = fragments.get(instance)!.regionLayout
    const at = `${host}.${region}`
    const sides = [`${host}.${near}`, `${host}.${far}`]
    const repoint = (pair: readonly [string, string]): readonly [string, string] => {
      if (pair[0] !== at && pair[1] !== at) return pair
      const other = pair[0] === at ? pair[1] : pair[0]
      const port = other === sides[0] ? inner.in : inner.out
      return pair[0] === at ? [port, pair[1]] : [pair[0], port]
    }
    const hosted = fragments.get(host)!
    fragments.set(host, {
      ...hosted,
      regionLayout: {
        ...hosted.regionLayout,
        regions: hosted.regionLayout.regions.filter(r => r.name !== at),
        connections: hosted.regionLayout.connections.map(repoint),
      },
      obstacles: hosted.obstacles.map((obstacle): Obstacle =>
        obstacle.at.on === "connection"
          ? { ...obstacle, at: { on: "connection", between: repoint(obstacle.at.between) } }
          : obstacle
      ),
      barrierOrder: hosted.barrierOrder.map((order): BarrierOrder => ({ ...order, between: repoint(order.between) })),
    })
  }

  const insideOf = new Map(placements.map(placed => [instanceName(placed), placed.inside]))
  const ordered = names.map(name => ({ name, fragment: fragments.get(name)! }))
  const roots = ordered.filter(({ name }) => !insideOf.get(name))
  const layouts = ordered.map(({ fragment }) => fragment.regionLayout)
  const ground = (name: string): Region => ({ name, appetite: "free" })
  const joins: Array<readonly [string, string]> = [
    [FLOOR_ENTRANCE, roots[0].fragment.regionLayout.in],
    ...ordered.flatMap(({ name, fragment }) => {
      const root = roots.findIndex(candidate => candidate.name === name)
      const next = root >= 0 ? roots[root + 1] : undefined
      return [
        ...fragment.regionLayout.connections,
        ...(next ? [[fragment.regionLayout.out, next.fragment.regionLayout.in] as const] : []),
      ]
    }),
    [roots[roots.length - 1].fragment.regionLayout.out, FLOOR_EXIT],
  ]

  const all = ordered.map(({ fragment }) => fragment)
  const { locks: _locks, realisations: _realisations, ...floor } = config
  const forks = [...(config.forks ?? []), ...all.flatMap(fragment => fragment.forks)]
  const barrierOrder = all.flatMap(fragment => fragment.barrierOrder)
  const oneWayRealisation = all.find(fragment => fragment.oneWayRealisation)?.oneWayRealisation
  const regionBarrierRealisation = all.find(fragment => fragment.regionBarrierRealisation)?.regionBarrierRealisation
  const nesting: LockNesting[] = nested.seats.map(({ instance, host }) => {
    const layout = fragments.get(instance)!.regionLayout
    return { instance, host, regions: layout.regions.map(region => region.name), in: layout.in, out: layout.out }
  })
  const placed: PlacedInstance[] = ordered.map(({ name, fragment }) => {
    const inside = insideOf.get(name)
    const seat = nested.seats.find(candidate => candidate.instance === name)
    return {
      instance: name,
      regions: fragment.regionLayout.regions.map(region => region.name),
      ...(inside && seat ? { inside: { host: seat.host, region: `${seat.host}.${seat.region}` } } : {}),
    }
  })
  return {
    ok: true,
    config: {
      ...floor,
      regionLayout: {
        regions: [ground(FLOOR_ENTRANCE), ...layouts.flatMap(layout => layout.regions), ground(FLOOR_EXIT)],
        connections: joins,
        in: FLOOR_ENTRANCE,
        out: FLOOR_EXIT,
      },
      obstacles: all.flatMap(fragment => fragment.obstacles),
      controls: all.flatMap(fragment => fragment.controls),
      ...(forks.length > 0 ? { forks } : {}),
      ...(barrierOrder.length > 0 ? { barrierOrder } : {}),
      ...(oneWayRealisation === undefined ? {} : { oneWayRealisation }),
      ...(regionBarrierRealisation === undefined ? {} : { regionBarrierRealisation }),
    },
    ...(nesting.length > 0 ? { nesting } : {}),
    placed,
  }
}
