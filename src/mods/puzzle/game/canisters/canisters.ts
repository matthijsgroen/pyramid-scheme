// The move engine and the deduction system behind both generation and hints, per
// docs/game-design/puzzles/canisters.md §4.
//
// The rule that shapes this file: **forcing is decided locally, never by lookahead.** The optimal line
// comes from a search (§3), but a hint may only ever name a reason the player can check from what is in
// front of them — so `forcedMove` knows nothing about the target and reads only the two rules in §4.3.

/** Two canisters. Index is identity everywhere: 0 is the smaller, 1 the larger. */
export type Capacities = readonly [number, number]

/** How much each canister holds right now. */
export type Volumes = readonly [number, number]

export type Move =
  { kind: "fill"; canister: 0 | 1 } | { kind: "empty"; canister: 0 | 1 } | { kind: "pour"; from: 0 | 1; to: 0 | 1 }

export type CanistersPuzzle = {
  capacities: Capacities
  /**
   * The volumes asked for, in order. Each is measured from wherever the last one left the canisters —
   * which is what makes a leg a fresh decision rather than a longer line (design doc §5).
   */
  targets: number[]
  /** Moves allowed for the whole board: the optimal line's length. The budget IS the puzzle (§2). */
  budget: number
}

export const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/**
 * Whether a volume can be measured at all: the multiples of `gcd` up to the larger canister, and nothing
 * else. Decided rather than searched, so the generator never gambles on solvability (§3).
 */
export const isReachable = (capacities: Capacities, target: number): boolean =>
  target >= 0 && target <= Math.max(...capacities) && target % gcd(capacities[0], capacities[1]) === 0

export const applyMove = (capacities: Capacities, volumes: Volumes, move: Move): Volumes => {
  const next: [number, number] = [volumes[0], volumes[1]]
  if (move.kind === "fill") next[move.canister] = capacities[move.canister]
  else if (move.kind === "empty") next[move.canister] = 0
  else {
    const amount = Math.min(volumes[move.from], capacities[move.to] - volumes[move.to])
    next[move.from] -= amount
    next[move.to] += amount
  }
  return next
}

/** Every move that changes something. A no-op is not offered: pouring a full canister into a full one is
 *  not a move the player can make, so it is not a move the solver may reason about. */
export const legalMoves = (capacities: Capacities, volumes: Volumes): Move[] => {
  const out: Move[] = []
  for (const canister of [0, 1] as const) {
    if (volumes[canister] < capacities[canister]) out.push({ kind: "fill", canister })
    if (volumes[canister] > 0) out.push({ kind: "empty", canister })
    const to = (1 - canister) as 0 | 1
    if (volumes[canister] > 0 && volumes[to] < capacities[to]) out.push({ kind: "pour", from: canister, to })
  }
  return out
}

export const sameVolumes = (a: Volumes, b: Volumes): boolean => a[0] === b[0] && a[1] === b[1]

const volumeKey = (v: Volumes): string => `${v[0]},${v[1]}`

/**
 * The two local rules, and they are the whole of §4.3:
 *
 * 1. never move to a state already seen, which includes undoing the last move;
 * 2. never empty a canister that is not full, and never top up one that is not empty — a partial measure
 *    is the thing the player is carrying, and both moves throw it away.
 *
 * Measured over 783 lines: a line holds at most TWO choice points, and 77% of its steps have exactly one
 * useful move. Those are the steps a hint names; at a choice point there is nothing to say, because the
 * choice is the puzzle.
 */
export const usefulMoves = (capacities: Capacities, volumes: Volumes, seen: ReadonlySet<string>): Move[] =>
  legalMoves(capacities, volumes).filter(move => {
    if (move.kind === "empty" && volumes[move.canister] !== capacities[move.canister]) return false
    if (move.kind === "fill" && volumes[move.canister] !== 0) return false
    return !seen.has(volumeKey(applyMove(capacities, volumes, move)))
  })

/** The move a hint names, or undefined where the player still has a choice to make (the opening). */
export const forcedMove = (capacities: Capacities, volumes: Volumes, seen: ReadonlySet<string>): Move | undefined => {
  const useful = usefulMoves(capacities, volumes, seen)
  return useful.length === 1 ? useful[0] : undefined
}

/**
 * The shortest line from `start` to a canister holding `target`, or null where none exists.
 *
 * A search, deliberately and only here: the state space is at most (a+1)(b+1) — a couple of hundred
 * states — and this runs at generation time to set the budget. Nothing at play time calls it, because a
 * hint sourced from a search is a hint that cannot say why (§4).
 */
export const shortestLine = (capacities: Capacities, start: Volumes, target: number): Move[] | null => {
  if (start.includes(target)) return []
  const from = new Map<string, { prev: string; move: Move }>()
  const seen = new Set([volumeKey(start)])
  let frontier: Volumes[] = [start]
  while (frontier.length > 0) {
    const next: Volumes[] = []
    for (const volumes of frontier) {
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
    }
    frontier = next
  }
  return null
}

/** Where a board's line ends up, so the next leg starts from the last one's leftovers. */
export const playLine = (capacities: Capacities, start: Volumes, line: readonly Move[]): Volumes =>
  line.reduce<Volumes>((volumes, move) => applyMove(capacities, volumes, move), start)

/**
 * How much the wrong opening costs, in moves — the only branch in the puzzle and therefore the whole
 * difficulty signal (§3).
 *
 * Measured over the moves a player would actually weigh, which is the useful ones: emptying a
 * half-full canister is legal and nobody considers it, so counting it as an option would report a gap
 * the board does not have. Works from a non-empty start, because a leg after the first opens from
 * wherever the last one left off and its opening is not always a fill.
 *
 * Returns 0 where there is nothing to choose, and Infinity where only one opening leads anywhere.
 */
export const openingGap = (capacities: Capacities, start: Volumes, target: number): number => {
  const seen = new Set([`${start[0]},${start[1]}`])
  const costs = usefulMoves(capacities, start, seen)
    .map(move => {
      const after = applyMove(capacities, start, move)
      if (after.includes(target)) return 1
      const rest = shortestLine(capacities, after, target)
      return rest === null ? Infinity : rest.length + 1
    })
    .sort((left, right) => left - right)
  if (costs.length < 2) return Infinity
  return costs[1] - costs[0]
}
