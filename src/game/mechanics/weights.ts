import type { Lock } from "../lockAuthoring"
import { isWeightOwner } from "../lockAuthoring"
import type { WeightsControl } from "../obstacles"
import type { MechanismRecord, WeightTerm } from "../siteTypes"
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
  /** For every arrangement and every plate empty in it, the gates open once the explorer's own weight presses that
   * plate. Only drawing reads it; the walk never does, so a way his weight alone holds is never on a route. */
  underfoot: { from: string; plate: string; opens: string[] }[]
  /** Each gate's terms on the stones, for the gates the stones own any of. */
  terms: Record<string, WeightTerm[]>
}

const HAND = "hand"
/** Where the stones lie: the plates holding one, and whether the hand holds one. */
type Stones = { weighted: ReadonlySet<string>; hand: boolean }

/** "P1 P4" or "P4 + hand": the plates holding a stone, by name, then the hand; "none" when nothing holds one. */
const keyOf = ({ weighted, hand }: Stones) =>
  [...[...weighted].sort(), ...(hand ? [`+ ${HAND}`] : [])].join(" ") || "none"

const HAND_MARK = `+ ${HAND}`

/** The inverse of an arrangement's key: the plates holding a stone, and whether the hand holds one. */
export const arrangementOf = (key: string): { weighted: string[]; hand: boolean } => {
  const hand = key === HAND_MARK || key.endsWith(` ${HAND_MARK}`)
  const plates = hand ? key.slice(0, key.length - HAND_MARK.length).trim() : key === "none" ? "" : key
  return { weighted: plates === "" ? [] : plates.split(" "), hand }
}

/** Whether one term a gate puts on the stones holds where they lie. */
export const termHolds = (term: WeightTerm, { weighted, hand }: Stones): boolean =>
  term.kind === "plate" ? weighted.has(term.plate) === (term.wants === "stone") : !hand

/** A gate's terms on the stones, and whether one term is enough. */
type StoneGate = { id: string; terms: WeightTerm[]; any: boolean }

/**
 * EVERY ARRANGEMENT OF THE STONES THE PLAYER CAN REACH, and every move between them: one stone in hand at
 * most, lifted from its plate and set down only on an empty one. The one place the stone rules live; the
 * tool's walk, the engine's record and a pool of several locks' stones are all built from it.
 */
const arrange = (plates: readonly { id: string; stone: boolean }[], gates: readonly StoneGate[]): Arrangements => {
  const ids = plates.map(plate => plate.id).sort()
  const start: Stones = { weighted: new Set(plates.filter(plate => plate.stone).map(plate => plate.id)), hand: false }
  const found = new Map<string, Stones>([[keyOf(start), start]])
  const moves: StoneMove[] = []
  for (const queue = [start]; queue.length > 0;) {
    const here = queue.shift()!
    for (const plate of ids) {
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
  const opening = (stones: Stones) =>
    gates
      .filter(({ terms, any }) =>
        any ? terms.some(t => termHolds(t, stones)) : terms.every(t => termHolds(t, stones))
      )
      .map(({ id }) => id)
  return {
    states: [...found.keys()],
    initial: keyOf(start),
    moves,
    opens: Object.fromEntries([...found].map(([key, stones]) => [key, opening(stones)])),
    carrying: [...found].filter(([, stones]) => stones.hand).map(([key]) => key),
    underfoot: [...found].flatMap(([key, stones]) =>
      ids
        .filter(plate => !stones.weighted.has(plate))
        .map(plate => ({
          from: key,
          plate,
          opens: opening({ weighted: new Set([...stones.weighted, plate]), hand: stones.hand }),
        }))
    ),
    terms: Object.fromEntries(gates.map(({ id, terms }) => [id, terms])),
  }
}

/** The arrangements of one lock's stones. */
export const stoneArrangements = (lock: Lock): Arrangements => {
  const weights = lock.weights!
  const gates = Object.entries(lock.gates).flatMap(([id, gate]): StoneGate[] => {
    const terms = gate.owners
      .filter(owner => isWeightOwner(lock, owner))
      .map((owner): WeightTerm =>
        Object.hasOwn(weights.plates, owner)
          ? { kind: "plate", plate: owner, wants: weights.plates[owner].opens.empty.includes(id) ? "empty" : "stone" }
          : { kind: "unladen" }
      )
    return terms.length > 0 ? [{ id, terms, any: gate.mode === "any" }] : []
  })
  return arrange(
    Object.entries(weights.plates).map(([id, plate]) => ({ id, stone: plate.stone })),
    gates
  )
}

/**
 * THE STONES OF SEVERAL LOCKS AS ONE POOL (stones spec, "Nested locks": shared): every plate of each, one hand, and
 * each gate's terms read off the one arrangement. A stone lifted in one lock may be set down in the other. `any`
 * names the gates whose mode is "any", which a compiled control does not carry.
 */
export const poolStones = (
  id: string,
  controls: readonly WeightsControl[],
  any: ReadonlySet<string>
): WeightsControl => {
  const plates = controls.flatMap(control => control.plates).sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
  const gates = controls.flatMap(control =>
    Object.entries(control.terms).map(([gate, terms]) => ({ id: gate, terms, any: any.has(gate) }))
  )
  const encounter = controls.find(control => control.encounter !== undefined)?.encounter
  return {
    id,
    control: "weights",
    plates,
    ...arrange(plates, gates),
    ...(encounter === undefined ? {} : { encounter }),
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
          { ...gate, owners: gate.owners.map(owner => (Object.hasOwn(plates, owner) ? name(owner) : owner)) },
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
    const { states, initial, moves, opens, carrying, underfoot, terms } = stoneArrangements(renamed)
    const encounter = binding.weights
    return {
      controls: [
        {
          id: name("stones"),
          control: "weights",
          plates: Object.entries(renamed.weights!.plates)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([id, plate]) => ({
              id,
              in: plate.in,
              stone: plate.stone,
            })),
          states,
          initial,
          moves,
          opens,
          carrying,
          underfoot,
          terms,
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
  underfoot: control.underfoot.map(({ from, plate, opens }) => ({ from, at: cellOf(plate), opens: opens.map(gate) })),
  weighs: Object.entries(control.terms).map(([id, terms]) => ({ gateKeyId: gate(id).gateKeyId, terms })),
})
