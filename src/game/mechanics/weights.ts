import type { Lock, Weights } from "../lockAuthoring"
import { CARRY_TERMS, isWeightOwner } from "../lockAuthoring"

export type StoneMove = { from: string; to: string; plate: string }
export type Arrangements = {
  /** Every arrangement reachable from the start, first the start; keys like "P1 P4" or "P4 + hand", "none" for no stones. */
  states: string[]
  initial: string
  /** Every lift and set-down: from one arrangement to another, made at a plate. */
  moves: StoneMove[]
  /** Each arrangement's gates whose stone conditions hold (all of them, or any under mode "any"). */
  opens: Record<string, string[]>
  /** The arrangements with a stone in hand. */
  carrying: string[]
}

const HAND = "hand"
type Stones = { weighted: ReadonlySet<string>; hand: boolean }

/** "P1 P4" or "P4 + hand": the plates holding a stone, by name, then the hand; "none" when nothing holds one. */
const keyOf = ({ weighted, hand }: Stones) =>
  [...[...weighted].sort(), ...(hand ? [`+ ${HAND}`] : [])].join(" ") || "none"

const says = (weights: Weights, gate: string, term: string, stones: Stones) => {
  if ((CARRY_TERMS as readonly string[]).includes(term)) return !stones.hand
  return weights.plates[term].opens.empty.includes(gate) ? !stones.weighted.has(term) : stones.weighted.has(term)
}

/**
 * EVERY ARRANGEMENT OF THE STONES THE PLAYER CAN REACH, and every move between them: one stone in hand at
 * most, lifted from its plate and set down only on an empty one. The one place the stone rules live; the
 * tool's walk and the engine's record are both built from it.
 */
export const stoneArrangements = (lock: Lock): Arrangements => {
  const weights = lock.weights!
  const start: Stones = {
    weighted: new Set(Object.keys(weights.plates).filter(plate => weights.plates[plate].stone)),
    hand: false,
  }
  const found = new Map<string, Stones>([[keyOf(start), start]])
  const moves: StoneMove[] = []
  for (const queue = [start]; queue.length > 0;) {
    const here = queue.shift()!
    for (const plate of Object.keys(weights.plates).sort()) {
      if (here.weighted.has(plate) === here.hand) continue
      const weighted = new Set(here.weighted)
      if (here.hand) weighted.add(plate)
      else weighted.delete(plate)
      const next = { weighted, hand: !here.hand }
      const key = keyOf(next)
      if (!found.has(key)) {
        found.set(key, next)
        queue.push(next)
      }
      moves.push({ from: keyOf(here), to: key, plate })
    }
  }
  const gates = Object.entries(lock.gates).flatMap(([id, gate]) => {
    const terms = gate.owners.filter(owner => isWeightOwner(lock, owner))
    return terms.length > 0 ? [{ id, terms, any: gate.mode === "any" }] : []
  })
  return {
    states: [...found.keys()],
    initial: keyOf(start),
    moves,
    opens: Object.fromEntries(
      [...found].map(([key, stones]) => [
        key,
        gates
          .filter(({ id, terms, any }) =>
            any ? terms.some(t => says(weights, id, t, stones)) : terms.every(t => says(weights, id, t, stones))
          )
          .map(({ id }) => id),
      ])
    ),
    carrying: [...found].filter(([, stones]) => stones.hand).map(([key]) => key),
  }
}
