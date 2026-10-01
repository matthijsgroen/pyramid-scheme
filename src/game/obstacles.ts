import type { RegionGraph } from "./regions"
import { offRouteChains, regionRoute } from "./regions"

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
/** A boundary a control can hold open or shut. `between` is unordered — a gate is passable from
 * either side once it stands open — and is checked against the layout's own connections: a gate
 * stands only where the two regions already touch. */
export type GateObstacle = {
  id: string
  kind: "gate"
  at: { on: "connection"; between: readonly [string, string] }
  /** THE GATE'S OWN OPENING CONDITION, asked of every control that names it in any state. Absent: it
   * stands open only while EVERY such control is in a state naming it (`and`). `"any"`: while one is
   * (`or`). The same reading as `LockGate.mode` (lockWalk.ts), which the soundness walk folds by. */
  mode?: "any"
}

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

/** WHAT STANDS IN THE WAY. One union, exhaustively checked, meant to grow: a flood that shuts a
 * region rather than a boundary is the next the catalogue already names. */
export type Obstacle = GateObstacle | OneWayObstacle

/**
 * A MECHANISM AS THE AUTHOR WRITES IT. `states`/`initial`/`returnsToInitial` are MechanismRecord's,
 * and `opens` is lockWalk's Mechanism.opens one layer up — the same vocabulary, so nothing has to be
 * translated between what is authored and what is walked.
 */
export type Control = {
  id: string
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

/** The two ends of a connection in a stable order, so `["a","b"]` and `["b","a"]` are one connection. */
const connectionKey = (a: string, b: string): string => JSON.stringify([a, b].sort())

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
  controls: readonly Control[]
): TopologyFault[] => {
  const faults: TopologyFault[] = []
  if (obstacles.length === 0 && controls.length === 0) return faults
  if (!layout) {
    for (const o of obstacles)
      faults.push(
        o.kind === "oneWay"
          ? { type: "obstacleNamesNoRegion", id: o.id }
          : { type: "obstacleNamesNoConnection", id: o.id }
      )
    for (const c of controls) faults.push({ type: "controlUnsatisfied", id: c.id, what: c.in })
    return faults
  }

  const joined = new Set(layout.connections.map(([a, b]) => connectionKey(a, b)))
  const route = regionRoute(layout)
  const seatable = new Set<string>()
  for (let i = 0; i < route.length - 1; i++) seatable.add(connectionKey(route[i], route[i + 1]))
  for (const { mouth, regions } of offRouteChains(layout)) {
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
    if (!regions.has(control.in)) faults.push({ type: "controlUnsatisfied", id: control.id, what: control.in })
    const states = new Set(control.states)
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
      }
    }
  }

  // EVERY GATE HAS AN OWNER, which is checkLockSpec's rule (lockWalk.ts, "gate ... has no owner")
  // asked one layer earlier: a gate nothing opens is a wall, and a wall is authored as a layout with
  // no connection rather than as a gate nobody can pass. A one-way is exempt: it is meaningful with
  // no control at all, its direction simply fixed at whatever it was authored with.
  for (const obstacle of obstacles)
    if (obstacle.kind === "gate" && !owned.has(obstacle.id)) faults.push({ type: "obstacleUnowned", id: obstacle.id })

  return faults
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
