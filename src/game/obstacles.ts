import type { RegionGraph } from "./regions"
import { offRouteChains, regionRoute } from "./regions"
import type { ForkDemand } from "./siteTypes"

/**
 * WHAT STANDS IN THE WAY, AND WHAT DECIDES WHETHER IT DOES — two separate things joined by an
 * authored id (docs/game-design/regions-and-containers.md).
 *
 * An obstacle is furniture the topology mod stands at a place in the floor's layout. A control is a
 * thing with named states. The wiring between them is the control's `opens`: which obstacles stand
 * open while it is in each state. Keeping them apart is what lets one control drive several
 * obstacles, several controls drive one, and a new kind of obstacle arrive without a new kind of
 * control.
 *
 * Core's RegionGraph names none of this. A region is core and a gate is the topology mod's, so the
 * mod points AT the layout by region name and never hangs anything on it.
 */
/** What every gate carries, whatever it bars. */
type GateTerms = {
  /** THE GATE'S OWN OPENING CONDITION, asked of every control that names it in any state. Absent: it
   * stands open only while EVERY such control is in a state naming it (`and`). `"any"`: while one is
   * (`or`). The same reading as `LockGate.mode` (lockWalk.ts), which the soundness walk folds by. */
  mode?: "any"
  /** THE CONTROLS THAT OWN THIS GATE, named from the gate's side rather than from `opens`. Only a
   * fork-switch (`ForkSwitchControl`) may be named here for now; a gate it owns appears in no control's `opens`. */
  owners?: string[]
  /** FLOOR KEYS THIS GATE ALSO ASKS FOR, each named by the section (label or position) whose floor-key
   * gate wants it. A floor key is an activator, so it owns the gate beside its controls: under `and` the
   * gate stands open only while the key is held too, under `any` the key alone is enough. Only a gate
   * some control owns takes one. */
  floorKeys?: string[]
}

/** A boundary a control can hold open or shut. `between` is unordered — a gate is passable from
 * either side once it stands open — and is checked against the layout's own connections: a gate
 * stands only where the two regions already touch. */
export type EdgeGateObstacle = GateTerms & {
  id: string
  kind: "gate"
  at: { on: "connection"; between: readonly [string, string] }
}

/** A barrier over a whole region — flooded, buried — rather than over a boundary. The carve stands it
 * inside the region, a short stretch in from each entrance, so the player sees the first stretch, the
 * blockage and nothing beyond (docs/mods/mechanic-contract.md, "Impassable regions"). Owned like any
 * gate: a control names its id in `opens`. */
export type RegionGateObstacle = GateTerms & {
  id: string
  kind: "gate"
  at: { on: "region"; region: string }
}

export type GateObstacle = EdgeGateObstacle | RegionGateObstacle

export const isRegionGate = (obstacle: Obstacle): obstacle is RegionGateObstacle =>
  obstacle.kind === "gate" && obstacle.at.on === "region"

export const isEdgeGate = (obstacle: Obstacle): obstacle is EdgeGateObstacle =>
  obstacle.kind === "gate" && obstacle.at.on === "connection"

/**
 * A DIRECTED PASSAGE THE CARVE PLACES, NOT ONE THE LAYOUT ALREADY JOINS — the region-addressed form
 * of `FloorConfig.oneWays` (brainstorm A1, docs/game-design/floor-as-puzzle-brainstorm.md), pointing
 * at `regionLayout` by region name the way a gate does. `between` is ORDERED: `[0]` is where a
 * player falls from, `[1]` where they land — the opposite of a gate, where the two regions need not
 * already share a connection at all, since a drop's whole point is a shortcut between two regions the
 * layout does not otherwise join.
 *
 * No control owns one yet: until a control can express which way a one-way runs (see `Control.opens`),
 * its direction is whatever it was authored with, permanently.
 */
export type OneWayObstacle = {
  id: string
  kind: "oneWay"
  at: { on: "connection"; between: readonly [string, string] }
}

/** WHAT STANDS IN THE WAY. One union, exhaustively checked, meant to grow. */
export type Obstacle = GateObstacle | OneWayObstacle

/**
 * A MECHANISM AS THE AUTHOR WRITES IT. `states`/`initial`/`returnsToInitial` are MechanismRecord's,
 * and `opens` is lockWalk's Mechanism.opens one layer up — the same vocabulary, so nothing has to be
 * translated between what is authored and what is walked.
 */
export type StatefulControl = {
  id: string
  /** Absent: this is a control with states of its own, not a `ForkSwitchControl`. */
  control?: undefined
  /** The region the control stands in. A region, not a section address: the mod points at the layout. */
  in: string
  states: string[]
  initial: string
  returnsToInitial: boolean
  /** Which GATE obstacles stand OPEN in each state. A state listing none shuts every gate this
   * control owns. Keys are states, values are obstacle ids.
   *
   * A ONE-WAY OBSTACLE CANNOT NAME ITSELF HERE. "Stands open" is a boolean, and a one-way's condition
   * is a direction, which is not one — widening this to also carry a direction would need its own
   * shape (an id paired with which way, not a bare id) rather than reinterpreting "present in the
   * list" for one kind and not the other, which is exactly the gate case getting worse for a case
   * nothing yet asks for. Deferred until a floor actually needs a control that reverses a drop; until
   * then a one-way's direction is whatever it was authored with, permanently, and `topologyFaults`
   * refuses a control that names one here the same way it refuses one naming nothing at all. */
  opens: Record<string, string[]>
  /** The family whose room the player taps. Defaults to the handle. The behaviour is `states`; this is
   * only what stands there — and, today, only for whatever THAT family reads off the room (its own
   * encounter logic), not for what the map DRAWS: the room's tags are still the handle's, so
   * `shapeKindFor` (nodeKinds.ts) and the lever art render it as a lever regardless of `encounter`. A
   * control authored with its own encounter taps that family's behaviour but still looks like a lever. */
  encounter?: string
}

/**
 * A PUZZLE STANDING IN A FORK'S JUNCTION, which operates that junction. It names no targets and counts no
 * states: the gates name it in their `owners`, each must be a seam of the fork `forks: [{ in }]` lays in
 * this region, and its states are rest plus one per seam. `encounter` is required — which board stands in
 * the junction is the author's to say, never a silent default.
 */
export type ForkSwitchControl = {
  id: string
  in: string
  control: "fork-switch"
  encounter: string
}

/**
 * TILES WALKED IN ORDER, with a reset at the door. One control however many tiles: `steps` is the order
 * and each names the region its tile stands in, so two steps in one region are two tiles there. It names
 * no `in` and counts no states — its states follow from the steps (sequence.ts) — and the carve picks the
 * hieroglyphs. `opens.done` is what the finished order opens; `resetAt` is one of those gates (an edge
 * gate, so it has one door to read the order at and start again from).
 */
export type SequenceControl = {
  id: string
  control: "sequence"
  steps: { in: string }[]
  resetAt: string
  opens: { done: string[] }
  /** A sequence names no encounter: its tiles are not a family's rooms. */
  encounter?: undefined
}

export type Control = StatefulControl | ForkSwitchControl | SequenceControl

export const isForkSwitch = (control: Control): control is ForkSwitchControl => control.control === "fork-switch"

export const isSequence = (control: Control): control is SequenceControl => control.control === "sequence"

/**
 * THE ORDER OF THE GATES STANDING ON ONE CONNECTION, written from `between[0]` to `between[1]`. Stated
 * only where a connection carries more than one gate: with one there is nothing to order, and with
 * several no default is guessed. The carve keeps this order and chooses the spacing.
 */
export type BarrierOrder = { between: readonly [string, string]; barriers: readonly string[] }

export type TopologyFault =
  | { type: "obstacleIdRepeated"; id: string }
  | { type: "obstacleNamesNoConnection"; id: string }
  /** A one-way obstacle's `between` names a region this floor's layout does not declare. Unlike a
   * gate, a one-way need not already share a connection with the region it names — that is what a
   * drop is for — so this is the only structural question left to ask of it. */
  | { type: "obstacleNamesNoRegion"; id: string }
  | { type: "obstacleOffRoute"; id: string }
  | { type: "obstacleUnowned"; id: string }
  | { type: "controlUnsatisfied"; id: string; what: string }
  /** A fork-switch stands in a region no `forks: [{ in }]` entry lays a junction in. */
  | { type: "forkSwitchNoFork"; id: string; region: string }
  /** A fork-switch authored without the encounter that stands in its junction. */
  | { type: "forkSwitchNoEncounter"; id: string }
  /** A gate's `owners` names something that is not a fork-switch of this floor; `id` is the gate. */
  | { type: "gateOwnerNotForkSwitch"; id: string; owner: string }
  /** A gate owned by a fork-switch is not a seam leaving that fork's region; `id` is the gate. */
  | { type: "gateOwnedOffSeam"; id: string; owner: string }
  /** A gate is owned by a fork-switch and also named in a control's `opens`; `id` is the gate. */
  | { type: "gateOwnedTwice"; id: string; owner: string }
  /** A seam of a fork-switch's fork carries no gate it owns, so rest could not shut that exit. */
  | { type: "forkSwitchSeamUngated"; id: string; between: [string, string] }
  /** A seam of a fork-switch's fork carries several gates it owns, so its exit has no single key. */
  | { type: "forkSwitchSeamGatedTwice"; id: string; between: [string, string] }
  /** A region barrier bars the region holding the layout's way in or way out, which would shut the lock
   * on its own ends; `id` is the barrier. */
  | { type: "regionBarrierHoldsPort"; id: string; region: string; port: "in" | "out" }
  /** A control stands in a region one of its own `opens` bars outright, so it would put itself beyond
   * reach and nothing could undo it; `id` is the control, `barrier` the region barrier it names. */
  | { type: "mechanicStandsInBarredRegion"; id: string; region: string; barrier: string }
  /** A drop lands in a barred region, an entrance the carve cannot stand a barrier across; `id` is the
   * barrier, `drop` the one-way obstacle. */
  | { type: "regionBarrierDropLands"; id: string; region: string; drop: string }
  /** A sequence with fewer than two steps is a single plate, which is a torch; `id` is the sequence. */
  | { type: "sequenceTooShort"; id: string }
  /** A sequence's step names a region this floor's layout does not declare. */
  | { type: "sequenceStepNamesNoRegion"; id: string; step: number }
  /** A sequence's `opens` names something that is not a gate of this floor; `gate` is what it named. */
  | { type: "sequenceOpensNotAGate"; id: string; gate: string }
  /** A sequence's `resetAt` is not an edge gate, so there is no one door to start again at. */
  | { type: "sequenceResetNotAGate"; id: string; gate: string }
  /** A sequence's `resetAt` is a gate, but not one the sequence opens. */
  | { type: "sequenceResetNotOpened"; id: string; gate: string }
  /** A step's region cannot be reached without passing a gate this sequence opens, so its tile could
   * never be walked before the order is done. */
  | { type: "sequenceStepBehindOwnDoor"; id: string; step: number }
  /** A `barrierOrder` entry names a pair of regions the layout does not join. */
  | { type: "barrierOrderNamesNoConnection"; between: [string, string] }
  /** Two `barrierOrder` entries state the order of one connection. */
  | { type: "barrierOrderRepeated"; between: [string, string] }
  /** A `barrierOrder` names an id no obstacle defines; `between` is the connection it was written under. */
  | { type: "barrierNotDefined"; id: string; between: [string, string] }
  /** A `barrierOrder` names an obstacle that is not an edge gate on the connection it was written under. */
  | { type: "barrierNotOnConnection"; id: string; between: [string, string] }
  /** A `barrierOrder` lists one gate twice. */
  | { type: "barrierListedTwice"; id: string; between: [string, string] }
  /** A gate stands on a connection with several gates and its order does not state it, so where it
   * stands among them is a guess nobody wrote; `between` is the gate's own connection. */
  | { type: "barrierUnordered"; id: string; between: [string, string] }
  /** A gate a fork-switch owns is not the first on its connection from the fork's side, so the player
   * would meet another barrier before the door the junction operates; `id` is the gate. */
  | { type: "forkGateNotFirst"; id: string; owner: string; between: [string, string] }

/** The two ends of a connection in a stable order, so `["a","b"]` and `["b","a"]` are one connection. */
const connectionKey = (a: string, b: string): string => JSON.stringify([a, b].sort())

/**
 * EVERY WAY ONE SEQUENCE DOES NOT RESOLVE, from the config alone. Reachability is asked of the layout with
 * the gates this sequence opens taken away, ignoring every other control: a tile that cannot be reached
 * even when nothing else stands in the way is a tile behind its own door.
 */
const sequenceFaults = (
  sequence: SequenceControl,
  layout: RegionGraph,
  obstacleById: ReadonlyMap<string, Obstacle>,
  drops: ReadonlyArray<readonly [string, string]>
): TopologyFault[] => {
  const faults: TopologyFault[] = []
  const { id, steps, resetAt } = sequence
  const opened = sequence.opens.done ?? []
  const regions = new Set(layout.regions.map(r => r.name))
  if (steps.length < 2) faults.push({ type: "sequenceTooShort", id })
  steps.forEach((step, n) => {
    if (!regions.has(step.in)) faults.push({ type: "sequenceStepNamesNoRegion", id, step: n })
  })
  const shutByThis = new Set<string>()
  const barredByThis = new Set<string>()
  for (const gate of opened) {
    const obstacle = obstacleById.get(gate)
    if (!obstacle || obstacle.kind !== "gate") faults.push({ type: "sequenceOpensNotAGate", id, gate })
    else if (isRegionGate(obstacle)) barredByThis.add(obstacle.at.region)
    else shutByThis.add(connectionKey(obstacle.at.between[0], obstacle.at.between[1]))
  }
  const reset = obstacleById.get(resetAt)
  if (!reset || !isEdgeGate(reset)) faults.push({ type: "sequenceResetNotAGate", id, gate: resetAt })
  else if (!opened.includes(resetAt)) faults.push({ type: "sequenceResetNotOpened", id, gate: resetAt })

  const neighbours = new Map<string, string[]>()
  const join = (from: string, to: string) => neighbours.set(from, [...(neighbours.get(from) ?? []), to])
  for (const [a, b] of layout.connections)
    if (!shutByThis.has(connectionKey(a, b))) {
      join(a, b)
      join(b, a)
    }
  for (const [from, to] of drops) join(from, to)
  const seen = new Set<string>()
  const queue = barredByThis.has(layout.in) ? [] : [layout.in]
  for (const region of queue) seen.add(region)
  for (let at = 0; at < queue.length; at++)
    for (const next of neighbours.get(queue[at]) ?? [])
      if (!seen.has(next) && !barredByThis.has(next)) {
        seen.add(next)
        queue.push(next)
      }
  steps.forEach((step, n) => {
    if (regions.has(step.in) && !seen.has(step.in)) faults.push({ type: "sequenceStepBehindOwnDoor", id, step: n })
  })
  return faults
}

/**
 * EVERY WAY THE AUTHORED TOPOLOGY DOES NOT RESOLVE, answered from the config alone so it is refused
 * before a wall is carved. Nothing here depends on a seed: which regions exist, what joins them and
 * which route the main path threads are all fixed by the config.
 *
 * `obstacleOffRoute` is the honest limit of what the carve can actually stand a gate at: a seam is a
 * connection two adjacent cells meet along, and cells meet along the main path AND along a side
 * path's own chain — the mouth where it leaves its parent region, and every join within it
 * (offRouteChains, regions.ts, the same order `regionOfStep` distributes a chain's own cells in). A
 * connection genuinely off both is still refused: e.g. one touching a branch's SECOND meeting with the
 * route, which the carve never turns into a physical join (`offRouteChains` picks one mouth, not two).
 */
export const topologyFaults = (
  layout: RegionGraph | undefined,
  obstacles: readonly Obstacle[],
  controls: readonly Control[],
  forks: readonly ForkDemand[] = [],
  barrierOrder: readonly BarrierOrder[] = []
): TopologyFault[] => {
  const faults: TopologyFault[] = []
  if (obstacles.length === 0 && controls.length === 0 && barrierOrder.length === 0) return faults
  if (!layout) {
    for (const { between } of barrierOrder)
      faults.push({ type: "barrierOrderNamesNoConnection", between: [between[0], between[1]] })
    for (const o of obstacles)
      faults.push(
        o.kind === "oneWay" || isRegionGate(o)
          ? { type: "obstacleNamesNoRegion", id: o.id }
          : { type: "obstacleNamesNoConnection", id: o.id }
      )
    for (const c of controls)
      faults.push({ type: "controlUnsatisfied", id: c.id, what: isSequence(c) ? (c.steps[0]?.in ?? c.id) : c.in })
    return faults
  }

  const joined = new Set(layout.connections.map(([a, b]) => connectionKey(a, b)))
  const drops = obstacles.flatMap(o => (o.kind === "oneWay" ? [[o.at.between[0], o.at.between[1]] as const] : []))
  const route = regionRoute(layout)
  const seatable = new Set<string>()
  for (let i = 0; i < route.length - 1; i++) seatable.add(connectionKey(route[i], route[i + 1]))
  for (const { mouth, regions } of offRouteChains(layout, drops)) {
    const ordered = [mouth, ...regions]
    for (let i = 0; i < ordered.length - 1; i++) seatable.add(connectionKey(ordered[i], ordered[i + 1]))
  }
  const regions = new Set(layout.regions.map(r => r.name))

  const seenObstacle = new Set<string>()
  const obstacleById = new Map<string, Obstacle>()
  for (const obstacle of obstacles) {
    if (seenObstacle.has(obstacle.id)) faults.push({ type: "obstacleIdRepeated", id: obstacle.id })
    seenObstacle.add(obstacle.id)
    obstacleById.set(obstacle.id, obstacle)
    if (isRegionGate(obstacle)) {
      const { region } = obstacle.at
      if (!regions.has(region)) {
        faults.push({ type: "obstacleNamesNoRegion", id: obstacle.id })
        continue
      }
      if (layout.in === region) faults.push({ type: "regionBarrierHoldsPort", id: obstacle.id, region, port: "in" })
      if (layout.out === region) faults.push({ type: "regionBarrierHoldsPort", id: obstacle.id, region, port: "out" })
      for (const drop of obstacles)
        if (drop.kind === "oneWay" && drop.at.between[1] === region)
          faults.push({ type: "regionBarrierDropLands", id: obstacle.id, region, drop: drop.id })
      continue
    }
    const [a, b] = obstacle.at.between
    if (obstacle.kind === "oneWay") {
      // A DROP JOINS TWO REGIONS ON PURPOSE THE LAYOUT NEVER DOES — that is the whole of what it is
      // for, so the connection/seam questions a gate asks below (`joined`, `seatable`) do not apply
      // to it. The only structural question left is whether both ends are regions this floor has.
      if (!regions.has(a) || !regions.has(b)) faults.push({ type: "obstacleNamesNoRegion", id: obstacle.id })
      continue
    }
    const key = connectionKey(a, b)
    if (!joined.has(key)) faults.push({ type: "obstacleNamesNoConnection", id: obstacle.id })
    else if (!seatable.has(key)) faults.push({ type: "obstacleOffRoute", id: obstacle.id })
  }

  const owned = new Set<string>()
  const seenControl = new Set<string>()
  for (const control of controls) {
    if (seenControl.has(control.id)) faults.push({ type: "controlUnsatisfied", id: control.id, what: control.id })
    seenControl.add(control.id)
    if (isSequence(control)) {
      faults.push(...sequenceFaults(control, layout, obstacleById, drops))
      for (const id of control.opens.done ?? []) owned.add(id)
      continue
    }
    if (!regions.has(control.in)) faults.push({ type: "controlUnsatisfied", id: control.id, what: control.in })
    // A fork-switch has no states or `opens` to check; the gates name it, which is answered below.
    if (isForkSwitch(control)) continue
    const states = new Set(control.states)
    const barredHere = new Set<string>()
    if (!states.has(control.initial)) faults.push({ type: "controlUnsatisfied", id: control.id, what: control.initial })
    for (const [state, opens] of Object.entries(control.opens)) {
      if (!states.has(state)) faults.push({ type: "controlUnsatisfied", id: control.id, what: state })
      for (const id of opens) {
        const obstacle = obstacleById.get(id)
        // `opens` can only ever name a GATE (see Control.opens): a one-way's condition is a
        // direction, which "stands open" cannot express, so a control pointing at one is refused the
        // same way as one pointing at nothing at all.
        if (!obstacle || obstacle.kind !== "gate") faults.push({ type: "controlUnsatisfied", id: control.id, what: id })
        owned.add(id)
        // A control that bars the very region it stands in could not be reached to undo it, in any state
        // it names the barrier. Shutting an EDGE behind yourself stays allowed: the control is still in reach.
        if (obstacle && isRegionGate(obstacle) && obstacle.at.region === control.in && !barredHere.has(id)) {
          barredHere.add(id)
          faults.push({ type: "mechanicStandsInBarredRegion", id: control.id, region: control.in, barrier: id })
        }
      }
    }
  }

  // EVERY GATE HAS AN OWNER, which is checkLockSpec's rule (lockWalk.ts, "gate ... has no owner")
  // asked one layer earlier: a gate nothing opens is a wall, and a wall is authored as a layout with
  // no connection rather than as a gate nobody can pass. A one-way is exempt: it is meaningful with
  // no control at all, its direction simply fixed at whatever it was authored with.
  const forkSwitches = new Map(controls.filter(isForkSwitch).map(control => [control.id, control]))
  const seamsOf = new Map<string, Set<string>>()
  const seamsFor = (region: string): Set<string> => {
    const known = seamsOf.get(region)
    if (known) return known
    const seams = new Set(
      offRouteChains(layout, drops)
        .filter(
          ({ mouth, regions: led }) => mouth === region && led.length > 0 && joined.has(connectionKey(region, led[0]))
        )
        .map(({ regions: led }) => connectionKey(region, led[0]))
    )
    seamsOf.set(region, seams)
    return seams
  }
  const forkRegions = new Set(forks.flatMap(fork => ("in" in fork ? [fork.in] : [])))
  const opensGate = new Set(
    controls.flatMap(control => (isForkSwitch(control) ? [] : Object.values(control.opens).flat()))
  )
  const gatesOwnedBy = new Map<string, EdgeGateObstacle[]>()
  for (const obstacle of obstacles) {
    if (obstacle.kind !== "gate") continue
    for (const owner of obstacle.owners ?? []) {
      owned.add(obstacle.id)
      const fork = forkSwitches.get(owner)
      if (!fork) {
        faults.push({ type: "gateOwnerNotForkSwitch", id: obstacle.id, owner })
        continue
      }
      // A fork-switch's gates are its junction's seams, and a region barrier is no seam.
      if (isRegionGate(obstacle)) {
        faults.push({ type: "gateOwnedOffSeam", id: obstacle.id, owner })
        continue
      }
      gatesOwnedBy.set(owner, [...(gatesOwnedBy.get(owner) ?? []), obstacle])
      if (opensGate.has(obstacle.id)) faults.push({ type: "gateOwnedTwice", id: obstacle.id, owner })
      const key = connectionKey(obstacle.at.between[0], obstacle.at.between[1])
      if (regions.has(fork.in) && joined.has(key) && !seamsFor(fork.in).has(key))
        faults.push({ type: "gateOwnedOffSeam", id: obstacle.id, owner })
    }
  }
  for (const fork of forkSwitches.values()) {
    if (!fork.encounter) faults.push({ type: "forkSwitchNoEncounter", id: fork.id })
    if (!forkRegions.has(fork.in)) {
      faults.push({ type: "forkSwitchNoFork", id: fork.id, region: fork.in })
      continue
    }
    if (!regions.has(fork.in)) continue
    for (const seam of seamsFor(fork.in)) {
      const gates = (gatesOwnedBy.get(fork.id) ?? []).filter(
        gate => connectionKey(gate.at.between[0], gate.at.between[1]) === seam
      )
      const between: [string, string] = [fork.in, (JSON.parse(seam) as string[]).find(name => name !== fork.in)!]
      if (gates.length === 0) faults.push({ type: "forkSwitchSeamUngated", id: fork.id, between })
      if (gates.length > 1) faults.push({ type: "forkSwitchSeamGatedTwice", id: fork.id, between })
    }
  }

  faults.push(...barrierOrderFaults(joined, obstacleById, obstacles, barrierOrder, forkSwitches, gatesOwnedBy))

  for (const obstacle of obstacles)
    if (obstacle.kind === "gate" && !owned.has(obstacle.id)) faults.push({ type: "obstacleUnowned", id: obstacle.id })

  return faults
}

const pairOf = ([a, b]: readonly [string, string]): [string, string] => [a, b]

/**
 * EVERY WAY THE STATED ORDER OF A CONNECTION'S GATES DOES NOT RESOLVE. An id in an order must be a gate
 * defined on that very connection; a connection carrying several gates must state an order that lists
 * each exactly once; a gate a fork-switch owns must be first from the fork's side. A gate is always
 * placed by its own `at`, so "defined but standing nowhere" is `obstacleNamesNoConnection`,
 * `obstacleNamesNoRegion` and `obstacleOffRoute` above, never a gap the order could leave.
 */
const barrierOrderFaults = (
  joined: ReadonlySet<string>,
  obstacleById: ReadonlyMap<string, Obstacle>,
  obstacles: readonly Obstacle[],
  barrierOrder: readonly BarrierOrder[],
  forkSwitches: ReadonlyMap<string, ForkSwitchControl>,
  gatesOwnedBy: ReadonlyMap<string, EdgeGateObstacle[]>
): TopologyFault[] => {
  const faults: TopologyFault[] = []
  const orderOf = new Map<string, BarrierOrder>()
  for (const order of barrierOrder) {
    const between = pairOf(order.between)
    const key = connectionKey(...between)
    if (!joined.has(key)) {
      faults.push({ type: "barrierOrderNamesNoConnection", between })
      continue
    }
    if (orderOf.has(key)) {
      faults.push({ type: "barrierOrderRepeated", between })
      continue
    }
    orderOf.set(key, order)
    const listed = new Set<string>()
    for (const id of order.barriers) {
      if (listed.has(id)) {
        faults.push({ type: "barrierListedTwice", id, between })
        continue
      }
      listed.add(id)
      const obstacle = obstacleById.get(id)
      if (!obstacle) faults.push({ type: "barrierNotDefined", id, between })
      else if (!isEdgeGate(obstacle) || connectionKey(...obstacle.at.between) !== key)
        faults.push({ type: "barrierNotOnConnection", id, between })
    }
  }

  const gatesOn = new Map<string, EdgeGateObstacle[]>()
  for (const obstacle of obstacles)
    if (isEdgeGate(obstacle)) {
      const key = connectionKey(...obstacle.at.between)
      gatesOn.set(key, [...(gatesOn.get(key) ?? []), obstacle])
    }
  // A seam two of one fork's own gates stand on is already refused as `forkSwitchSeamGatedTwice`; an order
  // cannot mend it, so it is not refused a second time here for having none.
  const refusedAsForkSeam = new Set(
    [...gatesOwnedBy.values()].flatMap(owned => {
      const perSeam = new Map<string, number>()
      for (const gate of owned) {
        const key = connectionKey(...gate.at.between)
        perSeam.set(key, (perSeam.get(key) ?? 0) + 1)
      }
      return [...perSeam].filter(([, n]) => n > 1).map(([key]) => key)
    })
  )
  for (const [key, gates] of gatesOn) {
    if (gates.length < 2 || refusedAsForkSeam.has(key)) continue
    const listed = new Set(orderOf.get(key)?.barriers ?? [])
    for (const gate of gates)
      if (!listed.has(gate.id)) faults.push({ type: "barrierUnordered", id: gate.id, between: pairOf(gate.at.between) })
  }

  for (const [owner, gates] of [...forkSwitches].map(([id, fork]) => [fork, gatesOwnedBy.get(id) ?? []] as const)) {
    for (const gate of gates) {
      const key = connectionKey(...gate.at.between)
      const order = orderOf.get(key)
      if (!order || order.barriers.length < 2 || !order.barriers.includes(gate.id)) continue
      const first = order.between[0] === owner.in
      const standsFirst = first ? order.barriers[0] === gate.id : order.barriers[order.barriers.length - 1] === gate.id
      if (!standsFirst)
        faults.push({ type: "forkGateNotFirst", id: gate.id, owner: owner.id, between: pairOf(order.between) })
    }
  }
  return faults
}

/** A connection's gates, in the order they stand from `between[0]` to `between[1]`. */
export type BarrierRun = { between: readonly [string, string]; gates: EdgeGateObstacle[] }

/**
 * EVERY CONNECTION THAT CARRIES A GATE, with its gates in the order stated. A connection with one gate is
 * its own run; one with several is ordered by `barrierOrder`, which `topologyFaults` has already proven
 * lists each of them exactly once.
 */
export const barrierRuns = (obstacles: readonly Obstacle[], barrierOrder: readonly BarrierOrder[]): BarrierRun[] => {
  const byKey = new Map<string, EdgeGateObstacle[]>()
  for (const obstacle of obstacles.filter(isEdgeGate)) {
    const key = connectionKey(...obstacle.at.between)
    byKey.set(key, [...(byKey.get(key) ?? []), obstacle])
  }
  return [...byKey].map(([key, gates]) => {
    const order = barrierOrder.find(entry => connectionKey(...entry.between) === key)
    if (gates.length < 2 || !order) return { between: gates[0].at.between, gates }
    const byId = new Map(gates.map(gate => [gate.id, gate]))
    return { between: order.between, gates: order.barriers.flatMap(id => byId.get(id) ?? []) }
  })
}

/**
 * WHERE ONE CONNECTION'S GATES STAND ALONG A PATH, in the order stated — a pure question about a label
 * sequence, like `seamIndexFor`. The gate nearest the way in stands on the seam itself; each next one
 * stands on a later free step still inside the far region, so the stretch between two gates always has a
 * step of its own and a gate may stand halfway along a corridor. `free` says which steps nothing else
 * claims; content may therefore end up between two gates, and is never moved to or from there.
 *
 * Answers the steps in the order of `between` (`[0]` first), or `undefined` when the path cannot seat
 * them all: the gates are never reordered or put in another region.
 */
export const seatBarrierRun = (
  labels: ReadonlyArray<string | undefined>,
  between: readonly [string, string],
  count: number,
  free: (step: number) => boolean
): number[] | undefined => {
  const seam = seamIndexFor(labels, between)
  if (seam === undefined) return undefined
  const far = labels[seam]
  const steps = [seam]
  for (let step = seam + 1; step < labels.length && labels[step] === far && steps.length < count; step++)
    if (free(step)) steps.push(step)
  if (steps.length < count) return undefined
  return labels[seam - 1] === between[0] ? steps : steps.reverse()
}

/** Every region reached from `from` over `connections`, a four-line flood local to this module so
 * core's `regions.ts` never has to widen its own private `reachable` to answer the mod's question. */
const reachableOver = (connections: ReadonlyArray<readonly [string, string]>, from: string): Set<string> => {
  const neighbours = new Map<string, string[]>()
  for (const [a, b] of connections) {
    if (!neighbours.has(a)) neighbours.set(a, [])
    if (!neighbours.has(b)) neighbours.set(b, [])
    neighbours.get(a)!.push(b)
    neighbours.get(b)!.push(a)
  }
  const seen = new Set([from])
  const queue = [from]
  while (queue.length > 0) {
    for (const next of neighbours.get(queue.shift()!) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return seen
}

/**
 * THE OBSTACLES A PLAYER MUST PASS TO STAND IN EACH REGION — not the ones beside it.
 *
 * Asked by taking each obstacle's connection away in turn and seeing which regions the way in can
 * still reach: a region that becomes unreachable is one that obstacle bounds, and a region a player
 * can walk round to is bounded by nothing. That is the same remove-one question `mainPathRegions`
 * asks, asked of a connection instead of a region.
 *
 * Every declared region gets an entry, empty where nothing bounds it, so a caller never has to decide
 * what an absent one means.
 */
export const doorsToEnterRegion = (layout: RegionGraph, obstacles: readonly Obstacle[]): Map<string, Set<string>> => {
  const doors = new Map(layout.regions.map(r => [r.name, new Set<string>()]))
  for (const obstacle of obstacles) {
    // A region barrier stands inside its region rather than on a connection, so no connection is its to take away.
    if (isRegionGate(obstacle)) continue
    const without = layout.connections.filter(
      ([a, b]) => connectionKey(a, b) !== connectionKey(obstacle.at.between[0], obstacle.at.between[1])
    )
    const arrived = reachableOver(without, layout.in)
    for (const { name } of layout.regions) if (!arrived.has(name)) doors.get(name)!.add(obstacle.id)
  }
  return doors
}

/**
 * THE MAIN-PATH INDEX WHERE ONE REGION STOPS AND THE NEXT BEGINS, for one obstacle's connection.
 * `stepRegion[step]` names the region each main-path step stands in; a connection's seam is the
 * first step whose region differs from the step before it, where the two disagree exactly on
 * `between` — order-independent, since `between` names a connection, not a direction. The gate
 * stands at the step returned (the first step of the far region).
 *
 * Answers `undefined` for a `between` this `stepRegion` cannot seat: either region absent
 * altogether, or — the case a gap-free `stepRegion` never produces, but this function does not
 * assume one — both present with something else's steps between them, so the two never actually
 * meet. A pure question about a label sequence, asked in isolation of whatever built it, is what
 * lets the "no seam" case be pinned down by a test rather than only inferred from a carve.
 */
export const seamIndexFor = (
  stepRegion: ReadonlyArray<string | undefined>,
  between: readonly [string, string]
): number | undefined => {
  const [a, b] = between
  for (let step = 1; step < stepRegion.length; step++) {
    const before = stepRegion[step - 1]
    const here = stepRegion[step]
    if (before === here) continue
    if ((before === a && here === b) || (before === b && here === a)) return step
  }
  return undefined
}

/**
 * WHETHER STEPPING BETWEEN TWO CELLS PASSES A DOOR — the question `edgeAllowed` asks of a leftover
 * maze edge, which is a bypass only where it SKIPS one.
 *
 * Two cells standing behind the same doors are two cells the player already moves between having
 * earned the same things, so an edge joining them opens nothing that was shut. That is exactly what a
 * region is: ground walked freely. An edge between different sets is still refused, including two
 * DIFFERENT doors — being past one earns nothing toward another.
 */
export const crossesNoDoor = (behindA: ReadonlySet<string>, behindB: ReadonlySet<string>): boolean => {
  if (behindA.size !== behindB.size) return false
  for (const door of behindA) if (!behindB.has(door)) return false
  return true
}

/**
 * WHERE ONE REGION BARRIER'S DOORS STAND ALONG ONE PATH — a pure question about a label sequence, so it
 * is answered and tested apart from the carve that supplies the labels. `labels[step]` names the region
 * each step stands in (a side chain has its mouth prefixed as step 0, the way `seamIndexFor` reads one).
 *
 * A barrier has one door per ENTRANCE: the join with the region standing before it on the path and,
 * where the path goes on, the one after. Each door stands inside the region with at least one of the
 * region's own steps in front of it from that entrance — the first stretch the player sees — and never
 * on its last step, so the far side of the door is never the end room or the next region. `free` says
 * which steps nothing else claims. Two entrances never share a door, so each is one blockage with its
 * own save slot.
 *
 * Answers `undefined` when the path does not hold the region or some entrance has no free step to stand
 * a door on: the barrier is never put anywhere else.
 */
export const seatBarrierDoors = (
  labels: ReadonlyArray<string | undefined>,
  region: string,
  free: (step: number) => boolean
): { entrance: string; step: number }[] | undefined => {
  const first = labels.indexOf(region)
  if (first < 0) return undefined
  const last = labels.lastIndexOf(region)
  const entrances: { neighbour: string; fromFirst: boolean }[] = []
  const before = labels[first - 1]
  if (before !== undefined) entrances.push({ neighbour: before, fromFirst: true })
  const after = labels[last + 1]
  if (after !== undefined) entrances.push({ neighbour: after, fromFirst: false })
  if (entrances.length === 0) return undefined
  const taken = new Set<number>()
  const doors: { entrance: string; step: number }[] = []
  for (const { neighbour, fromFirst } of entrances) {
    const inside = Array.from({ length: Math.max(0, last - first - 1) }, (_, k) => first + 1 + k)
    const step = (fromFirst ? inside : inside.reverse()).find(i => free(i) && !taken.has(i))
    if (step === undefined) return undefined
    taken.add(step)
    doors.push({ entrance: neighbour, step })
  }
  return doors
}
