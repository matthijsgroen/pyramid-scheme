// A LOCK AS THE WALK SEES IT. walkSpecOf turns the shared Lock into the LockSpec walkLock proves, with
// every move the player has; the facts an author cannot read off the document are derived here too.
import type { Lock, LockMechanic } from "./lockAuthoring"
import { barriersOf, isRegionGate, isWeightOwner, joinOf } from "./lockAuthoring"
import type { LockSpec, Mechanism } from "./lockWalk"
import { TORCH_OFF, TORCH_ON } from "./mechanics/torch"
import { stoneArrangements } from "./mechanics/weights"

const OPEN = "·"
const REST = "rest"
const DRAFT = "draft"
/** The one mechanism every stone on a floor compiles into: its state is where each stone lies. */
export const WEIGHTS = "⚖"

/** A walk-only stretch between two barriers on one join: never in the JSON, the drawing or a route. */
export const isStretch = (region: string) => region.includes("|")

/** A walk failure in the author's words: stretches by their regions, and no mention of the owner every
 * bare corridor shares. */
export const readable = (text: string) =>
  text.replace(/(\w+)\|(\w+)#[\d.]+/g, "between $1 and $2").replaceAll(`, ${OPEN} at open`, "")

type Hop = { kind: "gate" | "oneWay" | "region"; id: string }

export const walkSpecOf = (lock: Lock, drafts: readonly string[] = []): LockSpec => {
  const { weights } = lock
  const ownersOf = (owners: readonly string[]) => {
    const kept = owners.filter(owner => !isWeightOwner(lock, owner))
    return kept.length < owners.length ? [...kept, WEIGHTS] : kept
  }
  const regions = Object.keys(lock.regions)
  const gates: LockSpec["gates"] = {}
  const oneWays: LockSpec["oneWays"] & {} = []
  const expands = new Map<string, string[]>()
  const doorSides = new Map<string, [string, string]>()
  const plain: string[] = []
  const regionGates = Object.entries(lock.gates).filter(([, gate]) => isRegionGate(gate))

  lock.connections.forEach((connection, c) => {
    const [a, b] = joinOf(connection)
    const hops: Hop[] = barriersOf(connection).map(id => ({
      kind: Object.hasOwn(lock.oneWays ?? {}, id) ? "oneWay" : "gate",
      id,
    }))
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
    // A torch's one move is lighting it, whatever it starts in: a lit torch put out by a flood can be lit again.
    if (m.control === "flame")
      return {
        states: [TORCH_OFF, TORCH_ON],
        initial: m.starts,
        opens: { [TORCH_OFF]: opened(m.opens[TORCH_OFF]), [TORCH_ON]: opened(m.opens[TORCH_ON]) },
        transitions: [{ from: TORCH_OFF, to: TORCH_ON, at: m.in }],
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
  if (weights) mechanisms[WEIGHTS] = weightsMechanism(lock, opened)

  // A stone never leaves its floor: the way out is left only with empty hands.
  const emptyHands = weights ? [{ mechanism: WEIGHTS, notIn: stoneArrangements(lock).carrying }] : undefined
  // A region gate's hops open and shut together, so the region is covered while any of them is shut.
  const torches = Object.entries(lock.mechanics).flatMap(([id, m]) =>
    m.control === "flame"
      ? [
          {
            mechanism: id,
            coveredBy: regionGates.flatMap(([gate, g]) =>
              isRegionGate(g) && g.region === m.in ? (expands.get(gate) ?? []) : []
            ),
          },
        ]
      : []
  )
  return {
    regions,
    gates,
    mechanisms,
    oneWays,
    in: lock.in,
    out: lock.out,
    ...(emptyHands ? { emptyHands } : {}),
    ...(torches.length > 0 ? { torches } : {}),
  }
}

// Every arrangement of the stones the player can reach, as one mechanism; each move is made in its plate's region.
const weightsMechanism = (lock: Lock, opened: (ids: readonly string[]) => string[]): Mechanism => {
  const { states, initial, moves, opens } = stoneArrangements(lock)
  return {
    states,
    initial,
    opens: Object.fromEntries(states.map(state => [state, opened(opens[state])])),
    transitions: moves.map(({ from, to, plate }) => ({ from, to, at: lock.weights!.plates[plate].in })),
  }
}

/** The barriers standing open before the player has touched anything — derived, never authored. */
export const openAtStart = (lock: Lock): string[] => {
  const stones = lock.weights ? stoneArrangements(lock) : undefined
  return Object.entries(lock.gates)
    .filter(([id, gate]) => {
      const terms = gate.owners.filter(owner => isWeightOwner(lock, owner))
      const says = [
        ...(stones && terms.length > 0 ? [stones.opens[stones.initial].includes(id)] : []),
        ...gate.owners
          .filter(owner => !terms.includes(owner))
          .map(owner => {
            const m = lock.mechanics[owner]
            return m !== undefined && "starts" in m && (m.opens[m.starts] ?? []).includes(id)
          }),
      ]
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

/** What the engine cannot build yet (mechanic-contract.md, "What a mechanic declares": built: no). */
export const notBuildable = (lock: Lock): string[] => [
  ...(Object.values(lock.mechanics).some(m => m.control === "sequence") ? ["sequence"] : []),
]
