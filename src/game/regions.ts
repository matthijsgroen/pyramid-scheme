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
