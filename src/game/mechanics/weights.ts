import type { Lock, Weights } from "../lockAuthoring"
import { CARRY_TERMS, isWeightOwner } from "../lockAuthoring"
import type { WeightsControl } from "../obstacles"
import type { MechanismRecord } from "../siteTypes"
import type { MechanicKind } from "./mechanicKind"

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

/**
 * THE STONES OF ONE LOCK AS ONE CONTROL. Every plate needs a node of its own in its region, as a sequence's
 * tile does; the control is compiled from the whole lock, every plate, gate and region under its namespace.
 */
export const WEIGHTS: MechanicKind = {
  control: "weights",
  built: true,
  gates: "opens",
  seats: control =>
    control.control === "weights" ? control.plates.map(plate => ({ region: plate.in, seat: "tile" as const })) : [],
  compileLock: (lock, { name, binding }) => {
    if (!lock.weights) return { controls: [] }
    const { plates } = lock.weights
    const renamed: Lock = {
      ...lock,
      gates: Object.fromEntries(
        Object.entries(lock.gates).map(([id, gate]) => [
          name(id),
          { ...gate, owners: gate.owners.map(owner => (owner in plates ? name(owner) : owner)) },
        ])
      ),
      weights: {
        plates: Object.fromEntries(
          Object.entries(plates).map(([id, plate]) => [
            name(id),
            {
              in: name(plate.in),
              stone: plate.stone,
              opens: { weighted: plate.opens.weighted.map(name), empty: plate.opens.empty.map(name) },
            },
          ])
        ),
      },
    }
    const { states, initial, moves, opens, carrying } = stoneArrangements(renamed)
    const encounter = binding.weights
    return {
      controls: [
        {
          id: name("stones"),
          control: "weights",
          plates: Object.entries(renamed.weights!.plates).map(([id, plate]) => ({
            id,
            in: plate.in,
            stone: plate.stone,
          })),
          states,
          initial,
          moves,
          opens,
          carrying,
          ...(encounter === undefined ? {} : { encounter }),
        },
      ],
    }
  },
}

/**
 * THE STONES AS THE RECORD A FLOOR CELL CARRIES: every arrangement a state, every lift and set-down a move
 * placed at its plate's cell, and each arrangement's gates its positions. A gate is listed under every
 * arrangement where its stone terms hold, and the door folds in its other owners by the gate's mode.
 * Placed-only, so a plate works only the moves made at it; every move can be undone, so it returns to its initial.
 */
export const compileWeights = (
  control: WeightsControl,
  cellOf: (plate: string) => readonly [number, number],
  gate: (id: string) => { gateKeyId: string; mode?: "any" }
): MechanismRecord => ({
  states: control.states,
  initial: control.initial,
  returnsToInitial: true,
  placedOnly: true,
  positions: control.states.flatMap(state => control.opens[state].map(id => ({ state, ...gate(id) }))),
  transitions: control.moves.map(({ from, to, plate }) => ({ from, to, at: cellOf(plate) })),
  carrying: control.carrying,
})
