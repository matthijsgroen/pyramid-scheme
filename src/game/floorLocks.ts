import type { Lock } from "./lockAuthoring"
import { joinOf, nestSpotFaults, nestSpotOf } from "./lockAuthoring"
import { compileLock } from "./lockCompile"
import type { LockFragment, RealisationBinding } from "./lockCompile"
import { regionRoute } from "./regions"
import type { Region } from "./regions"
import type { AssemblerReason, FloorConfig } from "./siteTypes"

/**
 * A LOCK PLACED ON A FLOOR. `lock` is shared by reference between every floor that uses it; `as` names this
 * instance, defaulting to the lock's own name. Two placements of one lock on a floor are two instances, so the
 * second must say `as`.
 *
 * `inside` splices the lock into the nest spot of another placement (`Lock.nestSpot`) instead of the floor's
 * sequence. Neither lock knows: the host is written exactly as it would be alone.
 */
export type PlacedLock = { lock: Lock; as?: string; inside?: { instance: string } }

/** A LOCK NESTED IN THE NEST SPOT OF ANOTHER, as the expansion leaves it for the floor's walk: the inner instance,
 * its host instance, and the inner's own regions and ports under their floor (namespaced) names. */
export type LockNesting = {
  instance: string
  host: string
  regions: string[]
  in: string
  out: string
  /** Absent when neither it nor any lock it stands in holds stones. */
  stones?: StoneNesting
}

/**
 * HOW A NESTED LOCK'S STONES MEET THOSE OF THE LOCKS IT STANDS IN (stones spec, "Nested locks"), read against the
 * nearest of them that holds stones, at any depth: a stone carried through a lock without stones reaches whatever
 * stands inside that one too. `pool` is the outermost lock of that chain holding stones, whose level a shared
 * nesting is walked in and whose control the pooled stones take.
 */
export type StoneNesting =
  /** It holds none, and a lock it stands in does: a stone from outside is carried through it. `oneWays`: it holds a
   * one-way (off its route; one on it is refused), so the walk takes it with its pool. */
  | { case: "passThrough"; pool: string; oneWays?: true }
  /** It holds stones, and no lock it stands in does: none is carried on through its way out; one may go back out by
   * its way in. */
  | { case: "contained" }
  /** It holds stones, and so does a lock it stands in: one pool across them. */
  | { case: "shared"; pool: string }

/** A LOCK INSTANCE AS PLACED ON A FLOOR: its regions under their floor (namespaced) names and, when nested, its
 * host and the two regions of the host's nest spot it stands between, in the spot's direction. */
export type PlacedInstance = {
  instance: string
  regions: string[]
  inside?: { host: string; between: [string, string] }
}

/** What `expandFloorLocks` hands back for a floor that places locks: the config the carve sees, and what the planner reads beside it. */
export type ExpandedFloor = { config: FloorConfig; nesting?: LockNesting[]; placed?: PlacedInstance[] }

/** EVERY WAY A NESTING IS REFUSED, naming the host or instance to fix. Authored names. A spot that contradicts its
 * host is the host's own refusal (`nestSpotFaults`, compileLock), never a nesting's. */
export type LockNestingFault =
  | { type: "hostUnknown"; host: string }
  /** The host has no nest spot: none written (`-&>`), or one on a busy connection, which is no spot. */
  | { type: "noNestSpot"; host: string }
  | { type: "cycle"; through: string[] }
  /** A spot holds one lock; `with` is the placement that got there first. */
  | { type: "nestSpotTaken"; host: string; with: string }
  /** A lock without stones that stands in one with them lets a stone through, so no one-way stands on its own route
   * from in to out: every one-way takes empty hands. `oneWays` names them. One off the route is allowed. */
  | { type: "oneWayOnPassThroughRoute"; pool: string; oneWays: string[] }

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

type Seat = { instance: string; host: string; from: string; to: string }

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
    const { instance: host } = placed.inside
    const hostLock = byName.get(host)?.lock
    if (!hostLock) {
      refuse(instance, { type: "hostUnknown", host })
      continue
    }
    // A LOCK IS SPLICED INTO ITS HOST'S NEST SPOT, the one connection its author wrote `-&>`. Whether the spot can
    // hold a lock is asked when the host is read (`nestSpotFaults`), so a spot that contradicts it is refused there
    // alone.
    const spot = nestSpotOf(hostLock)
    if (!spot) {
      if (nestSpotFaults(hostLock).length === 0) refuse(instance, { type: "noNestSpot", host })
      continue
    }
    const first = taken.get(host)
    if (first === undefined) taken.set(host, instance)
    else refuse(instance, { type: "nestSpotTaken", host, with: first })
    seats.push({ instance, host, from: spot.from, to: spot.to })
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

/** The stone case of every nested placement that has one. Cycles are refused before this is asked
 * (`seatNested`); the walk up stops at one anyway. */
export const stoneNestings = (placements: readonly PlacedLock[]): Map<string, StoneNesting> => {
  const byName = new Map(placements.map(placed => [instanceName(placed), placed]))
  const found = new Map<string, StoneNesting>()
  for (const placed of placements) {
    if (!placed.inside) continue
    const instance = instanceName(placed)
    const seen = new Set([instance])
    let pool: string | undefined
    for (let at = byName.get(placed.inside.instance); at && !seen.has(instanceName(at));) {
      seen.add(instanceName(at))
      if (at.lock.weights) pool = instanceName(at)
      at = at.inside ? byName.get(at.inside.instance) : undefined
    }
    const holds = placed.lock.weights !== undefined
    const oneWays = Object.keys(placed.lock.oneWays ?? {}).length > 0
    if (pool !== undefined)
      found.set(
        instance,
        holds ? { case: "shared", pool } : { case: "passThrough", pool, ...(oneWays ? { oneWays: true as const } : {}) }
      )
    else if (holds) found.set(instance, { case: "contained" })
  }
  return found
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
 * A NESTED LOCK IS SPLICED INTO ITS HOST'S NEST SPOT: the spot's corridor gives way to one from its first region
 * to the inner's `in` and one from the inner's `out` to its second, so the route walks host, inner, host. Nested
 * locks are no part of the floor's sequence.
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

  // A PASS-THROUGH LOCK LETS A STONE THROUGH (stones spec, "Nested locks"): every one-way takes empty hands, so a
  // one-way on its own route from in to out would turn the host's stone away. One off the route is a side way the
  // stone never has to take; the floor walk takes that lock fused with its pool's level (floorLockWalk.ts).
  const stoneCases = stoneNestings(placements)
  for (const placed of placements) {
    const stones = stoneCases.get(instanceName(placed))
    if (stones?.case !== "passThrough") continue
    const { lock } = placed
    const route = regionRoute({
      regions: Object.keys(lock.regions).map((name): Region => ({ name, appetite: "free" })),
      connections: lock.connections.map(joinOf),
      in: lock.in,
      out: lock.out,
    })
    const onRoute = (a: string, b: string) =>
      route.some((r, i) => i > 0 && ((route[i - 1] === a && r === b) || (route[i - 1] === b && r === a)))
    const oneWays = Object.entries(lock.oneWays ?? {})
      .filter(([, { from, to }]) => onRoute(from, to))
      .map(([id]) => id)
    if (oneWays.length > 0)
      reasons.push({
        type: "lockNestingRefused",
        instance: instanceName(placed),
        fault: { type: "oneWayOnPassThroughRoute", pool: stones.pool, oneWays },
      })
  }

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
  // A NESTED LOCK IS SPLICED INTO ITS HOST'S NEST SPOT: the spot's corridor gives way to two, from the spot's first
  // region to the inner's `in` and from the inner's `out` to the spot's second. The spot carries no barrier, so
  // nothing else of the host moves.
  for (const { instance, host, from, to } of nested.seats) {
    const inner = fragments.get(instance)!.regionLayout
    const [a, b] = [`${host}.${from}`, `${host}.${to}`]
    const hosted = fragments.get(host)!
    fragments.set(host, {
      ...hosted,
      regionLayout: {
        ...hosted.regionLayout,
        connections: hosted.regionLayout.connections.flatMap(pair =>
          (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)
            ? [[a, inner.in] as const, [inner.out, b] as const]
            : [pair]
        ),
      },
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
    const stones = stoneCases.get(instance)
    return {
      instance,
      host,
      regions: layout.regions.map(region => region.name),
      in: layout.in,
      out: layout.out,
      ...(stones ? { stones } : {}),
    }
  })
  const placed: PlacedInstance[] = ordered.map(({ name, fragment }) => {
    const inside = insideOf.get(name)
    const seat = nested.seats.find(candidate => candidate.instance === name)
    return {
      instance: name,
      regions: fragment.regionLayout.regions.map(region => region.name),
      ...(inside && seat
        ? { inside: { host: seat.host, between: [`${seat.host}.${seat.from}`, `${seat.host}.${seat.to}`] } }
        : {}),
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
