import {
  createRushHourState,
  neighbours,
  rushHourSolved,
  stateKey,
  type RushHourPuzzle,
  type RushHourState,
} from "./rushHour"

/**
 * The search, which is this family's whole solver.
 *
 * **There is no technique ladder here and there should not be one.** Every other logic family settles
 * squares by argument, and its tiers are the arguments a board demands. A blockade demands no arguments at
 * all: nothing about a position is uncertain, and the difficulty is entirely how far the way out is in
 * MOVES (`docs/game-design/puzzles/rush-hour.md` §3). A breadth-first search over positions measures
 * exactly that, and the same search answers both questions this family has — how hard is this board, and
 * what is the next right move.
 *
 * A board is 6×6 with a dozen pieces, so a whole position graph is tens of thousands of states: small
 * enough to walk twice for a board the build machine keeps, and small enough to walk once for a hint the
 * player asked for.
 */

/**
 * The ceiling on a search, in states.
 *
 * ponytail: a flat cap rather than a bound argued from the board. It exists so a pathological piece set
 * cannot hang the offline pass or a phone; every real 6×6 set measured lands three orders of magnitude
 * under it. Raise it if a bigger grid is ever authored.
 */
const MAX_STATES = 200_000

/** One piece, moved to one offset — what a hint says and what a path is made of. */
export type Move = { index: number; offset: number }

/**
 * The shortest way out from here, or `undefined` if there is none.
 *
 * Breadth-first, so the first solved state reached is a shortest one. Parents are kept as keys rather
 * than states, because the offsets are recoverable from the key and the map is then strings only.
 */
export const optimalPath = (puzzle: RushHourPuzzle, from: RushHourState): Move[] | undefined => {
  if (rushHourSolved(puzzle, from)) return []
  const start = stateKey(from)
  const cameFrom = new Map<string, { key: string; move: Move }>()
  const seen = new Set([start])
  let frontier: RushHourState[] = [from]
  while (frontier.length > 0 && seen.size < MAX_STATES) {
    const next: RushHourState[] = []
    for (const state of frontier)
      for (const step of neighbours(puzzle, state)) {
        const key = stateKey(step.state)
        if (seen.has(key)) continue
        seen.add(key)
        cameFrom.set(key, { key: stateKey(state), move: { index: step.index, offset: step.offset } })
        if (rushHourSolved(puzzle, step.state)) {
          const path: Move[] = []
          for (let at = key; at !== start;) {
            const previous = cameFrom.get(at)
            if (!previous) break
            path.unshift(previous.move)
            at = previous.key
          }
          return path
        }
        next.push(step.state)
      }
    frontier = next
  }
  return undefined
}

/**
 * How far every position in this board's own component sits from the way out.
 *
 * **This is what makes a tier**, and it is the generator's half of the search (§3.1). One piece set — the
 * lanes and lengths, which never change — has one component of positions, and every position in it is a
 * board that could be handed to a player. Measuring them all at once means one search answers "which
 * starting position is a junior board and which is a wizard one" for the whole set, instead of drawing
 * positions at random and solving each.
 *
 * Two passes and neither can be skipped: the first walks out from wherever the set was drawn and collects
 * the positions that are already solved; the second is a breadth-first search backwards from all of them at
 * once. Backwards is the same as forwards here, because sliding a piece is reversible — which is the
 * property this whole approach rests on.
 *
 * **Both passes stop at `within` rings, and that bound is the difference between seconds and milliseconds.**
 * A loose set — a starter board's seven pieces on thirty-six cells — has a component of millions of
 * positions, and a starter board is five moves from the way out: walking the rest is work whose answer is
 * thrown away. Truncating means a distance in the map is the distance to the nearest solved position FOUND,
 * which can only ever be an over-estimate, so the caller re-measures the position it picks
 * (`generateRushHour`) rather than trusting the label.
 *
 * Returns an empty map for a set whose way out is not within reach, or one too large to walk.
 */
export const distancesToGoal = (puzzle: RushHourPuzzle, within: number): Map<string, number> => {
  const seen = new Set<string>()
  const solved: RushHourState[] = []
  const first = createRushHourState(puzzle)
  seen.add(stateKey(first))
  if (rushHourSolved(puzzle, first)) solved.push(first)
  let frontier: RushHourState[] = [first]
  for (let step = 0; step < within && frontier.length > 0; step++) {
    if (seen.size >= MAX_STATES) return new Map()
    const next: RushHourState[] = []
    for (const state of frontier)
      for (const move of neighbours(puzzle, state)) {
        const key = stateKey(move.state)
        if (seen.has(key)) continue
        seen.add(key)
        if (rushHourSolved(puzzle, move.state)) solved.push(move.state)
        next.push(move.state)
      }
    frontier = next
  }
  if (solved.length === 0) return new Map()

  const distance = new Map<string, number>(solved.map(state => [stateKey(state), 0]))
  let ring = solved
  for (let step = 1; step <= within && ring.length > 0; step++) {
    const next: RushHourState[] = []
    for (const state of ring)
      for (const back of neighbours(puzzle, state)) {
        const key = stateKey(back.state)
        if (distance.has(key)) continue
        distance.set(key, step)
        next.push(back.state)
      }
    ring = next
  }
  return distance
}
