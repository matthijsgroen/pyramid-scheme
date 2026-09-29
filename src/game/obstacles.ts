import type { RegionGraph } from "./regions"
import { regionRoute } from "./regions"

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
export type Obstacle = {
  /** Authored, stable across a re-carve, unique on the floor, and the wire a control names. */
  id: string
  /** WHAT IT IS. One union, exhaustively checked, meant to grow: a one-way a control reverses and a
   * flood that shuts a region rather than a boundary are the two the catalogue already names. */
  kind: "gate"
  /** WHERE IT STANDS. The second axis: a gate and a one-way stand on a connection, a flood on a
   * region. Also one union, also exhaustively checked. */
  at: { on: "connection"; between: readonly [string, string] }
}

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
  /** Which obstacles stand OPEN in each state. A state listing none shuts every obstacle this control
   * owns. Keys are states, values are obstacle ids. */
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
 * `obstacleOffRoute` is the honest limit of what can be built today rather than a rule of the design:
 * a region is a stretch of the MAIN PATH, so cells only ever meet along the threaded route, and a
 * connection off it has no boundary to stand a gate at. It stops firing on its own when the
 * path-shaping work lets a layout branch.
 */
export const topologyFaults = (
  layout: RegionGraph | undefined,
  obstacles: readonly Obstacle[],
  controls: readonly Control[]
): TopologyFault[] => {
  const faults: TopologyFault[] = []
  if (obstacles.length === 0 && controls.length === 0) return faults
  if (!layout) {
    for (const o of obstacles) faults.push({ type: "obstacleNamesNoConnection", id: o.id })
    for (const c of controls) faults.push({ type: "controlUnsatisfied", id: c.id, what: c.in })
    return faults
  }

  const joined = new Set(layout.connections.map(([a, b]) => connectionKey(a, b)))
  const route = regionRoute(layout)
  const onRoute = new Set<string>()
  for (let i = 0; i < route.length - 1; i++) onRoute.add(connectionKey(route[i], route[i + 1]))

  const seenObstacle = new Set<string>()
  for (const obstacle of obstacles) {
    if (seenObstacle.has(obstacle.id)) faults.push({ type: "obstacleIdRepeated", id: obstacle.id })
    seenObstacle.add(obstacle.id)
    const key = connectionKey(obstacle.at.between[0], obstacle.at.between[1])
    if (!joined.has(key)) faults.push({ type: "obstacleNamesNoConnection", id: obstacle.id })
    else if (!onRoute.has(key)) faults.push({ type: "obstacleOffRoute", id: obstacle.id })
  }

  const regions = new Set(layout.regions.map(r => r.name))
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
        if (!seenObstacle.has(id)) faults.push({ type: "controlUnsatisfied", id: control.id, what: id })
        owned.add(id)
      }
    }
  }

  // EVERY OBSTACLE HAS AN OWNER, which is checkLockSpec's rule (lockWalk.ts, "gate ... has no owner")
  // asked one layer earlier: an obstacle nothing opens is a wall, and a wall is authored as a layout
  // with no connection rather than as a gate nobody can pass.
  for (const obstacle of obstacles)
    if (!owned.has(obstacle.id)) faults.push({ type: "obstacleUnowned", id: obstacle.id })

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
export const seamIndexFor = (stepRegion: readonly string[], between: readonly [string, string]): number | undefined => {
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
