// WHAT A LOCK COSTS AND WHAT IT COULD DO WITHOUT, measured by walking it compiled.
import type { Lock } from "./lockAuthoring"
import { barriersOf, isRegionGate, joinOf } from "./lockAuthoring"
import { WEIGHTS, walkSpecOf, isStretch } from "./lockWalkSpec"
import { finished, openGates, reachableStates, walkLock } from "./lockWalk"
import type { LockSpec } from "./lockWalk"

/**
 * The cheapest way through, where every action (a board solved, a lever thrown, a key taken) costs more
 * than any amount of walking. Steps are regions walked to, `⤓region` for a drop taken, and `Id:state`
 * for an action.
 */
export const solveLock = (spec: LockSpec): { steps: string[]; actions: number } | undefined => {
  const found = reachableStates(spec)
  if (found === "tooLarge") return undefined
  const { order, edges } = found
  const cost = order.map(() => Infinity)
  const prev = order.map(() => -1)
  cost[0] = 0
  const done = new Set<number>()
  let end: number
  // ponytail: linear-scan Dijkstra over a lock's few hundred states.
  for (;;) {
    let at = -1
    order.forEach((_, n) => {
      if (!done.has(n) && cost[n] < Infinity && (at < 0 || cost[n] < cost[at])) at = n
    })
    if (at < 0) return undefined
    if (finished(spec, order[at])) {
      end = at
      break
    }
    done.add(at)
    for (const to of edges[at]) {
      const next = cost[at] + (order[to].region === order[at].region ? 1000 : 1)
      if (next >= cost[to]) continue
      cost[to] = next
      prev[to] = at
    }
  }
  const path: number[] = []
  for (let n = end; n >= 0; n = prev[n]) path.unshift(n)
  const steps = [order[0].region]
  let actions = 0
  // A drop taken into a stretch still marks the region the stretch leads on to.
  let dropped = false
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [order[path[i - 1]], order[path[i]]]
    if (a.region === b.region) {
      // The step is the move the player made; a torch a flood put out in the same step is its consequence.
      const id = Object.keys(b.config).find(m =>
        spec.mechanisms[m].transitions.some(t => t.at === a.region && t.from === a.config[m] && t.to === b.config[m])
      )!
      steps.push(id === WEIGHTS ? stoneMove(a.config[id], b.config[id]) : `${id}:${b.config[id]}`)
      actions++
      continue
    }
    const byGate = [...openGates(spec, a.config)].some(g => {
      const gate = spec.gates[g]
      return (gate.from === a.region && gate.to === b.region) || (gate.to === a.region && gate.from === b.region)
    })
    dropped ||= !byGate
    if (isStretch(b.region)) continue
    steps.push(dropped ? `⤓${b.region}` : b.region)
    dropped = false
  }
  return { steps, actions }
}

// "door e1" to "e1 + hand": the one plate that changed, said as the player did it.
const stoneMove = (before: string, after: string) => {
  const plates = (key: string) => new Set(key.split(" ").filter(token => !["+", "hand", "none"].includes(token)))
  const [was, is] = [plates(before), plates(after)]
  const lifted = [...was].find(plate => !is.has(plate))
  return lifted ? `lift from ${lifted}` : `stone on ${[...is].find(plate => !was.has(plate))}`
}

/** The regions no order of moves ever stands the player in, stretches aside. */
export const unreachedRegions = (spec: LockSpec): string[] | "tooLarge" => {
  const found = reachableStates(spec)
  if (found === "tooLarge") return found
  const reached = new Set(found.order.map(state => state.region))
  return spec.regions.filter(region => !isStretch(region) && !reached.has(region))
}

// Every barrier id taken out of the lock: from its join, its table, and every mechanic's opens.
const stripped = (lock: Lock, connections: Lock["connections"], ids: readonly string[]): Lock => {
  const gone = new Set(ids)
  const keep = <T>(record: Readonly<Record<string, T>> = {}) =>
    Object.fromEntries(Object.entries(record).filter(([id]) => !gone.has(id)))
  return {
    ...lock,
    connections,
    gates: keep(lock.gates),
    oneWays: keep(lock.oneWays),
    mechanics: Object.fromEntries(
      Object.entries(lock.mechanics).map(([id, m]) => [
        id,
        "opens" in m
          ? {
              ...m,
              opens: Object.fromEntries(
                Object.entries(m.opens).map(([s, list]) => [s, list.filter(b => !gone.has(b))])
              ),
            }
          : m,
      ])
    ) as Lock["mechanics"],
  }
}

type Piece = { name: string; without?: Lock; propped?: Lock }

const piecesOf = (lock: Lock): Piece[] => [
  ...lock.connections.flatMap((connection, c): Piece[] => {
    const [a, b] = joinOf(connection)
    const barriers = barriersOf(connection)
    const without = stripped(
      lock,
      lock.connections.filter((_, k) => k !== c),
      barriers
    )
    if (barriers.length === 0) return [{ name: `corridor ${a} -- ${b}`, without }]
    return barriers.map(id => {
      if (Object.hasOwn(lock.oneWays ?? {}, id)) return { name: `drop ${id}`, without }
      const rest = barriers.filter(other => other !== id)
      const kept = lock.connections.map((other, k) =>
        k !== c ? other : rest.length > 0 ? { between: [a, b] as const, barriers: rest } : ([a, b] as const)
      )
      return { name: `gate ${id}`, without, propped: stripped(lock, kept, [id]) }
    })
  }),
  ...Object.entries(lock.gates)
    .filter(([, gate]) => isRegionGate(gate))
    .map(([id]) => ({ name: `gate ${id}`, propped: stripped(lock, lock.connections, [id]) })),
]

const lockCosts = (lock: Lock, drafts: readonly string[]) => {
  const spec = walkSpecOf(lock, drafts)
  if (!walkLock(spec).sound) return undefined
  const found = reachableStates(spec)
  if (found === "tooLarge") return undefined
  const { order, edges } = found
  const acts = (a: number, b: number) => (order[a].region === order[b].region ? 1 : 0)
  const backwards: number[][] = order.map(() => [])
  edges.forEach((tos, from) => tos.forEach(to => backwards[to].push(from)))
  const left = order.map(state => (finished(spec, state) ? 0 : Infinity))
  const deque = order.flatMap((state, n) => (finished(spec, state) ? [n] : []))
  while (deque.length > 0) {
    const at = deque.shift()!
    for (const from of backwards[at]) {
      const cost = left[at] + acts(from, at)
      if (cost >= left[from]) continue
      left[from] = cost
      if (acts(from, at)) deque.push(from)
      else deque.unshift(from)
    }
  }
  const rewards = Object.keys(lock.regions).filter(r => lock.regions[r].takes === "reward")
  const full = (1 << rewards.length) - 1
  const mark = (mask: number, n: number) => {
    const i = rewards.indexOf(order[n].region)
    return i < 0 ? mask : mask | (1 << i)
  }
  const best = new Map<string, number>([[`0,${mark(0, 0)}`, 0]])
  const queue: [number, number, number][] = [[0, mark(0, 0), 0]]
  let rewarded = Infinity
  while (queue.length > 0) {
    const [at, mask, cost] = queue.shift()!
    if (cost > (best.get(`${at},${mask}`) ?? Infinity)) continue
    if (finished(spec, order[at]) && mask === full) rewarded = Math.min(rewarded, cost)
    for (const to of edges[at]) {
      const next: [number, number, number] = [to, mark(mask, to), cost + acts(at, to)]
      const key = `${next[0]},${next[1]}`
      if (next[2] >= (best.get(key) ?? Infinity)) continue
      best.set(key, next[2])
      if (acts(at, to)) queue.push(next)
      else queue.unshift(next)
    }
  }
  return { exit: left[0], rewarded, worst: Math.max(...left) }
}

type Profile = { exit: number; rewarded: number; worst: number; needed: string[] }

const profile = (lock: Lock, drafts: readonly string[]): Profile | undefined => {
  const costs = lockCosts(lock, drafts)
  if (!costs) return undefined
  const needed = piecesOf(lock)
    .filter(piece => piece.without && !walkLock(walkSpecOf(piece.without, drafts)).sound)
    .map(piece => piece.name)
  return { ...costs, needed }
}

const sameProfile = (a: Profile | undefined, b: Profile) =>
  a !== undefined &&
  a.exit === b.exit &&
  a.rewarded === b.rewarded &&
  a.worst === b.worst &&
  a.needed.join() === b.needed.join()

/**
 * What a sound lock could do without. Each join is taken away in turn, and each gate propped open, and
 * the lock measured again: a piece that changes none of the costs and makes no other piece necessary is
 * doing nothing. A drop whose loss only costs actions is a shortcut, not a need.
 */
export const lockQuality = (lock: Lock, drafts: readonly string[] = []): string[] => {
  const base = profile(lock, drafts)
  if (!base) return []
  const notes: string[] = []
  if (base.exit < 2) notes.push("under two actions solve it: a single choice is a switch fork, not a lock")
  for (const piece of piecesOf(lock)) {
    if (base.needed.includes(piece.name)) continue
    if (piece.without) {
      const without = profile(piece.without, drafts)
      if (sameProfile(without, base)) {
        notes.push(`${piece.name} does nothing`)
        continue
      }
      if (!piece.name.startsWith("gate ") && without && (without.exit > base.exit || without.rewarded > base.rewarded))
        notes.push(`${piece.name} is an optional shortcut`)
    }
    if (piece.propped && sameProfile(profile(piece.propped, drafts), base))
      notes.push(`${piece.name} never stops anyone`)
  }
  return notes
}
