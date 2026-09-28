/**
 * WHAT A REGION WILL TAKE, AND NOTHING ABOUT WHAT FILLS IT. A region names a kind; the floor authors
 * how many; the builder matches the two (docs/game-design/regions-and-containers.md).
 *
 * `nothing` and `free` are different instructions and must not be collapsed: `nothing` is a promise
 * the region stays empty — a corridor, a junction, a place to stand — and `free` is indifference,
 * where the builder may put what is spare or leave it.
 *
 * This vocabulary is meant to grow. It is one union, read through `appetiteAccepts` and guarded for
 * exhaustiveness, so adding a kind is a compile error everywhere that must handle it.
 */
export type RegionAppetite = "reward" | "puzzles" | "nothing" | "free"

/** What a floor has to place. Named separately from the appetite because one appetite (`puzzles`)
 * takes many of one kind, and one kind (`reward`) is taken by two appetites. */
export type ContentKind = "reward" | "puzzle"

export type Region = { name: string; appetite: RegionAppetite }

/**
 * A container's coarse layout: its regions, what joins them, and the two ports it is entered and left
 * through. Connections are undirected — a one-way is furniture the topology mod puts ON a connection,
 * not a different kind of join.
 */
export type RegionGraph = {
  regions: readonly Region[]
  connections: ReadonlyArray<readonly [string, string]>
  /** The port a walker enters by. */
  in: string
  /** The port a walker leaves by. */
  out: string
}

export const appetiteAccepts = (appetite: RegionAppetite, kind: ContentKind): boolean => {
  switch (appetite) {
    case "nothing":
      return false
    case "free":
      return true
    case "reward":
      return kind === "reward"
    case "puzzles":
      return kind === "puzzle"
    default: {
      // An appetite with no case above would silently take nothing, which reads as a deliberate
      // `nothing` and hides the omission. This makes it a compile error instead.
      const unhandled: never = appetite
      return unhandled
    }
  }
}

/** Every region reachable from `from` over the connections, with `without` treated as absent. */
const reachable = (graph: RegionGraph, from: string, without?: string): Set<string> => {
  const neighbours = new Map<string, string[]>()
  for (const [a, b] of graph.connections) {
    if (a === without || b === without) continue
    if (!neighbours.has(a)) neighbours.set(a, [])
    if (!neighbours.has(b)) neighbours.set(b, [])
    neighbours.get(a)!.push(b)
    neighbours.get(b)!.push(a)
  }
  const seen = new Set<string>()
  if (from === without) return seen
  const queue = [from]
  seen.add(from)
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
 * THE REGIONS A PLAYER CANNOT REACH THE WAY OUT WITHOUT ENTERING — the main path, derived rather than
 * authored.
 *
 * Asked by taking each region away in turn and seeing whether `out` is still reachable from `in`. A
 * region whose absence cuts the route is one the route needs. That says the useful thing under cycles,
 * where "the main path" is otherwise ambiguous: a side path is one you can skip.
 *
 * Derived on purpose. An authored role is a second statement of what the graph already implies, and
 * two statements of one fact drift apart.
 *
 * Taking each region away costs a walk of the graph, and a container holds a handful of regions — so
 * the plain form is the right one here, and a real dominator algorithm would be complexity nobody
 * asked for.
 */
export const mainPathRegions = (graph: RegionGraph): Set<string> => {
  const main = new Set<string>()
  if (!reachable(graph, graph.in).has(graph.out)) return main
  for (const { name } of graph.regions) {
    if (!reachable(graph, graph.in, name).has(graph.out)) main.add(name)
  }
  return main
}

/**
 * THE REGIONS NO WALK FROM THE WAY IN ARRIVES AT, by the name they were authored under.
 *
 * Required rather than advisory: once regions carry the floor's content, a region nothing reaches is
 * loot a player can never collect (docs/game-design/regions-and-containers.md).
 *
 * This is the STRUCTURAL question — is the region joined on at all — and it is the whole of the check
 * while connections carry no gates. The state-aware form, where a gate may be shut in every state a
 * mechanism can reach, needs the lock and arrives with it.
 */
export const strandedRegions = (graph: RegionGraph): string[] => {
  const arrived = reachable(graph, graph.in)
  return graph.regions.filter(({ name }) => !arrived.has(name)).map(({ name }) => name)
}

/** How many of each kind the floor authors. The regions say only what kind they take, not how many. */
export type FloorDemand = { rewards: number; puzzleRooms: number }

/** How many of one kind a region will hold: a named appetite takes its own, `free` takes one of
 * anything, and `puzzles` is the one that takes a chain of them. */
const capacityFor = (appetite: RegionAppetite, kind: ContentKind): number => {
  if (!appetiteAccepts(appetite, kind)) return 0
  switch (appetite) {
    case "puzzles":
      return Number.POSITIVE_INFINITY
    case "reward":
    case "free":
      return 1
    case "nothing":
      // Unreachable: appetiteAccepts("nothing", kind) is always false, so the early return above
      // already handled this case.
      return 0
    default: {
      // An appetite with no case above would silently get a capacity of 1, the builder deciding
      // quietly. This makes it a compile error instead.
      const unhandled: never = appetite
      return unhandled
    }
  }
}

/**
 * WHERE EACH PIECE OF THE FLOOR'S CONTENT GOES, OR THE KIND THAT HAD NOWHERE TO GO.
 *
 * A region that asked for the kind is filled before a `free` one, so indifference is spent last and an
 * author who named a place for a reward gets it.
 *
 * Returns the unplaced KIND rather than a count, because the failure is reported by name before a wall
 * is carved and the author needs to know what did not fit, not how much: the builder may refuse, but
 * it may never decide quietly (docs/game-design/regions-and-containers.md).
 */
export const fitContent = (
  graph: RegionGraph,
  demand: FloorDemand
): { fits: true; placed: Map<string, ContentKind[]> } | { fits: false; unplaced: ContentKind } => {
  const placed = new Map<string, ContentKind[]>()
  const roomLeft = new Map<string, number>()

  const place = (kind: ContentKind, count: number): ContentKind | null => {
    const named = graph.regions.filter(r => r.appetite !== "free" && appetiteAccepts(r.appetite, kind))
    const free = graph.regions.filter(r => r.appetite === "free" && appetiteAccepts(r.appetite, kind))
    for (let n = 0; n < count; n++) {
      const into = [...named, ...free].find(r => (roomLeft.get(r.name) ?? capacityFor(r.appetite, kind)) > 0)
      if (!into) return kind
      roomLeft.set(into.name, (roomLeft.get(into.name) ?? capacityFor(into.appetite, kind)) - 1)
      placed.set(into.name, [...(placed.get(into.name) ?? []), kind])
    }
    return null
  }

  const unplaced = place("reward", demand.rewards) ?? place("puzzle", demand.puzzleRooms)
  return unplaced ? { fits: false, unplaced } : { fits: true, placed }
}

/**
 * THE REGIONS THE MAIN PATH PASSES THROUGH, in order, from the way in to the way out.
 *
 * A region is a stretch of the carve rather than an area set aside, so the main path crosses several
 * of them and a side path grows into whatever the route does not touch
 * (docs/game-design/regions-and-containers.md).
 *
 * The shortest route is taken, which necessarily includes every region the way out cannot be reached
 * without — the same regions `mainPathRegions` names. Where two routes are equally short, the one
 * whose regions were DECLARED first wins, so one layout always threads the same way and a floor does
 * not reshuffle because a seed changed.
 *
 * Empty when the way out cannot be reached at all; `strandedRegions` is what reports that as a fault.
 */
export const regionRoute = (graph: RegionGraph): string[] => {
  if (graph.in === graph.out) return reachable(graph, graph.in).has(graph.out) ? [graph.in] : []
  const order = new Map(graph.regions.map((r, i) => [r.name, i]))
  const neighbours = new Map<string, string[]>()
  for (const [a, b] of graph.connections) {
    if (!neighbours.has(a)) neighbours.set(a, [])
    if (!neighbours.has(b)) neighbours.set(b, [])
    neighbours.get(a)!.push(b)
    neighbours.get(b)!.push(a)
  }
  const cameFrom = new Map<string, string>()
  const seen = new Set([graph.in])
  const queue = [graph.in]
  while (queue.length > 0) {
    const at = queue.shift()!
    if (at === graph.out) break
    // Declaration order among equally short routes, so the same layout always threads the same way.
    for (const next of [...(neighbours.get(at) ?? [])].sort((x, y) => (order.get(x) ?? 0) - (order.get(y) ?? 0))) {
      if (seen.has(next)) continue
      seen.add(next)
      cameFrom.set(next, at)
      queue.push(next)
    }
  }
  if (!seen.has(graph.out)) return []
  const route = [graph.out]
  while (route[0] !== graph.in) route.unshift(cameFrom.get(route[0])!)
  return route
}

/**
 * WHICH REGION EACH STEP OF THE MAIN PATH STANDS IN, one entry per step.
 *
 * The steps are dealt evenly along the route, and where they do not divide the earlier regions take
 * the extra one each from the front rather than the first region taking all of it — so a long region
 * followed by a short one is something the author asked for, never an artefact of the division.
 *
 * A route with more regions than the path has steps gets as many as there are steps. That the tail of
 * the route never reaches the main path is a fault, but it is the assembler's to report against a real
 * floor, not this function's to decide.
 */
export const regionOfStep = (route: readonly string[], steps: number): string[] => {
  if (route.length === 0 || steps <= 0) return []
  if (route.length >= steps) return route.slice(0, steps)
  const each = Math.floor(steps / route.length)
  const extra = steps % route.length
  return route.flatMap((name, i) => Array<string>(each + (i < extra ? 1 : 0)).fill(name))
}
