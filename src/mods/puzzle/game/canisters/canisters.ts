// The move engine and the deduction system behind both generation and hints, per
// docs/game-design/puzzles/canisters.md §4.
//
// **The water in front of the player is all the water there is.** One canister starts full, and the only
// move is pouring one into another until the source is empty or the destination is full. That conservation
// is the puzzle — every amount has to come from somewhere, and nothing can be thrown away to start again.

/** What each canister holds when full. Three or more; two alone can only be poured back and forth. */
export type Capacities = readonly number[]

/** How much each canister holds right now. Sums to the same total after every move. */
export type Volumes = readonly number[]

/** The only move there is. */
export type Move = { from: number; to: number }

export type CanistersPuzzle = {
  capacities: Capacities
  /** What is in each canister to begin with — the whole of the water for this board. */
  start: Volumes
  /**
   * The volumes asked for, in order. Each is measured from wherever the last one left the canisters, so a
   * leg is a fresh problem rather than a longer line (design doc §5).
   */
  targets: number[]
  /** Moves allowed for the whole board: the optimal line's length. The budget IS the puzzle (§2). */
  budget: number
}

export const volumeKey = (volumes: Volumes): string => volumes.join(",")

export const totalOf = (volumes: Volumes): number => volumes.reduce((sum, each) => sum + each, 0)

/**
 * Every pour that moves something.
 *
 * A pour empties its source or fills its destination — never both halfway — which is what makes the
 * amounts stay whole and what makes the board readable without a number on it.
 */
export const legalMoves = (capacities: Capacities, volumes: Volumes): Move[] => {
  const out: Move[] = []
  for (let from = 0; from < capacities.length; from++)
    for (let to = 0; to < capacities.length; to++) {
      if (from === to || volumes[from] === 0 || volumes[to] === capacities[to]) continue
      out.push({ from, to })
    }
  return out
}

export const applyMove = (capacities: Capacities, volumes: Volumes, move: Move): Volumes => {
  const next = [...volumes]
  const amount = Math.min(volumes[move.from], capacities[move.to] - volumes[move.to])
  next[move.from] -= amount
  next[move.to] += amount
  return next
}

/**
 * The pours worth considering: the ones that do not put the water back where it just came from.
 *
 * It prunes almost nothing, and there is nothing stronger to reach for: pouring is the only move, so there
 * are no wasteful ones to catch. 87% of steps still fork (§4) — this narrows the board rather than
 * deciding it.
 */
export const usefulMoves = (capacities: Capacities, volumes: Volumes, seen: ReadonlySet<string>): Move[] =>
  legalMoves(capacities, volumes).filter(move => !seen.has(volumeKey(applyMove(capacities, volumes, move))))

/** The move a hint names, where only one is left. Most states have two, and there the fork is the puzzle. */
export const forcedMove = (capacities: Capacities, volumes: Volumes, seen: ReadonlySet<string>): Move | undefined => {
  const useful = usefulMoves(capacities, volumes, seen)
  return useful.length === 1 ? useful[0] : undefined
}

/**
 * The shortest line from `start` to any canister holding `target`, or null where none exists.
 *
 * A search, and only at generation time: the state space is bounded by the capacities and never large.
 * Nothing at play time calls it — a hint sourced from a search is a hint that cannot say why (§4).
 */
export const shortestLine = (capacities: Capacities, start: Volumes, target: number): Move[] | null => {
  if (start.includes(target)) return []
  const from = new Map<string, { prev: string; move: Move }>()
  const seen = new Set([volumeKey(start)])
  let frontier: Volumes[] = [start]
  while (frontier.length > 0) {
    const next: Volumes[] = []
    for (const volumes of frontier)
      for (const move of legalMoves(capacities, volumes)) {
        const after = applyMove(capacities, volumes, move)
        const key = volumeKey(after)
        if (seen.has(key)) continue
        seen.add(key)
        from.set(key, { prev: volumeKey(volumes), move })
        if (after.includes(target)) {
          const line: Move[] = []
          for (let at = key; at !== volumeKey(start);) {
            const step = from.get(at)
            if (step === undefined) break
            line.unshift(step.move)
            at = step.prev
          }
          return line
        }
        next.push(after)
      }
    frontier = next
  }
  return null
}

/** Where a line ends up, so the next leg starts from the last one's leftovers. */
export const playLine = (capacities: Capacities, start: Volumes, line: readonly Move[]): Volumes =>
  line.reduce<Volumes>((volumes, move) => applyMove(capacities, volumes, move), start)

/**
 * How many pours fork at more than one useful choice along a line — what a player is actually deciding.
 *
 * A step is rarely down to one move, so this rather than "is it forced" is the difficulty signal a board
 * is gated on (§3).
 */
export const forkCount = (capacities: Capacities, start: Volumes, line: readonly Move[]): number => {
  const seen = new Set([volumeKey(start)])
  let at = start
  let forks = 0
  for (const move of line) {
    if (usefulMoves(capacities, at, seen).length > 1) forks++
    at = applyMove(capacities, at, move)
    seen.add(volumeKey(at))
  }
  return forks
}
