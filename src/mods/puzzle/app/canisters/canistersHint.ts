import {
  applyMove,
  shortestLine,
  type Capacities,
  type CanistersPuzzle,
  type Volumes,
} from "@/mods/puzzle/game/canisters/canisters"

/**
 * One amount, written as the two numbers on the bench it is made of — per how-to-play, which says that is
 * all any amount ever is: a canister's size, what is in it, or the room it has left.
 *
 * `leftover` and `sum` are the two ways a pour can end, and `full` is the sum that lands exactly on a size.
 */
export type CanistersReading =
  | { key: "leftover"; params: { amount: number; content: number; space: number } }
  | { key: "full"; params: { amount: number; a: number; b: number } }
  | { key: "sum"; params: { amount: number; a: number; b: number } }

export type CanistersHint =
  | { key: "stuck"; params: { target: number } }
  | { key: "overBudget"; params?: undefined }
  /**
   * `goal` is what the volume asked for is made of, `next` the sum to make before it. `next` is absent
   * where the chain is a single sum — the goal IS the next thing to do — and `claim` marks the pour
   * before the board's last question.
   */
  | { key: "line"; goal: CanistersReading; next?: CanistersReading; claim?: boolean }

/** How an amount standing in a canister came to be — a capacity and an empty canister need no explaining. */
type Provenance =
  | { kind: "given"; amount: number }
  | { kind: "leftover"; amount: number; at: number; content: Provenance; roomCap: number; held: Provenance }
  | { kind: "sum"; amount: number; at: number; a: Provenance; b: Provenance }

type Fact = Exclude<Provenance, { kind: "given" }>

/**
 * The amounts the line actually makes, in the order it makes them.
 *
 * Walk the line forward remembering how the amount in each canister came to be, then expand the one the
 * volume asked for ends up in. What comes back is a chain of sums that bottoms out at the capacities, and
 * it is roughly half the length of the line: the pours it does not account for are the positioning.
 */
const chainTo = (
  capacities: Capacities,
  start: Volumes,
  target: number,
  line: readonly { from: number; to: number }[]
) => {
  let provenance: Provenance[] = capacities.map((_, at) => ({ kind: "given", amount: start[at] }))
  let volumes = start
  line.forEach((move, at) => {
    const after = applyMove(capacities, volumes, move)
    const next = [...provenance]
    if (after[move.to] === capacities[move.to]) {
      next[move.from] =
        after[move.from] === 0
          ? { kind: "given", amount: 0 }
          : {
              kind: "leftover",
              amount: after[move.from],
              at,
              content: provenance[move.from],
              roomCap: capacities[move.to],
              held: provenance[move.to],
            }
      next[move.to] = { kind: "given", amount: capacities[move.to] }
    } else {
      // Pouring into an empty canister makes no amount at all — the water keeps whatever it already was.
      next[move.to] =
        volumes[move.to] === 0
          ? provenance[move.from]
          : { kind: "sum", amount: after[move.to], at, a: provenance[move.from], b: provenance[move.to] }
      next[move.from] = { kind: "given", amount: 0 }
    }
    provenance = next
    volumes = after
  })

  const facts: Fact[] = []
  const collect = (node: Provenance) => {
    if (node.kind === "given" || facts.some(fact => fact.at === node.at)) return
    facts.push(node)
    if (node.kind === "sum") {
      collect(node.a)
      collect(node.b)
    } else {
      collect(node.content)
      collect(node.held)
    }
  }
  collect(provenance[volumes.indexOf(target)])
  return facts.sort((one, other) => one.at - other.at)
}

const readingOf = (fact: Fact): CanistersReading => {
  if (fact.kind === "sum") return { key: "sum", params: { amount: fact.amount, a: fact.a.amount, b: fact.b.amount } }
  const space = fact.roomCap - fact.held.amount
  return fact.content.amount === space
    ? { key: "full", params: { amount: fact.roomCap, a: fact.content.amount, b: fact.held.amount } }
    : { key: "leftover", params: { amount: fact.amount, content: fact.content.amount, space } }
}

export const buildCanistersHint = (
  puzzle: CanistersPuzzle,
  volumes: Volumes,
  movesLeft: number,
  target: number
): CanistersHint => {
  if (movesLeft <= 0) return { key: "overBudget" }

  const line = shortestLine(puzzle.capacities, volumes, target)
  // Whether the board is still winnable is a fact about the position rather than a plan, and it is the one
  // thing a player cannot work out without playing it twice.
  if (line === null || line.length === 0 || line.length > movesLeft) return { key: "stuck", params: { target } }

  const facts = chainTo(puzzle.capacities, volumes, target, line)
  // Working back from the amount asked for is how-to-play's second bullet, and this is that sentence for
  // this board: the last fact in the chain is what the volume is made of.
  const goal = readingOf(facts[facts.length - 1])
  if (line.length === 1) return { key: "line", goal, claim: true }
  // **Whether the next sum can be poured this instant is not worth saying.** A player who knows which sum
  // they are after can see for themselves what has to be standing where, and the pours that get it there
  // are the easy part — which is why the chain is what a hint gives and the line is not.
  if (facts.length === 1) return { key: "line", goal }
  return { key: "line", goal, next: readingOf(facts[0]) }
}
