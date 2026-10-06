import { floorLock, regionsOf } from "./floorLock"
import { checkLockSpec, deadRegions, describeLockWalkFailure, reachableStates, walkLock } from "./lockWalk"
import type { LockSpec, LockState, LockWalkFailure, RegionId } from "./lockWalk"
import type { FloorGrid } from "./siteTypes"

// THE WALK OF A FLOOR'S LOCK, which is the walk of the whole lock until a lock is nested in a region of another.
// The product of a host's states and a nested lock's states is what a nesting must not cost, so a nested lock is
// checked on its own and the host walks over what the nested lock amounts to for it.

export type FloorWalkFailure =
  | LockWalkFailure
  /** A lock cannot be taken apart from the floor: something is shared between it and another lock. */
  | { type: "entangled"; problem: string }
  /** A nested lock leaves a position from which the ground the host walks across it is no longer reachable. */
  | { type: "notFree"; at: LockState; cannotReach: RegionId }
  /** The nested lock `instance` fails inside; `failure` is what its own check found. */
  | { type: "nested"; instance: string; failure: FloorWalkFailure }

/** `states` is the walk of the floor's own level; `nested` counts the states of each nested lock on its own. */
export type FloorWalkResult =
  { sound: true; states: number; nested?: Record<string, number> } | { sound: false; failure: FloorWalkFailure }

export const describeFloorWalkFailure = (failure: FloorWalkFailure): string => {
  switch (failure.type) {
    case "entangled":
      return `the locks cannot be walked apart: ${failure.problem}`
    case "notFree": {
      const config = Object.entries(failure.at.config)
        .map(([id, state]) => `${id} at ${state}`)
        .join(", ")
      return `from ${failure.at.region}, ${config}, ${failure.cannotReach} cannot be reached`
    }
    case "nested":
      return `inside ${failure.instance}: ${describeFloorWalkFailure(failure.failure)}`
    default:
      return describeLockWalkFailure(failure)
  }
}

/** The floor's own ground, which no nested lock owns. */
type Owner = string | null
const FLOOR: Owner = null

class Entangled extends Error {}

type Level = { instance: string | undefined; spec: LockSpec }

type Cut = {
  lock: LockSpec
  /** Every region, gate and mechanism under the lock instance that owns it, or the floor. */
  regionOwner: Map<RegionId, Owner>
  gateOwner: Map<string, Owner>
  mechanismOwner: Map<string, Owner | undefined>
  /** The compiled region an authored region of a nested lock stands as. */
  portOf: (label: string) => RegionId
  within: (owner: Owner, node: Owner) => boolean
}

const cutOf = (grid: FloorGrid, lock: LockSpec): Cut => {
  const nesting = grid.lockNesting ?? []
  const { of } = regionsOf(grid)
  const instanceOfLabel = new Map(nesting.flatMap(n => n.regions.map(region => [region, n.instance] as const)))
  const hostOf = new Map<string, Owner>(
    nesting.map(n => [n.instance, nesting.some(other => other.instance === n.host) ? n.host : FLOOR])
  )

  const labels = new Map<RegionId, Set<string>>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      const id = of.get(`${r},${c}`)
      if (id === undefined || (cell.type !== "room" && cell.type !== "corridor") || cell.region === undefined) return
      labels.set(id, (labels.get(id) ?? new Set()).add(cell.region))
    })
  )
  const isDoor = (region: RegionId) => region.startsWith("door ")
  const only = (owners: Set<Owner>, what: string): Owner | undefined => {
    if (owners.size > 1) throw new Entangled(`${what} belongs to more than one lock`)
    return [...owners][0]
  }

  // A region belongs to the lock whose authored region its cells stand in; the carve seats a door as a room of
  // the region it enters, so a door belongs to the lock whose mechanism opens it instead.
  const regionOwner = new Map<RegionId, Owner>()
  for (const region of lock.regions)
    regionOwner.set(
      region,
      only(new Set([...(labels.get(region) ?? [])].map(label => instanceOfLabel.get(label) ?? FLOOR)), region) ?? FLOOR
    )
  const mechanismOwner = new Map<string, Owner | undefined>()
  for (const [id, mechanism] of Object.entries(lock.mechanisms))
    mechanismOwner.set(
      id,
      only(new Set([...mechanism.transitions, ...(mechanism.entries ?? [])].map(t => regionOwner.get(t.at)!)), id)
    )

  const opening = (region: RegionId): Owner | undefined =>
    only(
      new Set(
        Object.values(lock.gates)
          .filter(gate => gate.from === region || gate.to === region)
          .flatMap(gate => gate.owners.map(owner => mechanismOwner.get(owner)))
          .filter((owner): owner is Owner => owner !== undefined)
      ),
      region
    )
  for (const region of lock.regions)
    if (isDoor(region)) regionOwner.set(region, opening(region) ?? regionOwner.get(region)!)

  const gateOwner = new Map<string, Owner>()
  for (const [id, gate] of Object.entries(lock.gates))
    gateOwner.set(
      id,
      only(
        new Set(
          gate.owners
            .flatMap(owner => (mechanismOwner.has(owner) ? [mechanismOwner.get(owner)] : []))
            .filter((o): o is Owner => o !== undefined)
        ),
        id
      ) ?? regionOwner.get(isDoor(gate.to) ? gate.to : gate.from)!
    )

  const portOf = (label: string): RegionId => {
    const found = lock.regions.filter(
      region => !isDoor(region) && !region.startsWith("tile ") && labels.get(region)?.has(label)
    )
    if (found.length !== 1) throw new Entangled(`${label} is not one region of the floor`)
    return found[0]
  }
  const within = (owner: Owner, node: Owner): boolean => {
    for (let at: Owner | undefined = owner; at !== undefined; at = at === FLOOR ? undefined : hostOf.get(at)) {
      if (at === node) return true
    }
    return false
  }
  return { lock, regionOwner, gateOwner, mechanismOwner, portOf, within }
}

// THE LOCKS UNDER ONE NODE AS A SPEC OF THEIR OWN. The node's own gates and mechanisms stay real. A lock nested
// beneath it is ground: its gates stand open and its mechanisms are gone, because `nestedFree` has already
// asked whether anything it shuts could ever keep the node from the ground it joins up.
const levelOf = (cut: Cut, node: Owner, nesting: FloorGrid["lockNesting"]): LockSpec => {
  const { lock } = cut
  const scope = new Set(lock.regions.filter(region => cut.within(cut.regionOwner.get(region)!, node)))
  const gates: LockSpec["gates"] = {}
  const opened: { a: RegionId; b: RegionId }[] = []
  for (const [id, gate] of Object.entries(lock.gates)) {
    const owner = cut.gateOwner.get(id)!
    if (!cut.within(owner, node)) continue
    if (owner === node) gates[id] = gate
    else opened.push({ a: gate.from, b: gate.to })
  }
  const sealed = new Set(Object.values(gates).flatMap(gate => gate.owners))
  const mechanisms = Object.fromEntries(
    Object.entries(lock.mechanisms).filter(([id]) =>
      cut.mechanismOwner.get(id) === undefined ? sealed.has(id) : cut.mechanismOwner.get(id) === node
    )
  )
  const regions = new Set(scope)
  for (const gate of Object.values(gates)) regions.add(gate.from).add(gate.to)
  const own = node === FLOOR ? undefined : nesting?.find(n => n.instance === node)
  const port = own ? cut.portOf(own.in) : undefined
  return {
    regions: lock.regions.filter(region => regions.has(region)),
    gates,
    mechanisms,
    oneWays: (lock.oneWays ?? []).filter(({ from, to }) => scope.has(from) && scope.has(to)),
    passages: [...(lock.passages ?? []).filter(({ a, b }) => scope.has(a) && scope.has(b)), ...opened],
    in: port ?? lock.in,
    out: port ?? lock.out,
  }
}

// WHETHER THE HOST CAN WALK ACROSS A NESTED LOCK AS GROUND. The host joins up the lock's regions with its own
// edges, so the ground it can walk is every position the open graph reaches from where the player stands. That
// stays true only if, from every state the lock can reach, each place the host (or the lock's own gates) leaves
// the lock by is as reachable as it is on that open ground. A one-shot torch that shuts the door behind the
// player, or a lever in a place the door then cuts off, breaks it, and the walk says where.
const nestedFree = (cut: Cut, instance: string, spec: LockSpec): { states: number } | { failure: FloorWalkFailure } => {
  const problem = checkLockSpec(spec)
  if (problem) return { failure: { type: "entangled", problem } }
  const inside = new Set(cut.lock.regions.filter(region => cut.within(cut.regionOwner.get(region)!, instance)))
  const terminals = new Set<RegionId>([spec.in])
  const edge = (a: RegionId, b: RegionId) => {
    if (inside.has(a) !== inside.has(b)) terminals.add(inside.has(a) ? a : b)
  }
  for (const [id, gate] of Object.entries(cut.lock.gates)) {
    if (cut.within(cut.gateOwner.get(id)!, instance)) {
      for (const end of [gate.from, gate.to]) if (!inside.has(end)) terminals.add(end)
    } else edge(gate.from, gate.to)
  }
  for (const { a, b } of cut.lock.passages ?? []) edge(a, b)
  for (const { from, to } of cut.lock.oneWays ?? []) edge(from, to)

  const found = reachableStates(spec)
  if (found === "tooLarge") return { failure: { type: "tooLarge" } }
  const { order, edges } = found

  const joined = new Map<RegionId, RegionId[]>()
  const join = (from: RegionId, to: RegionId) => joined.set(from, [...(joined.get(from) ?? []), to])
  for (const gate of Object.values(spec.gates)) {
    join(gate.from, gate.to)
    join(gate.to, gate.from)
  }
  for (const { a, b } of spec.passages ?? []) {
    join(a, b)
    join(b, a)
  }
  for (const { from, to } of spec.oneWays ?? []) join(from, to)
  const groundFrom = (start: RegionId): Set<RegionId> => {
    const seen = new Set([start])
    const queue = [start]
    for (let at = 0; at < queue.length; at++)
      for (const next of joined.get(queue[at]) ?? [])
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
    return seen
  }

  const backwards: number[][] = order.map(() => [])
  edges.forEach((tos, from) => tos.forEach(to => backwards[to].push(from)))
  const reaching = new Map<RegionId, Set<number>>()
  for (const terminal of terminals) {
    const seen = new Set<number>()
    const queue: number[] = []
    order.forEach((state, n) => {
      if (state.region !== terminal) return
      seen.add(n)
      queue.push(n)
    })
    for (let at = 0; at < queue.length; at++)
      for (const from of backwards[queue[at]])
        if (!seen.has(from)) {
          seen.add(from)
          queue.push(from)
        }
    reaching.set(terminal, seen)
  }

  const ground = new Map<RegionId, Set<RegionId>>()
  for (let n = 0; n < order.length; n++) {
    const at = order[n].region
    const reachable = ground.get(at) ?? groundFrom(at)
    ground.set(at, reachable)
    for (const terminal of terminals)
      if (reachable.has(terminal) && !reaching.get(terminal)!.has(n))
        return { failure: { type: "notFree", at: order[n], cannotReach: terminal } }
  }
  return { states: order.length }
}

/**
 * THE FLOOR'S LOCK CUT INTO ONE SPEC PER LEVEL, or why it cannot be. A nested lock is checked on its own
 * (`nestedFree`); the level above it then walks it as open ground.
 *
 * That is exact for what the host can do. Nothing outside a lock throws its mechanisms or opens its gates, and
 * `nestedFree` guarantees that wherever the player stands inside it, every place the open ground lets them reach
 * by way of its edges to the host is one the real lock lets them reach too. So whether the host can finish from a
 * position is the same on open ground as against the real lock, with none of the lock's states in the host's.
 */
const levelsOf = (
  grid: FloorGrid,
  lock: LockSpec
): { ok: true; levels: Level[]; counts: Record<string, number> } | { ok: false; failure: FloorWalkFailure } => {
  const cut = cutOf(grid, lock)
  const counts: Record<string, number> = {}
  const levels: Level[] = []
  for (const { instance } of grid.lockNesting ?? []) {
    const spec = levelOf(cut, instance, grid.lockNesting)
    const free = nestedFree(cut, instance, spec)
    if ("failure" in free) return { ok: false, failure: { type: "nested", instance, failure: free.failure } }
    counts[instance] = free.states
    levels.push({ instance, spec })
  }
  levels.push({ instance: undefined, spec: levelOf(cut, FLOOR, grid.lockNesting) })
  return { ok: true, levels, counts }
}

const compose = (grid: FloorGrid, lock: LockSpec) => {
  try {
    return levelsOf(grid, lock)
  } catch (error) {
    if (error instanceof Entangled)
      return { ok: false as const, failure: { type: "entangled" as const, problem: error.message } }
    throw error
  }
}

// A nested level is built without the way out's `leaveWith`, so a floor that nests locks and holds stones cannot
// be walked soundly: the walk refuses it, and the dead-region check, which has no failure to report, finds nothing.
const holdsStones = (lock: LockSpec) => (lock.leaveWith ?? []).length > 0
const STONES_NESTED: FloorWalkFailure = { type: "entangled", problem: "stones on a floor with nested locks" }

/**
 * THE FLOOR'S LOCK WALKED: sound only when every nested lock is free by itself and the floor's own level is sound
 * with each nested lock as ground. Without nesting it is `walkLock` over the whole lock, unchanged. `undefined`
 * when the floor has no mechanism.
 */
export const walkFloorLock = (grid: FloorGrid): FloorWalkResult | undefined => {
  const lock = floorLock(grid)
  if (!lock) return undefined
  if (!grid.lockNesting || grid.lockNesting.length === 0) return walkLock(lock)
  if (holdsStones(lock)) return { sound: false, failure: STONES_NESTED }
  const composed = compose(grid, lock)
  if (!composed.ok) return { sound: false, failure: composed.failure }
  const walk = walkLock(composed.levels[composed.levels.length - 1].spec)
  return walk.sound ? { sound: true, states: walk.states, nested: composed.counts } : walk
}

/** The regions no reachable state stands in, each level asked on its own; the whole lock's when nothing is nested. */
export const deadFloorRegions = (grid: FloorGrid): RegionId[] => {
  const lock = floorLock(grid)
  if (!lock) return []
  if (!grid.lockNesting || grid.lockNesting.length === 0) return deadRegions(lock)
  if (holdsStones(lock)) return []
  const composed = compose(grid, lock)
  return composed.ok ? composed.levels.flatMap(level => deadRegions(level.spec)) : []
}
