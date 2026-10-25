import { doorKeysOf, floorLock, regionsOf } from "./floorLock"
import type { PlacedLock } from "./floorLocks"
import { finished, reachableStates } from "./lockWalk"
import type { LockSpec, LockState, MechanismId, RegionId } from "./lockWalk"
import type { RegionAppetite } from "./regions"
import type { FloorConfig, FloorGrid, GridCell } from "./siteTypes"

// A LOCK HOLDS A PUZZLE ON ITS WAY: between seeing the problem and solving it the player meets at least one puzzle
// room, so a lock is never a walk from a shut door to the lever that opens it. A lock here is an authored `locks`
// instance, read off the grid: its cells stand in regions named `<instance>.<region>`.

/** The instance an authored region label belongs to, or undefined for the floor's own ground. */
const instanceOf = (label: string | undefined): string | undefined => {
  const dot = label?.indexOf(".") ?? -1
  return label !== undefined && dot > 0 ? label.slice(0, dot) : undefined
}

const isControl = (cell: GridCell): boolean =>
  cell.type === "room" &&
  (cell.mechanism !== undefined ||
    cell.mechanismId !== undefined ||
    cell.worksMechanism !== undefined ||
    cell.sequenceTile !== undefined ||
    cell.plate !== undefined ||
    cell.pipeHole !== undefined)

/** A room a chain authored by position (a puzzle or a trap), which is neither a control nor a door. */
const isPuzzleRoom = (cell: GridCell): boolean =>
  cell.type === "room" &&
  cell.roomType === "encounter" &&
  cell.pathIndex !== undefined &&
  !isControl(cell) &&
  doorKeysOf(cell).length === 0

const holdsReward = (cell: GridCell): boolean =>
  cell.type === "room" &&
  (cell.reward !== undefined ||
    cell.stock !== undefined ||
    cell.tags?.includes("treasure") === true ||
    cell.tags?.includes("shop") === true)

/** The shortest walk from the start to a finished state, or undefined when none finishes. */
const solvingPath = (spec: LockSpec, order: LockState[], edges: number[][]): LockState[] | undefined => {
  const cameFrom = new Map<number, number>([[0, -1]])
  for (let queue = [0], at = 0; at < queue.length; at++) {
    const here = queue[at]
    if (finished(spec, order[here])) {
      const path: LockState[] = []
      for (let n = here; n >= 0; n = cameFrom.get(n)!) path.unshift(order[n])
      return path
    }
    for (const next of edges[here])
      if (!cameFrom.has(next)) {
        cameFrom.set(next, here)
        queue.push(next)
      }
  }
  return undefined
}

/** The two answers of the walk: the locks named, and the locks it could not judge. */
export type LockPuzzleVerdict = { without: string[]; unjudged: string[] }

/**
 * THE LOCKS WHOSE SOLVING WALK PASSES NO PUZZLE ROOM, by instance name. The walk is the shortest one from the
 * entrance to the way out over the floor's lock states; its stretch from the first time the player stands beside one
 * of the lock's doors to the last time they work one of its controls (whichever comes first) must cross a region
 * holding a puzzle room that is neither a control nor a door. A lock whose walk never stands beside its door or never
 * works its control is judged on the stretch the walk spends on its ground; one whose states are too many to walk is
 * judged on its whole ground.
 *
 * A LOCK NONE OF WHOSE CONTROLS CAN BE TIED TO ITS GROUND IS UNJUDGED, never passed: a control that is no room of the
 * lock (a floor key's chest, a room with no region label), or a floor whose lock does not compile into a walk.
 *
 * A LOCK STANDING BEFORE THE FLOOR'S CONTENT (`standsBeforeContent`) IS NOT ASKED FOR A PUZZLE: it is a lesson in the
 * lock alone, so it is neither named nor unjudged here. Every other hard criterion still holds for it.
 */
export const judgeLockPuzzles = (grid: FloorGrid, floor: Pick<FloorConfig, "locks">): LockPuzzleVerdict => {
  const lessons = new Set((floor.locks ?? []).filter(standsBeforeContent).map(placed => placed.as ?? placed.lock.name))
  const instances = new Set(
    grid.cells.flat().flatMap(cell => {
      const instance = cell.type === "empty" ? undefined : instanceOf(cell.region)
      return instance && !lessons.has(instance) ? [instance] : []
    })
  )
  if (instances.size === 0) return { without: [], unjudged: [] }
  const spec = floorLock(grid)
  if (!spec) return { without: [], unjudged: [...instances].sort() }
  const { of } = regionsOf(grid)
  const cellsOf = new Map<RegionId, GridCell[]>()
  const groundOf = new Map<string, Set<RegionId>>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      const region = of.get(`${r},${c}`)
      if (region === undefined) return
      cellsOf.set(region, [...(cellsOf.get(region) ?? []), cell])
      const instance = cell.type === "empty" ? undefined : instanceOf(cell.region)
      if (instance) groundOf.set(instance, (groundOf.get(instance) ?? new Set()).add(region))
    })
  )

  // A control's lock is the one whose ground its own room stands in: `<kind> <row>,<col>` names that room.
  const mechanismsOf = new Map<string, MechanismId[]>()
  for (const [id, mechanism] of Object.entries(spec.mechanisms)) {
    if (mechanism.transitions.length === 0 && (mechanism.entries ?? []).length === 0) continue
    const home = /(\d+),(\d+)$/.exec(id)
    const cell = home ? grid.cells[Number(home[1])]?.[Number(home[2])] : undefined
    const instance = cell && cell.type !== "empty" ? instanceOf(cell.region) : undefined
    if (instance && instances.has(instance)) mechanismsOf.set(instance, [...(mechanismsOf.get(instance) ?? []), id])
  }
  const unjudged = [...instances].filter(instance => !mechanismsOf.has(instance)).sort()
  if (mechanismsOf.size === 0) return { without: [], unjudged }

  const found = reachableStates(spec)
  const path = found === "tooLarge" ? undefined : solvingPath(spec, found.order, found.edges)
  const holdsPuzzle = (regions: Iterable<RegionId>) =>
    [...regions].some(region => (cellsOf.get(region) ?? []).some(isPuzzleRoom))

  const without = [...mechanismsOf]
    .filter(([instance, mechanisms]) => {
      const ground = groundOf.get(instance) ?? new Set<RegionId>()
      if (!path) return !holdsPuzzle(ground)
      const owned = new Set(mechanisms)
      const beside = new Set(
        Object.values(spec.gates)
          .filter(gate => gate.owners.some(owner => owned.has(owner)))
          .flatMap(gate => [gate.from, gate.to])
      )
      const sight = path.findIndex(state => beside.has(state.region))
      let worked = -1
      for (let i = 1; i < path.length; i++)
        if (mechanisms.some(id => path[i].config[id] !== path[i - 1].config[id])) worked = i
      const stretch =
        sight < 0 || worked < 0
          ? path.filter(state => ground.has(state.region))
          : path.slice(Math.min(sight, worked), Math.max(sight, worked) + 1)
      return !holdsPuzzle(stretch.map(state => state.region))
    })
    .map(([instance]) => instance)
    .sort()
  return { without, unjudged }
}

/** The locks whose solving walk passes no puzzle room (`judgeLockPuzzles`). */
export const lockWithoutPuzzle = (grid: FloorGrid, floor: Pick<FloorConfig, "locks">): string[] =>
  judgeLockPuzzles(grid, floor).without

/** The locks the walk could not judge (`judgeLockPuzzles`). */
export const unjudgedLocks = (grid: FloorGrid, floor: Pick<FloorConfig, "locks">): string[] =>
  judgeLockPuzzles(grid, floor).unjudged

/** A part of a placed lock that may ask for content: one of its regions. Its corridors join once they carry an
 * appetite of their own. */
export type LockPart = { kind: "region"; placed: PlacedLock; region: string }

/** What a part of a lock asks for. */
export const appetiteOf = (part: LockPart): RegionAppetite => part.placed.lock.regions[part.region]?.takes ?? "free"

/** A lock placed before the floor's content: every region but its way out takes nothing, so the floor's content lies
 * past it. Such a lock is a lesson in the lock alone and is asked for no puzzle on its way. */
export const standsBeforeContent = (placed: PlacedLock): boolean => {
  const ground = Object.keys(placed.lock.regions).filter(region => region !== placed.lock.out)
  return ground.length > 0 && ground.every(region => appetiteOf({ kind: "region", placed, region }) === "nothing")
}

/** Every region of the floor's locks whose appetite asks for puzzles or a reward and that holds none on the grid. */
export const lockGroundUnfed = (grid: FloorGrid, floor: Pick<FloorConfig, "locks">): string[] => {
  const cells = grid.cells.flat()
  return (floor.locks ?? []).flatMap(placed => {
    const instance = placed.as ?? placed.lock.name
    return Object.keys(placed.lock.regions).flatMap(region => {
      const appetite = appetiteOf({ kind: "region", placed, region })
      if (appetite !== "puzzles" && appetite !== "reward") return []
      const label = `${instance}.${region}`
      const fed = appetite === "puzzles" ? isPuzzleRoom : holdsReward
      return cells.some(cell => cell.type !== "empty" && cell.region === label && fed(cell))
        ? []
        : [`${label} asks for ${appetite} and holds none`]
    })
  })
}
