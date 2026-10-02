// A LOCK AS THE WALK SEES IT. walkSpecOf turns the shared Lock into the LockSpec walkLock proves, with
// every move the player has; the facts an author cannot read off the document are derived here too.
import type { Lock, LockMechanic } from "./lockAuthoring"
import { barriersOf, isRegionGate, joinOf } from "./lockAuthoring"
import type { LockSpec, Mechanism } from "./lockWalk"

const OPEN = "·"
const REST = "rest"
const DRAFT = "draft"

/** A walk-only stretch between two barriers on one join: never in the JSON, the drawing or a route. */
export const isStretch = (region: string) => region.includes("|")

export const readable = (text: string) => text.replace(/(\w+)\|(\w+)#[\d.]+/g, "between $1 and $2")

type Hop = { kind: "gate" | "oneWay" | "region"; id: string }

export const walkSpecOf = (lock: Lock, drafts: readonly string[] = []): LockSpec => {
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
    // A barred region is held at the way in: before the first drop heading into it, else beside it.
    for (const [id, gate] of regionGates) {
      if (!isRegionGate(gate)) continue
      if (gate.region === b) {
        const drop = hops.findIndex(hop => towards(hop, b))
        hops.splice(drop < 0 ? hops.length : drop, 0, { kind: "region", id })
      }
      if (gate.region === a) {
        const drop = hops.map(hop => towards(hop, a)).lastIndexOf(true)
        hops.splice(drop < 0 ? 0 : drop + 1, 0, { kind: "region", id })
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
      gates[id] = { from: here, to: there, owners: [...gate.owners], ...(gate.mode === "any" ? { mode: "any" } : {}) }
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

  return { regions, gates, mechanisms, oneWays, in: lock.in, out: lock.out }
}

/** The barriers standing open before the player has touched anything — derived, never authored. */
export const openAtStart = (lock: Lock): string[] =>
  Object.entries(lock.gates)
    .filter(([id, gate]) => {
      const says = gate.owners.map(owner => {
        const m = lock.mechanics[owner]
        return m !== undefined && "starts" in m && (m.opens[m.starts] ?? []).includes(id)
      })
      return gate.mode === "any" ? says.some(Boolean) : says.every(Boolean)
    })
    .map(([id]) => id)

/** Under every with several owners, working one owner changes nothing visible, so the gate must show
 * what it waits for (mechanic-contract.md §3). */
export const needsFace = (lock: Lock) =>
  Object.entries(lock.gates)
    .filter(([, gate]) => gate.mode !== "any" && gate.owners.length > 1)
    .map(([gate, { owners }]) => ({ gate, owners }))

/** What the engine cannot build yet (mechanic-contract.md §6, built: no). */
export const notBuildable = (lock: Lock): string[] => [
  ...(Object.values(lock.mechanics).some(m => m.control === "sequence") ? ["sequence"] : []),
  ...(Object.values(lock.gates).some(isRegionGate) ? ["region gate"] : []),
]
