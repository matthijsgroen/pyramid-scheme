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
