// A LOCK AS THE WALK SEES IT. walkSpecOf turns the shared Lock into the LockSpec walkLock proves, with
// every move the player has; the facts an author cannot read off the document are derived here too.
import type { Lock, LockMechanic } from "./lockAuthoring"
import { barriersOf, isRegionGate, joinOf } from "./lockAuthoring"
import type { LockSpec, Mechanism } from "./lockWalk"
import { CARRY_TERMS } from "./lockNotation"
import type { DraftLock, Weights } from "./lockNotation"

const OPEN = "·"
const REST = "rest"
const DRAFT = "draft"
/** The one mechanism every stone on a floor compiles into: its state is where each stone lies. */
export const WEIGHTS = "⚖"
const HAND = "hand"

/** A walk-only stretch between two barriers on one join: never in the JSON, the drawing or a route. */
export const isStretch = (region: string) => region.includes("|")

/** A walk failure in the author's words: stretches by their regions, and no mention of the owner every
 * bare corridor shares. */
export const readable = (text: string) =>
  text.replace(/(\w+)\|(\w+)#[\d.]+/g, "between $1 and $2").replaceAll(`, ${OPEN} at open`, "")

type Hop = { kind: "gate" | "oneWay" | "region"; id: string }

// Where the stones are: the plates holding one, and whether the hand holds one. Stones are alike, so
// nothing tells one from another.
type Stones = { weighted: ReadonlySet<string>; hand: boolean }
/** "door e1" or "door + hand": the plates holding a stone, by name, then the hand. */
export const stonesKey = ({ weighted, hand }: Stones) =>
  [...[...weighted].sort(), ...(hand ? [`+ ${HAND}`] : [])].join(" ") || "none"
const startStones = (weights: Weights): Stones => ({
  weighted: new Set(Object.keys(weights.plates).filter(plate => weights.plates[plate].stone)),
  hand: false,
})

const isWeightTerm = (weights: Weights | undefined, owner: string) =>
  weights !== undefined && (owner in weights.plates || (CARRY_TERMS as readonly string[]).includes(owner))

/** Whether one condition on gate `id` holds: empty hands, or a plate weighted or empty as the gate asks. */
const weightSays = (weights: Weights, id: string, term: string, stones: Stones) => {
  if (term === "unladen") return !stones.hand
  return weights.plates[term].opens.empty.includes(id) ? !stones.weighted.has(term) : stones.weighted.has(term)
}

/** A gate's say from the stones: every condition on them, or one of them under any. Undefined when the
 * gate asks nothing of the stones. */
const stonesSay = (
  weights: Weights,
  id: string,
  gate: { owners: readonly string[]; mode?: string },
  stones: Stones
) => {
  const terms = gate.owners.filter(owner => isWeightTerm(weights, owner))
  if (terms.length === 0) return undefined
  const says = (t: string) => weightSays(weights, id, t, stones)
  return gate.mode === "any" ? terms.some(says) : terms.every(says)
}

export const walkSpecOf = (authored: Lock, drafts: readonly string[] = []): LockSpec => {
  const weights = (authored as DraftLock).weights
  // A stone never leaves its floor: the way out takes empty hands, held on the last step into it.
  const lock: Lock = weights
    ? {
        ...authored,
        gates: { ...authored.gates, [`${authored.out}:unladen`]: { region: authored.out, owners: ["unladen"] } },
      }
    : authored
  const ownersOf = (owners: readonly string[]) => {
    const kept = owners.filter(owner => !isWeightTerm(weights, owner))
    return kept.length < owners.length ? [...kept, WEIGHTS] : kept
  }
  const regions = Object.keys(lock.regions)
  const gates: LockSpec["gates"] = {}
  const oneWays: { from: string; to: string }[] = []
  const expands = new Map<string, string[]>()
  const doorSides = new Map<string, [string, string]>()
  const plain: string[] = []
  const regionGates = Object.entries(lock.gates).filter(([, gate]) => isRegionGate(gate))

  lock.connections.forEach((connection, c) => {
    const [a, b] = joinOf(connection)
    const hops: Hop[] = barriersOf(connection).map(id => ({ kind: id in (lock.oneWays ?? {}) ? "oneWay" : "gate", id }))
    const towards = (hop: Hop, end: string) => hop.kind === "oneWay" && lock.oneWays![hop.id].to === end
    // A barred region holds the last step into it. When that step is a drop landing in the region, the
    // drop itself cannot be taken while the region is shut, so the hold stands just before it.
    for (const [id, gate] of regionGates) {
      if (!isRegionGate(gate)) continue
      if (gate.region === b) {
        const last = hops.at(-1)
        hops.splice(last && towards(last, b) ? hops.length - 1 : hops.length, 0, { kind: "region", id })
      }
      if (gate.region === a) {
        const first = hops[0]
        hops.splice(first && towards(first, a) ? 1 : 0, 0, { kind: "region", id })
      }
    }
    if (hops.length === 0) {
      gates[`${a}~${b}#${c}`] = { from: a, to: b, owners: [OPEN] }
      plain.push(`${a}~${b}#${c}`)
      return
    }
    const nodes = [a, ...hops.slice(1).map((_, i) => `${a}|${b}#${c}.${i + 1}`), b]
    regions.push(...nodes.slice(1, -1))
    hops.forEach((hop, i) => {
      const [here, there] = [nodes[i], nodes[i + 1]]
      if (hop.kind === "oneWay") {
        oneWays.push(lock.oneWays![hop.id].from === a ? { from: here, to: there } : { from: there, to: here })
        return
      }
      const gate = lock.gates[hop.id]
      const id = hop.kind === "region" ? `${hop.id}@${c}` : hop.id
      gates[id] = {
        from: here,
        to: there,
        owners: ownersOf(gate.owners),
        ...(gate.mode === "any" ? { mode: "any" } : {}),
      }
      expands.set(hop.id, [...(expands.get(hop.id) ?? []), id])
      if (hop.kind === "gate") doorSides.set(hop.id, [here, there])
    })
  })

  const opened = (ids: readonly string[] = []) => ids.flatMap(id => expands.get(id) ?? [])
  const mechanismOf = (id: string, m: LockMechanic): Mechanism => {
    if (m.control === "fork-switch") {
      const ways = Object.entries(lock.gates)
        .filter(([, gate]) => !isRegionGate(gate) && gate.owners.includes(id))
        .map(([gate]) => gate)
      const states = [REST, ...ways]
      return {
        states,
        initial: REST,
        opens: Object.fromEntries(states.map(state => [state, state === REST ? [] : [state]])),
        transitions: states.flatMap(from => states.filter(to => to !== from).map(to => ({ from, to, at: m.in }))),
      }
    }
    if (m.control === "sequence") {
      const n = m.steps.length
      const states = [...Array.from({ length: n }, (_, k) => String(k)), "done", "spoiled"]
      const transitions: Mechanism["transitions"] = []
      const add = (t: Mechanism["transitions"][number]) => {
        if (!transitions.some(o => o.from === t.from && o.to === t.to && o.at === t.at)) transitions.push(t)
      }
      m.steps.forEach((step, k) => {
        add({ from: String(k), to: k + 1 === n ? "done" : String(k + 1), at: step.in })
        m.steps.forEach((other, j) => {
          if (j !== k) add({ from: String(k), to: "spoiled", at: other.in })
        })
      })
      for (const side of doorSides.get(m.resetAt) ?? [])
        for (const from of states) if (from !== "done" && from !== "0") add({ from, to: "0", at: side })
      return {
        states,
        initial: "0",
        opens: Object.fromEntries(states.map(state => [state, state === "done" ? opened(m.opens.done) : []])),
        transitions,
      }
    }
    const states = Object.keys(m.opens)
    const other = states.find(state => state !== m.starts)!
    return {
      states,
      initial: m.starts,
      opens: Object.fromEntries(states.map(state => [state, opened(m.opens[state])])),
      transitions:
        m.control === "toggle"
          ? [
              { from: m.starts, to: other, at: m.in },
              { from: other, to: m.starts, at: m.in },
            ]
          : [{ from: m.starts, to: other, at: m.in }],
    }
  }

  const mechanisms: Record<string, Mechanism> = Object.fromEntries(
    Object.entries(lock.mechanics).map(([id, m]) => [id, mechanismOf(id, m)])
  )
  for (const id of drafts) mechanisms[id] = { states: [DRAFT], initial: DRAFT, opens: { [DRAFT]: [] }, transitions: [] }
  if (plain.length > 0)
    mechanisms[OPEN] = { states: ["open"], initial: "open", opens: { open: plain }, transitions: [] }
  if (weights) mechanisms[WEIGHTS] = weightsMechanism(lock, weights, opened)

  return { regions, gates, mechanisms, oneWays, in: lock.in, out: lock.out }
}

// Every arrangement of the stones the player can reach: one in hand at most, lifted from its plate and set
// down only on an empty one.
const weightsMechanism = (lock: Lock, weights: Weights, opened: (ids: readonly string[]) => string[]): Mechanism => {
  const start = startStones(weights)
  const states = new Map<string, Stones>([[stonesKey(start), start]])
  const transitions: Mechanism["transitions"] = []
  for (const queue = [start]; queue.length > 0;) {
    const here = queue.shift()!
    const moves: [Stones, string][] = Object.keys(weights.plates)
      .filter(plate => here.weighted.has(plate) !== here.hand)
      .map(plate => {
        const weighted = new Set(here.weighted)
        if (here.hand) weighted.add(plate)
        else weighted.delete(plate)
        return [{ weighted, hand: !here.hand }, weights.plates[plate].in]
      })
    for (const [next, at] of moves) {
      const key = stonesKey(next)
      if (!states.has(key)) {
        states.set(key, next)
        queue.push(next)
      }
      transitions.push({ from: stonesKey(here), to: key, at })
    }
  }
  return {
    states: [...states.keys()],
    initial: stonesKey(start),
    opens: Object.fromEntries(
      [...states].map(([key, stones]) => [
        key,
        opened(Object.keys(lock.gates).filter(id => stonesSay(weights, id, lock.gates[id], stones))),
      ])
    ),
    transitions,
  }
}

/** The barriers standing open before the player has touched anything — derived, never authored. */
export const openAtStart = (lock: Lock): string[] => {
  const weights = (lock as DraftLock).weights
  const start = weights ? startStones(weights) : { weighted: new Set<string>(), hand: false }
  return Object.entries(lock.gates)
    .filter(([id, gate]) => {
      const says = gate.owners.map(owner => {
        if (isWeightTerm(weights, owner)) return weightSays(weights!, id, owner, start)
        const m = lock.mechanics[owner]
        return m !== undefined && "starts" in m && (m.opens[m.starts] ?? []).includes(id)
      })
      return gate.mode === "any" ? says.some(Boolean) : says.every(Boolean)
    })
    .map(([id]) => id)
}

/** Under every with several owners, working one owner changes nothing visible, so the gate must show
 * what it waits for (mechanic-contract.md, "A gate shows its own condition"). */
export const needsFace = (lock: Lock) =>
  Object.entries(lock.gates)
    .filter(([, gate]) => gate.mode !== "any" && gate.owners.length > 1)
    .map(([gate, { owners }]) => ({ gate, owners }))

/** Whether the joins with no one-way on them close a loop, which the carve cannot lay out yet. */
const hasGateLoop = (lock: Lock) => {
  const root = new Map<string, string>()
  const find = (r: string): string => ((root.get(r) ?? r) === r ? r : find(root.get(r)!))
  return lock.connections.some(connection => {
    if (barriersOf(connection).some(id => id in (lock.oneWays ?? {}))) return false
    const [a, b] = joinOf(connection).map(find)
    if (a === b) return true
    root.set(a, b)
    return false
  })
}

/** What the engine cannot build yet (mechanic-contract.md, "What a mechanic declares": built: no). */
export const notBuildable = (lock: Lock): string[] => [
  ...((lock as DraftLock).weights ? ["stones and plates (a proposal, not in the contract yet)"] : []),
  ...(Object.values(lock.mechanics).some(m => m.control === "sequence") ? ["sequence"] : []),
  ...(Object.values(lock.gates).some(isRegionGate) ? ["region gate"] : []),
  ...(hasGateLoop(lock) ? ["gate loop"] : []),
]
