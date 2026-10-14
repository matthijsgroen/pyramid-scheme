import type { Lock } from "../lockAuthoring"
import { holeOf, isWeightOwner } from "../lockAuthoring"
import type { WeightsControl } from "../obstacles"
import type { MechanismRecord, WeightTerm } from "../siteTypes"
import type { MechanicKind } from "./mechanicKind"

/** A lift off a plate or a set-down on one; a post into a pipe's hole, which lands the stone in the other, or a take
 * out of a hole. Each is made where it names: at its plate, or at its hole. */
export type StoneMove = { from: string; to: string } & (
  { kind: "lift" | "set"; plate: string } | { kind: "post" | "take"; hole: string }
)

/** Where a move is made: its plate's id, or its hole's (`pipe@region`). */
export const placeOf = (move: StoneMove): string => ("plate" in move ? move.plate : move.hole)

/** The region a hole stands in, read off its id. */
export const holeRegion = (hole: string): string => hole.slice(hole.indexOf("@") + 1)

/** A pipe as the stones see it: its two ends' regions, and the end whose hole holds a stone at the start. */
export type StonePipe = { id: string; ends: readonly [string, string]; stone?: string }

/** The realisation kind a pipe's holes are bound under in a `RealisationBinding`. */
export const PIPE_KIND = "pipe"

/** An effect with no control of its own: a pipe's moves are the stones', and the kind only names its binding. */
export const PIPE: MechanicKind = { control: PIPE_KIND, built: true, gates: "opens", effectOnly: true }

export type Arrangements = {
  /** Every arrangement reachable from the start, first the start; keys like "P1 P4" or "P4 + hand", "none" for no
   * stones. A stone in a pipe's hole follows the plates as the hole's id: "P1 pipe@vault". */
  states: string[]
  initial: string
  /** Every move: from one arrangement to another, made at a plate or a hole. */
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
/** Where the stones lie: the plates holding one, the holes holding one, and whether the hand holds one. */
type Stones = { weighted: ReadonlySet<string>; holes: ReadonlySet<string>; hand: boolean }

/** "P1 P4" or "P4 + hand": the plates holding a stone, by name, then the holes, then the hand; "none" when nothing
 * holds one. A lock without a pipe has no hole, so its keys are the plates' alone. */
const keyOf = ({ weighted, holes, hand }: Stones) =>
  [...[...weighted].sort(), ...[...holes].sort(), ...(hand ? [`+ ${HAND}`] : [])].join(" ") || "none"

const HAND_MARK = `+ ${HAND}`

/** The inverse of an arrangement's key: the plates holding a stone, the holes holding one, and whether the hand
 * holds one. */
export const arrangementOf = (key: string): { weighted: string[]; holes: string[]; hand: boolean } => {
  const hand = key === HAND_MARK || key.endsWith(` ${HAND_MARK}`)
  const places = hand ? key.slice(0, key.length - HAND_MARK.length).trim() : key === "none" ? "" : key
  const tokens = places === "" ? [] : places.split(" ")
  return { weighted: tokens.filter(t => !t.includes("@")), holes: tokens.filter(t => t.includes("@")), hand }
}

/** Whether one term a gate puts on the stones holds where they lie. */
export const termHolds = (term: WeightTerm, { weighted, hand }: Pick<Stones, "weighted" | "hand">): boolean =>
  term.kind === "plate" ? weighted.has(term.plate) === (term.wants === "stone") : !hand

/** A gate's terms on the stones, and whether one term is enough. */
type StoneGate = { id: string; terms: WeightTerm[]; any: boolean }

/**
 * EVERY ARRANGEMENT OF THE STONES THE PLAYER CAN REACH, and every move between them: one stone in hand at
 * most, lifted from its plate and set down only on an empty one. A stone in hand is posted at a pipe's hole only
 * while both its holes are empty, and lies in the other one, where it is taken out with empty hands. The one place
 * the stone rules live; the tool's walk, the engine's record and a pool of several locks' stones are all built
 * from it.
 */
const arrange = (
  plates: readonly { id: string; stone: boolean }[],
  pipes: readonly StonePipe[],
  gates: readonly StoneGate[]
): Arrangements => {
  const ids = plates.map(plate => plate.id).sort()
  const start: Stones = {
    weighted: new Set(plates.filter(plate => plate.stone).map(plate => plate.id)),
    holes: new Set(pipes.flatMap(pipe => (pipe.stone === undefined ? [] : [holeOf(pipe.id, pipe.stone)]))),
    hand: false,
  }
  const found = new Map<string, Stones>([[keyOf(start), start]])
  const moves: StoneMove[] = []
  for (const queue = [start]; queue.length > 0;) {
    const here = queue.shift()!
    const reach = (next: Stones, move: Omit<StoneMove, "from" | "to"> & ({ plate: string } | { hole: string })) => {
      const key = keyOf(next)
      if (!found.has(key)) {
        found.set(key, next)
        queue.push(next)
      }
      moves.push({ from: keyOf(here), to: key, ...move } as StoneMove)
    }
    for (const plate of ids) {
      if (here.weighted.has(plate) === here.hand) continue
      const weighted = new Set(here.weighted)
      if (here.hand) weighted.add(plate)
      else weighted.delete(plate)
      reach({ weighted, holes: here.holes, hand: !here.hand }, { kind: here.hand ? "set" : "lift", plate })
    }
    for (const pipe of pipes) {
      const [a, b] = pipe.ends.map(end => holeOf(pipe.id, end))
      const full = here.holes.has(a) || here.holes.has(b)
      for (const [hole, far] of [
        [a, b],
        [b, a],
      ]) {
        if (here.hand && !full)
          reach({ weighted: here.weighted, holes: new Set([...here.holes, far]), hand: false }, { kind: "post", hole })
        if (!here.hand && here.holes.has(hole))
          reach(
            { weighted: here.weighted, holes: new Set([...here.holes].filter(h => h !== hole)), hand: true },
            { kind: "take", hole }
          )
      }
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
          opens: opening({ weighted: new Set([...stones.weighted, plate]), holes: stones.holes, hand: stones.hand }),
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
    Object.entries(weights.pipes ?? {}).map(([id, pipe]) => ({ id, ...pipe })),
    gates
  )
}

/**
 * THE STONES OF SEVERAL LOCKS AS ONE POOL (stones spec, "Nested locks": shared): every plate and pipe of each, one hand, and
 * each gate's terms read off the one arrangement. A stone lifted in one lock may be set down in the other. `any`
 * names the gates whose mode is "any", which a compiled control does not carry.
 */
export const poolStones = (
  id: string,
  controls: readonly WeightsControl[],
  any: ReadonlySet<string>
): WeightsControl => {
  const plates = controls.flatMap(control => control.plates).sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
  const pipes = controls.flatMap(control => control.pipes ?? [])
  const gates = controls.flatMap(control =>
    Object.entries(control.terms).map(([gate, terms]) => ({ id: gate, terms, any: any.has(gate) }))
  )
  const encounter = controls.find(control => control.encounter !== undefined)?.encounter
  const pipeEncounter = controls.find(control => control.pipeEncounter !== undefined)?.pipeEncounter
  return {
    id,
    control: "weights",
    plates,
    ...(pipes.length > 0 ? { pipes } : {}),
    ...arrange(plates, pipes, gates),
    ...(encounter === undefined ? {} : { encounter }),
    ...(pipeEncounter === undefined ? {} : { pipeEncounter }),
  }
}

/**
 * THE STONES OF ONE LOCK AS ONE CONTROL. Every plate and every pipe's hole needs a node of its own in its region,
 * as a sequence's tile does; the control is compiled from the whole lock, every plate, pipe, gate and region under
 * its namespace.
 */
export const WEIGHTS: MechanicKind = {
  control: "weights",
  built: true,
  gates: "opens",
  seats: control =>
    control.control === "weights"
      ? [
          ...control.plates.map(plate => ({ region: plate.in, seat: "tile" as const })),
          ...(control.pipes ?? []).flatMap(pipe => pipe.ends.map(region => ({ region, seat: "tile" as const }))),
        ]
      : [],
  compileLock: (lock, { name, binding }) => {
    if (!lock.weights) return { controls: [] }
    const { plates, pipes = {} } = lock.weights
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
        ...(Object.keys(pipes).length > 0
          ? {
              pipes: Object.fromEntries(
                Object.entries(pipes).map(([id, pipe]) => [
                  name(id),
                  {
                    ends: [name(pipe.ends[0]), name(pipe.ends[1])] as const,
                    ...(pipe.stone === undefined ? {} : { stone: name(pipe.stone) }),
                  },
                ])
              ),
            }
          : {}),
      },
    }
    const { states, initial, moves, opens, carrying, underfoot, terms } = stoneArrangements(renamed)
    const encounter = binding.weights
    const pipeEncounter = Object.keys(pipes).length > 0 ? binding[PIPE_KIND] : undefined
    const compiledPipes = Object.entries(renamed.weights!.pipes ?? {}).map(([id, pipe]) => ({ id, ...pipe }))
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
          ...(compiledPipes.length > 0 ? { pipes: compiledPipes } : {}),
          states,
          initial,
          moves,
          opens,
          carrying,
          underfoot,
          terms,
          ...(encounter === undefined ? {} : { encounter }),
          ...(pipeEncounter === undefined ? {} : { pipeEncounter }),
        },
      ],
    }
  },
}

/**
 * THE STONES AS THE RECORD A FLOOR CELL CARRIES: every arrangement a state, every move placed at its plate's or
 * hole's cell, and each arrangement's gates its positions. A gate is listed under every
 * arrangement where its stone terms hold, and the door folds in its other owners by the gate's mode.
 * Placed-only, so a plate works only the moves made at it; every move can be undone, so it returns to its initial.
 */
export const compileWeights = (
  control: WeightsControl,
  cellOf: (place: string) => readonly [number, number],
  gate: (id: string) => { gateKeyId: string; mode?: "any" }
): MechanismRecord => ({
  states: control.states,
  initial: control.initial,
  returnsToInitial: true,
  placedOnly: true,
  positions: control.states.flatMap(state => control.opens[state].map(id => ({ state, ...gate(id) }))),
  transitions: control.moves.map(move => ({ from: move.from, to: move.to, at: cellOf(placeOf(move)) })),
  carrying: control.carrying,
  underfoot: control.underfoot.map(({ from, plate, opens }) => ({ from, at: cellOf(plate), opens: opens.map(gate) })),
  weighs: Object.entries(control.terms).map(([id, terms]) => ({ gateKeyId: gate(id).gateKeyId, terms })),
})
