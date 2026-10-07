import type { Lock, LockMechanic } from "./lockAuthoring"
import {
  absorbUnladen,
  barriersOf,
  CARRY_TERMS,
  dropConditionsOn,
  isRegionGate,
  isUnladenGate,
  isWeightOwner,
  joinOf,
} from "./lockAuthoring"
import type { LooseMechanic, ResolveMechanicKind } from "./mechanics"
import { resolveMechanicKind } from "./mechanics"
import type { BarrierOrder, Control, Obstacle, TopologyFault } from "./obstacles"
import { isRegionGate as isRegionObstacle, topologyFaults } from "./obstacles"
import { PASSAGE_KIND } from "./passageRealisation"
import { REGION_BARRIER_KIND } from "./regionBarrierRealisation"
import type { RegionGraph } from "./regions"
import type { ForkDemand } from "./siteTypes"

/**
 * WHICH REALISATION EACH KIND OF CONTROL IS DRESSED AS, decided where a lock is placed and handed to the
 * compiler: the lock names none (docs/mods/mechanic-contract.md). Keyed by the control kind — "toggle",
 * "activator", "sequence", "fork-switch", "one-way", "weights" for the stone plates, "unladen" for a narrow passage, and "region-barrier" for the lock's barred regions — because within one lock all roles of a kind take
 * the same realisation. A kind the lock uses and the binding omits is refused, never defaulted.
 */
export type RealisationBinding = Readonly<Partial<Record<string, string>>>

/** The floor vocabulary a lock compiles into: spread onto a `FloorConfig` it is the lock, standing there. */
export type LockFragment = {
  regionLayout: RegionGraph
  forks: ForkDemand[]
  obstacles: Obstacle[]
  controls: Control[]
  barrierOrder: BarrierOrder[]
  /** Absent when the lock has no one-way. */
  oneWayRealisation?: string
  /** Absent when the lock bars no region, or its binding names no realisation for a region barrier. */
  regionBarrierRealisation?: string
}

/** EVERY WAY A LOCK IS REFUSED, each naming what to fix. Authored names, not compiled ones. */
export type LockFault =
  /** `at` says where the unknown region was written: a port, a connection, a gate, a mechanic, a one-way. */
  | { type: "namesNoRegion"; at: string; region: string }
  | { type: "connectionRepeated"; between: [string, string] }
  /** A gate and a one-way share an id; a connection names its barriers by one id space. */
  | { type: "barrierIdRepeated"; id: string }
  | { type: "barrierUndefined"; between: [string, string]; barrier: string }
  | { type: "barrierNamedTwice"; barrier: string }
  /** A barrier named on a connection stands between another pair of regions. */
  | { type: "barrierOffItsConnection"; barrier: string; between: [string, string] }
  /** An edge gate stands between two regions no declared connection joins. */
  | { type: "gateOnNoConnection"; barrier: string }
  /** An edge gate's connection is declared, but names no barrier. */
  | { type: "edgeGateUnnamed"; barrier: string }
  | { type: "regionGateOnConnection"; barrier: string; between: [string, string] }
  /** A one-way stands on a connection beside another barrier, which the floor vocabulary cannot say. */
  | { type: "oneWaySharesConnection"; between: [string, string]; barriers: string[] }
  | { type: "gateOwnerUnknown"; barrier: string; owner: string }
  /** A plate stands in a region the lock does not have. */
  | { type: "plateNamesNoRegion"; plate: string; region: string }
  /** A gate asks for empty hands on a lock with no stones. */
  | { type: "carryWithoutStones"; barrier: string }
  /** A gate lists an owner whose `opens` never names it. */
  | { type: "ownerNamesNoGate"; barrier: string; owner: string }
  | { type: "opensUnknownBarrier"; mechanic: string; state: string; barrier: string }
  /** `opens` names a one-way, which is always on and opened by nothing. */
  | { type: "opensNotAGate"; mechanic: string; state: string; barrier: string }
  /** A mechanic's `opens` names a gate that does not list it as an owner. */
  | { type: "opensGateNotOwned"; mechanic: string; barrier: string }
  | { type: "startsNotAState"; mechanic: string; starts: string }
  | { type: "statesNotTwo"; mechanic: string; states: string[] }
  /** A sequence's only state that opens anything is `done`. */
  | { type: "sequenceStateNotDone"; mechanic: string; state: string }
  /** Two fork-switches stand in one region, so one junction would have two operators. */
  | { type: "forkRegionShared"; region: string; mechanics: string[] }
  /** The build has no plug-in for this control kind. */
  | { type: "unknownControlKind"; mechanic: string; control: string }
  /** The kind is declared and not built yet: the lock is checked, and cannot be baked. */
  | { type: "unbuiltMechanic"; mechanic: string; control: string }
  /** The kind is declared built, but its plug-in has no compile rule, so baking would drop it. */
  | { type: "kindNotCompilable"; mechanic: string; control: string }
  /** The binding names no realisation for a kind the lock uses; `mechanics` are the ones that use it. */
  | { type: "unboundRole"; kind: string; mechanics: string[] }
  /** What the floor topology refuses of the compiled fragment, as it would on a floor. */
  | { type: "topology"; fault: TopologyFault }

export type CompileResult = { ok: true; fragment: LockFragment } | { ok: false; faults: LockFault[] }

export type CompileOptions = {
  /** The control kinds the build has: core's own by default, or a registry a test hands in with a kind added or removed. */
  kinds?: ResolveMechanicKind
  /** Prefixes every region, barrier and mechanic id, so a clone of one lock on a floor has names of its own. */
  namespace?: string
}

const looseOf = (mechanic: LockMechanic): LooseMechanic => mechanic

const keyOf = (a: string, b: string): string => JSON.stringify([a, b].sort())

const pairOf = (join: readonly [string, string]): [string, string] => [join[0], join[1]]

const opensOf = (mechanic: LooseMechanic): [string, readonly string[]][] => Object.entries(mechanic.opens ?? {})

const regionsOfMechanic = (mechanic: LooseMechanic): string[] => [
  ...(mechanic.in === undefined ? [] : [mechanic.in]),
  ...(mechanic.steps ?? []).map(step => step.in),
]

/** The control kinds a lock uses, each with the ids that use it. A one-way is a kind with no control. */
const kindsUsed = (lock: Lock): Map<string, string[]> => {
  const used = new Map<string, string[]>()
  const add = (kind: string, id: string) => used.set(kind, [...(used.get(kind) ?? []), id])
  for (const [id, mechanic] of Object.entries(lock.mechanics)) add(mechanic.control, id)
  for (const id of Object.keys(lock.oneWays ?? {})) add("one-way", id)
  if (lock.weights) add("weights", "stones")
  // A gate empty hands alone open is a passage to be dressed, unless it stands beside a drop that carries it.
  for (const [id, gate] of Object.entries(absorbUnladen(lock).lock.gates))
    if (isUnladenGate(gate)) add(PASSAGE_KIND, id)
  return used
}

/** EVERY WAY A LOCK CONTRADICTS ITSELF, answered from the lock alone — no floor, no binding. */
const lockFaults = (lock: Lock, kinds: ResolveMechanicKind): LockFault[] => {
  const faults: LockFault[] = []
  const regions = new Set(Object.keys(lock.regions))
  const need = (at: string, region: string) => {
    if (!regions.has(region)) faults.push({ type: "namesNoRegion", at, region })
  }
  const oneWays = lock.oneWays ?? {}
  need("port in", lock.in)
  need("port out", lock.out)

  for (const id of Object.keys(lock.gates)) if (id in oneWays) faults.push({ type: "barrierIdRepeated", id })

  const declared = new Set<string>()
  const namedOn = new Map<string, number>()
  for (const connection of lock.connections) {
    const join = pairOf(joinOf(connection))
    const [a, b] = join
    need(`connection ${a}-${b}`, a)
    need(`connection ${a}-${b}`, b)
    const key = keyOf(a, b)
    if (declared.has(key)) {
      faults.push({ type: "connectionRepeated", between: join })
      continue
    }
    declared.add(key)
    const barriers = barriersOf(connection)
    for (const barrier of barriers) {
      namedOn.set(barrier, (namedOn.get(barrier) ?? 0) + 1)
      const gate = lock.gates[barrier]
      const oneWay = oneWays[barrier]
      if (!gate && !oneWay) faults.push({ type: "barrierUndefined", between: join, barrier })
      else if (gate && isRegionGate(gate)) faults.push({ type: "regionGateOnConnection", barrier, between: join })
      else {
        const standing = gate && !isRegionGate(gate) ? gate : oneWay
        if (standing && keyOf(standing.from, standing.to) !== key)
          faults.push({ type: "barrierOffItsConnection", barrier, between: join })
      }
    }
    // Empty hands beside a drop are the drop's own condition (`absorbUnladen`), not a second barrier on it.
    const conditions = dropConditionsOn(lock, barriers)
    const standing = barriers.filter(
      barrier => barrier in oneWays || (barrier in lock.gates && !conditions.includes(barrier))
    )
    if (standing.some(barrier => barrier in oneWays) && standing.length > 1)
      faults.push({ type: "oneWaySharesConnection", between: join, barriers: standing })
  }
  for (const [barrier, count] of namedOn) if (count > 1) faults.push({ type: "barrierNamedTwice", barrier })

  const owners = new Map<string, readonly string[]>()
  for (const [id, gate] of Object.entries(lock.gates)) {
    owners.set(id, gate.owners)
    for (const owner of gate.owners) {
      if (isWeightOwner(lock, owner)) {
        if (!lock.weights && (CARRY_TERMS as readonly string[]).includes(owner))
          faults.push({ type: "carryWithoutStones", barrier: id })
        continue
      }
      if (!(owner in lock.mechanics)) faults.push({ type: "gateOwnerUnknown", barrier: id, owner })
    }
    if (isRegionGate(gate)) {
      need(`gate ${id}`, gate.region)
      continue
    }
    need(`gate ${id}`, gate.from)
    need(`gate ${id}`, gate.to)
    if (!declared.has(keyOf(gate.from, gate.to))) faults.push({ type: "gateOnNoConnection", barrier: id })
    else if (!namedOn.has(id)) faults.push({ type: "edgeGateUnnamed", barrier: id })
  }
  for (const [plate, { in: region }] of Object.entries(lock.weights?.plates ?? {}))
    if (!(region in lock.regions)) faults.push({ type: "plateNamesNoRegion", plate, region })
  for (const [id, oneWay] of Object.entries(oneWays)) {
    need(`oneWay ${id}`, oneWay.from)
    need(`oneWay ${id}`, oneWay.to)
  }

  const regionHolders = new Map<string, string[]>()
  for (const [id, mechanic] of Object.entries(lock.mechanics)) {
    const loose = looseOf(mechanic)
    const kind = kinds(loose.control)
    for (const region of regionsOfMechanic(loose)) need(`mechanic ${id}`, region)
    if (!kind) faults.push({ type: "unknownControlKind", mechanic: id, control: loose.control })
    if (kind?.oneToARegion && loose.in !== undefined)
      regionHolders.set(loose.in, [...(regionHolders.get(loose.in) ?? []), id])
    faults.push(...(kind?.faults?.(id, loose) ?? []))
    const named = new Set<string>()
    const unowned = new Set<string>()
    for (const [state, ids] of opensOf(loose)) {
      for (const barrier of ids) {
        if (!(barrier in lock.gates)) {
          faults.push(
            barrier in oneWays
              ? { type: "opensNotAGate", mechanic: id, state, barrier }
              : { type: "opensUnknownBarrier", mechanic: id, state, barrier }
          )
          continue
        }
        named.add(barrier)
        if (!owners.get(barrier)?.includes(id) && !unowned.has(barrier)) {
          unowned.add(barrier)
          faults.push({ type: "opensGateNotOwned", mechanic: id, barrier })
        }
      }
    }
    for (const [barrier, gateOwners] of owners)
      if (gateOwners.includes(id) && kind && kind.gates !== "owns" && !named.has(barrier))
        faults.push({ type: "ownerNamesNoGate", barrier, owner: id })
  }
  for (const [region, mechanics] of regionHolders)
    if (mechanics.length > 1) faults.push({ type: "forkRegionShared", region, mechanics })

  if (lock.weights && !kinds("weights"))
    faults.push({ type: "unknownControlKind", mechanic: "stones", control: "weights" })
  if (Object.keys(oneWays).length > 0 && !kinds("one-way"))
    for (const id of Object.keys(oneWays)) faults.push({ type: "unknownControlKind", mechanic: id, control: "one-way" })
  return faults
}

const unbakeableFaults = (lock: Lock, kinds: ResolveMechanicKind): LockFault[] =>
  [...kindsUsed(lock)].flatMap(([control, ids]): LockFault[] => {
    const meta = kinds(control)
    if (meta?.built === false) return ids.map(mechanic => ({ type: "unbuiltMechanic" as const, mechanic, control }))
    if (meta?.built === true && !meta.compile && !meta.compileLock && !meta.effectOnly)
      return ids.map(mechanic => ({ type: "kindNotCompilable" as const, mechanic, control }))
    return []
  })

const unboundFaults = (lock: Lock, binding: RealisationBinding, kinds: ResolveMechanicKind): LockFault[] =>
  [...kindsUsed(lock)].flatMap(([kind, mechanics]) =>
    kinds(kind)?.built === true && !binding[kind] ? [{ type: "unboundRole" as const, kind, mechanics }] : []
  )

/**
 * THE LOCK IN THE FLOOR'S OWN VOCABULARY. Only called on a lock `lockFaults` passed, with every kind built.
 * The realisation of a kind is read from the binding and nowhere else; an absent one leaves the field empty,
 * which `compileLock` refuses before anyone sees the result.
 *
 * - region -> region of the layout, `takes` -> appetite; a connection -> a layout connection, unless a
 *   one-way stands on it, which is then a drop `from -> to` the layout does not join.
 * - an edge gate -> an edge obstacle, a region gate -> a region obstacle, `mode: "any"` kept as written; owners
 *   that are fork-switches go on the obstacle, every other owner names the gate in its `opens`.
 * - toggle / activator -> a two-state control (back and forth / no way back), `starts` its initial state.
 * - fork-switch -> a fork-switch control and the `forks` entry that lays its junction.
 * - sequence -> a sequence control; connection barriers -> `barrierOrder` where a connection has several.
 */
const translate = (
  authored: Lock,
  binding: RealisationBinding,
  namespace: string | undefined,
  kinds: ResolveMechanicKind
): LockFragment => {
  const { lock, unladen } = absorbUnladen(authored)
  const name = (id: string) => (namespace === undefined ? id : `${namespace}.${id}`)
  const oneWays = lock.oneWays ?? {}
  const standsAlone = new Set(
    lock.connections.flatMap(connection => barriersOf(connection).filter(barrier => barrier in oneWays))
  )
  const connections = lock.connections
    .filter(connection => !barriersOf(connection).some(barrier => standsAlone.has(barrier)))
    .map(connection => {
      const [a, b] = joinOf(connection)
      return [name(a), name(b)] as const
    })

  const obstacles: Obstacle[] = []
  for (const [id, gate] of Object.entries(lock.gates)) {
    const forkOwners = gate.owners
      .filter(owner => !isWeightOwner(lock, owner) && kinds(lock.mechanics[owner].control)?.gates === "owns")
      .map(name)
    const passage = isUnladenGate(gate) ? binding[PASSAGE_KIND] : undefined
    const terms = {
      ...(gate.mode === "any" ? { mode: "any" as const } : {}),
      ...(forkOwners.length > 0 ? { owners: forkOwners } : {}),
      ...(passage !== undefined ? { passage } : {}),
    }
    obstacles.push(
      isRegionGate(gate)
        ? { id: name(id), kind: "gate", at: { on: "region", region: name(gate.region) }, ...terms }
        : {
            id: name(id),
            kind: "gate",
            at: { on: "connection", between: [name(gate.from), name(gate.to)] },
            ...terms,
          }
    )
  }
  for (const [id, oneWay] of Object.entries(oneWays))
    obstacles.push({
      id: name(id),
      kind: "oneWay",
      at: { on: "connection", between: [name(oneWay.from), name(oneWay.to)] },
      ...(unladen.has(id) ? { unladen: true as const } : {}),
    })

  const controls: Control[] = []
  const forks: ForkDemand[] = []
  for (const [id, mechanic] of Object.entries(lock.mechanics)) {
    const compiled = kinds(mechanic.control)?.compile?.(id, mechanic, { name, binding })
    controls.push(...(compiled?.controls ?? []))
    forks.push(...(compiled?.forks ?? []))
  }
  if (lock.weights) controls.push(...(kinds("weights")?.compileLock?.(lock, { name, binding }).controls ?? []))

  const barrierOrder: BarrierOrder[] = lock.connections.flatMap(connection => {
    const barriers = barriersOf(connection)
    return barriers.length > 1
      ? [{ between: [name(joinOf(connection)[0]), name(joinOf(connection)[1])] as const, barriers: barriers.map(name) }]
      : []
  })

  const oneWayRealisation = Object.keys(oneWays).length > 0 ? binding["one-way"] : undefined
  const regionBarrierRealisation = obstacles.some(isRegionObstacle) ? binding[REGION_BARRIER_KIND] : undefined
  return {
    regionLayout: {
      regions: Object.entries(lock.regions).map(([region, { takes }]) => ({ name: name(region), appetite: takes })),
      connections,
      in: name(lock.in),
      out: name(lock.out),
    },
    forks,
    obstacles,
    controls,
    barrierOrder,
    ...(oneWayRealisation === undefined ? {} : { oneWayRealisation }),
    ...(regionBarrierRealisation === undefined ? {} : { regionBarrierRealisation }),
  }
}

const topologyOf = (lock: Lock, kinds: ResolveMechanicKind): LockFault[] => {
  const { regionLayout, obstacles, controls, forks, barrierOrder } = translate(lock, {}, undefined, kinds)
  return topologyFaults(regionLayout, obstacles, controls, forks, barrierOrder, kinds)
    .filter(fault => fault.type !== "forkSwitchNoEncounter")
    .map(fault => ({ type: "topology", fault }))
}

/**
 * EVERY WAY A LOCK IS REFUSED BY ITSELF — no floor, no binding. A lock using a kind that is declared and not
 * built yet passes: it is a design that can be checked, and `compileLock` is what refuses to bake it. Its
 * topology is then not asked, because there is nothing to translate it into.
 */
export const checkLock = (lock: Lock, kinds: ResolveMechanicKind = resolveMechanicKind): LockFault[] => {
  const faults = lockFaults(lock, kinds)
  if (faults.length > 0 || unbakeableFaults(lock, kinds).length > 0) return faults
  return topologyOf(lock, kinds)
}

/**
 * A LOCK BAKED INTO THE FLOOR'S VOCABULARY, or every reason it cannot be: its own faults, a mechanic whose kind
 * is not built (named), and each kind the binding leaves without a realisation (named; there is no default).
 */
export const compileLock = (lock: Lock, binding: RealisationBinding, options: CompileOptions = {}): CompileResult => {
  const kinds = options.kinds ?? resolveMechanicKind
  const faults = [...checkLock(lock, kinds), ...unbakeableFaults(lock, kinds), ...unboundFaults(lock, binding, kinds)]
  if (faults.length > 0) return { ok: false, faults }
  return { ok: true, fragment: translate(lock, binding, options.namespace, kinds) }
}
