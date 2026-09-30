// A LOCK AS AN AUTHOR WRITES IT, AND AS A PICTURE. `topologyLock` takes the container form sketched in
// docs/mods/floor-topology-design.md ("Containers with ports") and compiles it to the LockSpec the walk
// proves; `drawLock` draws any LockSpec as ASCII art, so a lock can be designed, walked and looked at
// before the carve can build it.
import { openGates, reachableStates, walkLock } from "./lockWalk"
import type { LockSpec, Mechanism } from "./lockWalk"
import type { RegionAppetite } from "./regions"

type Side = "left" | "right"

export type LockSwitch =
  /** A board in a fork: every gate that names it is one of its ways out, and it can be re-solved. */
  | { in: string; encounter: string }
  /** A lever: thrown to a side, that side's gates stand open and the other side's shut. */
  | { in: string; encounter: "handle"; left: string[]; right: string[]; starts: Side }

export type AuthoredLock = {
  regions: Record<string, { takes: RegionAppetite }>
  gates: Record<string, { from: string; to: string; owners: string[]; mode?: "all" | "any" }>
  switches: Record<string, LockSwitch>
  /** A floor key lying in a region: picked up for good, and every gate naming it stands open once held. */
  keys?: Record<string, { in: string }>
  /** Regions joined with nothing standing between them, written [from, to] like a gate. */
  connections?: [string, string][]
  oneWays?: { from: string; to: string }[]
  in: string
  out: string
}

const isHandle = (s: LockSwitch): s is Extract<LockSwitch, { encounter: "handle" }> => s.encounter === "handle"

const compileSwitch = (id: string, s: LockSwitch, lock: AuthoredLock): Mechanism => {
  if (isHandle(s)) {
    for (const gate of [...s.left, ...s.right])
      if (!lock.gates[gate]?.owners.includes(id)) throw new Error(`handle ${id} throws ${gate}, which does not name it`)
    return {
      states: ["left", "right"],
      initial: s.starts,
      opens: { left: s.left, right: s.right },
      transitions: [
        { from: "left", to: "right", at: s.in },
        { from: "right", to: "left", at: s.in },
      ],
    }
  }
  // A board rests unsolved, and the player can walk back in and put it back to rest or solve it the
  // other way: every state reaches every other.
  const ways = Object.keys(lock.gates).filter(gate => lock.gates[gate].owners.includes(id))
  const states = ["unset", ...ways]
  return {
    states,
    initial: "unset",
    opens: Object.fromEntries(states.map(state => [state, state === "unset" ? [] : [state]])),
    transitions: states.flatMap(from => states.filter(to => to !== from).map(to => ({ from, to, at: s.in }))),
  }
}

const OPEN = "·"

export const topologyLock = (lock: AuthoredLock): LockSpec => {
  // A board's states are named by the gate they open, so the walk's failures read as "Y at forkLeft".
  const switches = Object.entries(lock.switches).map(([id, s]) => [id, compileSwitch(id, s, lock)])
  const keys = Object.entries(lock.keys ?? {}).map(([id, key]): [string, Mechanism] => [
    id,
    {
      states: ["absent", "held"],
      initial: "absent",
      opens: { absent: [], held: Object.keys(lock.gates).filter(gate => lock.gates[gate].owners.includes(id)) },
      transitions: [{ from: "absent", to: "held", at: key.in }],
    },
  ])
  // A plain connection is a gate its one owner always holds open: the walk needs no second kind of edge.
  const plain = Object.fromEntries(
    (lock.connections ?? []).map(([from, to]) => [`${from}~${to}`, { from, to, owners: [OPEN] }])
  )
  const open: [string, Mechanism][] = lock.connections?.length
    ? [[OPEN, { states: ["open"], initial: "open", opens: { open: Object.keys(plain) }, transitions: [] }]]
    : []
  const mechanisms = Object.fromEntries([...switches, ...keys, ...open])
  return {
    regions: Object.keys(lock.regions),
    gates: { ...lock.gates, ...plain },
    mechanisms,
    oneWays: lock.oneWays,
    in: lock.in,
    out: lock.out,
  }
}

// ---- composition --------------------------------------------------------------------------------

/** Every id in a lock prefixed, except the regions `alias` maps onto a region outside it. */
const renamed = (lock: AuthoredLock, prefix: string, alias: Record<string, string> = {}): AuthoredLock => {
  const region = (r: string) => alias[r] ?? `${prefix}.${r}`
  const id = (x: string) => `${prefix}.${x}`
  return {
    regions: Object.fromEntries(Object.entries(lock.regions).map(([r, v]) => [region(r), v])),
    gates: Object.fromEntries(
      Object.entries(lock.gates).map(([g, v]) => [
        id(g),
        { ...v, from: region(v.from), to: region(v.to), owners: v.owners.map(id) },
      ])
    ),
    switches: Object.fromEntries(
      Object.entries(lock.switches).map(([s, v]) => [
        id(s),
        isHandle(v)
          ? { ...v, in: region(v.in), left: v.left.map(id), right: v.right.map(id) }
          : { ...v, in: region(v.in) },
      ])
    ),
    keys: Object.fromEntries(Object.entries(lock.keys ?? {}).map(([k, v]) => [id(k), { in: region(v.in) }])),
    connections: lock.connections?.map(([from, to]): [string, string] => [region(from), region(to)]),
    oneWays: lock.oneWays?.map(w => ({ from: region(w.from), to: region(w.to) })),
    in: region(lock.in),
    out: region(lock.out),
  }
}

const merged = (a: AuthoredLock, b: AuthoredLock): AuthoredLock => ({
  regions: { ...b.regions, ...a.regions },
  gates: { ...a.gates, ...b.gates },
  switches: { ...a.switches, ...b.switches },
  keys: { ...a.keys, ...b.keys },
  connections: [...(a.connections ?? []), ...(b.connections ?? [])],
  oneWays: [...(a.oneWays ?? []), ...(b.oneWays ?? [])],
  in: a.in,
  out: a.out,
})

/** Locks one after another: each one's way out is the next one's way in. Keys are the id prefixes. */
export const chain = (parts: Record<string, AuthoredLock>): AuthoredLock =>
  Object.entries(parts).reduce<AuthoredLock | undefined>((sofar, [prefix, lock]) => {
    if (!sofar) return renamed(lock, prefix)
    return { ...merged(sofar, renamed(lock, prefix, { [lock.in]: sofar.out })), out: `${prefix}.${lock.out}` }
  }, undefined)!

/**
 * A guest lock standing in one of the host's regions. The player arrives in the guest's way in, and
 * everything the host hangs off that region — its onward gates, its drops, its switches — hangs off the
 * guest's way out instead, so it is earned by crossing the guest. Drops INTO the region land at the
 * guest's way in.
 */
export const embed = (host: AuthoredLock, region: string, prefix: string, guest: AuthoredLock): AuthoredLock => {
  const inner = renamed(guest, prefix, { [guest.in]: region })
  const past = (r: string) => (r === region ? inner.out : r)
  const moved: AuthoredLock = {
    ...host,
    gates: Object.fromEntries(Object.entries(host.gates).map(([g, v]) => [g, { ...v, from: past(v.from) }])),
    switches: Object.fromEntries(Object.entries(host.switches).map(([s, v]) => [s, { ...v, in: past(v.in) }])),
    keys: Object.fromEntries(Object.entries(host.keys ?? {}).map(([k, v]) => [k, { in: past(v.in) }])),
    connections: host.connections?.map(([from, to]): [string, string] => [past(from), to]),
    oneWays: host.oneWays?.map(w => ({ ...w, from: past(w.from) })),
    out: past(host.out),
  }
  return merged(moved, inner)
}

// ---- drawing ------------------------------------------------------------------------------------

const U = 1,
  R = 2,
  D = 4,
  L = 8
// prettier-ignore
const SOLID: Record<number, string> = {
  [U | D]: "│", [L | R]: "─", [U]: "│", [D]: "│", [L]: "─", [R]: "─",
  [D | R]: "┌", [D | L]: "┐", [U | R]: "└", [U | L]: "┘",
  [U | D | R]: "├", [U | D | L]: "┤", [L | R | D]: "┬", [L | R | U]: "┴", [U | R | D | L]: "┼",
}
// prettier-ignore
const DROP: Record<number, string> = {
  [U | D]: "╎", [L | R]: "╌", [D | R]: "╭", [D | L]: "╮", [U | R]: "╰", [U | L]: "╯",
}
const STEPS = [
  { dx: 0, dy: -1, out: U, back: D, arrow: "▲" },
  { dx: 1, dy: 0, out: R, back: L, arrow: "▶" },
  { dx: 0, dy: 1, out: D, back: U, arrow: "▼" },
  { dx: -1, dy: 0, out: L, back: R, arrow: "◀" },
]

// Lower levels of the tree are drawn lower; a level is a box row plus the corridor rising off it.
const LEVEL_ROWS = 6
const MARGIN = 3

/**
 * Draws a lock the way it would be sketched on paper: the way in bottom left, the main path along the
 * bottom to the way out, every other region rising off the one its gate hangs from, and each drop
 * routed around what is drawn. A gate shows the owner state that opens it — `■S1:right` is shut until
 * S1 is thrown right, `□` is open on arrival.
 */
export const drawLock = (spec: LockSpec): string => {
  const initial = Object.fromEntries(Object.entries(spec.mechanisms).map(([id, m]) => [id, m.initial]))
  const openAtStart = openGates(spec, initial)
  const gateToken = (gateId: string) => {
    const gate = spec.gates[gateId]
    // A gate no owner can ever move is a plain corridor, drawn without a token.
    if (gate.owners.every(owner => spec.mechanisms[owner].transitions.length === 0)) return ""
    const opener = (owner: string) => {
      const m = spec.mechanisms[owner]
      // A composed lock prefixes its board states with the owner's prefix; the owner already says it.
      const states = m.states.filter(state => m.opens[state]?.includes(gateId)).map(s => s.split(".").pop())
      return `${owner}:${states.join("/")}`
    }
    return (openAtStart.has(gateId) ? "□" : "■") + gate.owners.map(opener).join(gate.mode === "any" ? "|" : "+")
  }
  const boxLabel = (region: string) => {
    const operated = Object.keys(spec.mechanisms).filter(id =>
      spec.mechanisms[id].transitions.some(t => t.at === region)
    )
    return `[${[region, ...operated].join(" · ")}]`
  }

  // The gate tree, rooted at the way in. Gates must form a tree (the design's buildable rule), so a
  // breadth-first parent is the only parent.
  const links = new Map<string, { to: string; gate: string }[]>()
  for (const [gate, { from, to }] of Object.entries(spec.gates)) {
    links.set(from, [...(links.get(from) ?? []), { to, gate }])
    links.set(to, [...(links.get(to) ?? []), { to: from, gate }])
  }
  const parent = new Map<string, { of: string; gate: string }>()
  const seen = new Set([spec.in])
  const queue = [spec.in]
  while (queue.length > 0) {
    const at = queue.shift()!
    for (const { to, gate } of links.get(at) ?? []) {
      if (seen.has(to)) continue
      seen.add(to)
      parent.set(to, { of: at, gate })
      queue.push(to)
    }
  }
  const main: string[] = []
  for (let at: string | undefined = seen.has(spec.out) ? spec.out : spec.in; at; at = parent.get(at)?.of)
    main.unshift(at)
  // A region only drops reach is drawn beside the first region that drops into it; no corridor joins them.
  const hangs = new Map<string, string>()
  for (let grew = true; grew;) {
    grew = false
    for (const { from, to } of spec.oneWays ?? []) {
      if (seen.has(to) || hangs.has(to) || !(seen.has(from) || hangs.has(from))) continue
      hangs.set(to, from)
      grew = true
    }
  }
  // ponytail: a region nothing reaches at all sits on the bottom row after the main path.
  const roots = [...main, ...spec.regions.filter(region => !seen.has(region) && !hangs.has(region))]

  const place = new Map<string, { col: number; level: number }>()
  let nextCol = 0
  const lay = (region: string, level: number) => {
    // In the order their gates are written, so the lock reads left to right as it was authored.
    const kids = (links.get(region) ?? []).map(l => l.to).filter(r => parent.get(r)?.of === region && !main.includes(r))
    kids.push(...[...hangs].filter(([, from]) => from === region).map(([to]) => to))
    const col = nextCol
    if (kids.length === 0) nextCol++
    for (const kid of kids) lay(kid, level + 1)
    place.set(region, { col, level })
  }
  roots.forEach((root, i) => {
    // Two one-column regions side by side on the bottom row leave no room for the gate between them.
    if (i > 0 && nextCol === place.get(roots[i - 1])!.col + 1) nextCol++
    lay(root, 0)
  })

  const labels = [...spec.regions.map(boxLabel), ...Object.keys(spec.gates).map(gateToken)]
  const colWidth = Math.max(16, ...labels.map(label => label.length)) + 4
  const maxLevel = Math.max(...[...place.values()].map(p => p.level))
  const width = nextCol * colWidth + 2 * MARGIN + 2
  const height = maxLevel * LEVEL_ROWS + 1 + 2 * MARGIN
  const centreX = (region: string) => MARGIN + 2 + place.get(region)!.col * colWidth + Math.floor(colWidth / 2)
  const rowY = (region: string) => MARGIN + (maxLevel - place.get(region)!.level) * LEVEL_ROWS

  const text: (string | undefined)[][] = Array.from({ length: height }, () => Array(width).fill(undefined))
  const solid: number[][] = Array.from({ length: height }, () => Array(width).fill(0))
  const drop: number[][] = Array.from({ length: height }, () => Array(width).fill(0))
  const write = (x: number, y: number, s: string) => [...s].forEach((ch, i) => (text[y][x + i] = ch))
  const segment = (x1: number, y1: number, x2: number, y2: number) => {
    const [dx, dy] = [Math.sign(x2 - x1), Math.sign(y2 - y1)]
    const step = STEPS.find(s => s.dx === dx && s.dy === dy)!
    for (let x = x1, y = y1; x !== x2 || y !== y2; x += dx, y += dy) {
      solid[y][x] |= step.out
      solid[y + dy][x + dx] |= step.back
    }
  }

  const boxSpan = new Map<string, { x: number; y: number; w: number }>()
  for (const region of spec.regions) {
    const label = boxLabel(region)
    const x = centreX(region) - Math.floor(label.length / 2)
    boxSpan.set(region, { x, y: rowY(region), w: label.length })
  }

  for (const [region, { of, gate }] of parent) {
    const [x, y, px, py] = [centreX(region), rowY(region), centreX(of), rowY(of)]
    if (py === y) {
      // Along the main path: right edge of one box to the left edge of the next, gate in the middle.
      const [a, b] = [boxSpan.get(of)!, boxSpan.get(region)!]
      segment(a.x + a.w, y, b.x - 1, y)
      const token = gateToken(gate)
      write(Math.floor((a.x + a.w + b.x - token.length) / 2), y, token)
      continue
    }
    const bus = py - 2
    segment(x, y + 1, x, bus)
    segment(x, bus, px, bus)
    segment(px, bus, px, py - 1)
    write(x, y + 2, gateToken(gate))
  }
  for (const [region, { x, y }] of boxSpan) write(x, y, boxLabel(region))
  write(boxSpan.get(spec.in)!.x - 2, rowY(spec.in), "→")
  const out = boxSpan.get(spec.out)!
  write(out.x + out.w + 1, out.y, "→")

  // A drop is routed cheapest-first around everything drawn: it may pass under a straight corridor or
  // another drop, never along one, never through a box or a label.
  const free = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && text[y][x] === undefined && solid[y][x] === 0 && drop[y][x] === 0
  const crossable = (x: number, y: number, step: (typeof STEPS)[number]) => {
    if (x < 0 || y < 0 || x >= width || y >= height || text[y][x] !== undefined) return false
    const lines = solid[y][x] | drop[y][x]
    return lines === (step.dx === 0 ? L | R : U | D)
  }
  const touching = (region: string) => {
    const { x, y, w } = boxSpan.get(region)!
    const cells: [number, number][] = [
      [x - 1, y],
      [x + w, y],
    ]
    for (let i = 0; i < w; i++) cells.push([x + i, y - 1], [x + i, y + 1])
    return cells.filter(([cx, cy]) => free(cx, cy))
  }
  const unrouted: string[] = []
  for (const { from, to } of spec.oneWays ?? []) {
    const goals = new Set(touching(to).map(([x, y]) => `${x},${y}`))
    // ponytail: linear-scan Dijkstra; the canvas is a few thousand cells, a heap if locks grow large.
    type Node = { x: number; y: number; dir: number; cost: number; prev?: Node }
    const open: Node[] = touching(from).map(([x, y]) => ({ x, y, dir: -1, cost: 0 }))
    const best = new Map<string, number>()
    let found: Node | undefined
    while (open.length > 0) {
      open.sort((a, b) => a.cost - b.cost)
      const node = open.shift()!
      const key = `${node.x},${node.y},${node.dir}`
      if ((best.get(key) ?? Infinity) <= node.cost) continue
      best.set(key, node.cost)
      if (goals.has(`${node.x},${node.y}`) && free(node.x, node.y)) {
        found = node
        break
      }
      const onLine = !free(node.x, node.y)
      STEPS.forEach((step, dir) => {
        if (onLine && dir !== node.dir) return
        const [nx, ny] = [node.x + step.dx, node.y + step.dy]
        const turn = node.dir !== -1 && node.dir !== dir ? 4 : 0
        if (free(nx, ny)) open.push({ x: nx, y: ny, dir, cost: node.cost + 1 + turn, prev: node })
        else if (crossable(nx, ny, step) && !turn) open.push({ x: nx, y: ny, dir, cost: node.cost + 6, prev: node })
      })
    }
    if (!found) {
      unrouted.push(`${from} ╌▶ ${to}`)
      continue
    }
    const path: Node[] = []
    for (let n: Node | undefined = found; n; n = n.prev) path.unshift(n)
    path.forEach((n, i) => {
      if (!free(n.x, n.y) && drop[n.y][n.x] === 0 && solid[n.y][n.x] !== 0) return // passes under
      const next = path[i + 1]
      for (const neighbour of [path[i - 1], next]) {
        if (!neighbour) continue
        drop[n.y][n.x] |= STEPS.find(s => s.dx === neighbour.x - n.x && s.dy === neighbour.y - n.y)!.out
      }
    })
    // Both ends are drawn: where the drop leaves its region, and an arrow where it lands.
    const [first, last] = [path[0], path[path.length - 1]]
    const outOf = (n: Node, region: string) => {
      const { x, y, w } = boxSpan.get(region)!
      return STEPS.find(s => {
        const [bx, by] = [n.x + s.dx, n.y + s.dy]
        return by === y && bx >= x && bx < x + w
      })!
    }
    if (path.length > 1) drop[first.y][first.x] |= outOf(first, from).out
    text[last.y][last.x] = outOf(last, to).arrow
  }

  const rows = text.map((row, y) =>
    row
      .map((ch, x) => ch ?? (solid[y][x] ? SOLID[solid[y][x]] : drop[y][x] ? (DROP[drop[y][x]] ?? "┼") : " "))
      .join("")
      .trimEnd()
  )
  while (rows[0] === "") rows.shift()
  while (rows[rows.length - 1] === "") rows.pop()
  const indent = Math.min(...rows.filter(Boolean).map(row => row.length - row.trimStart().length))
  const legend = "■ shut on arrival   □ open on arrival   ╌▶ one-way drop   Name:state opens it"
  return [...rows.map(row => row.slice(indent)), "", legend, ...unrouted.map(u => `unrouted drop: ${u}`)].join("\n")
}

// ---- solving ------------------------------------------------------------------------------------

/**
 * The cheapest way through, where every action (a board solved, a lever thrown) costs more than any
 * amount of walking — so it reads as what a player who plans ahead does. Steps are regions walked to,
 * `⤓region` for a drop taken, and `Id:state` for an action.
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
    if (order[at].region === spec.out) {
      end = at
      break
    }
    done.add(at)
    for (const to of edges[at]) {
      const acts = order[to].region === order[at].region
      const next = cost[at] + (acts ? 1000 : 1)
      if (next >= cost[to]) continue
      cost[to] = next
      prev[to] = at
    }
  }
  const path: number[] = []
  for (let n = end; n >= 0; n = prev[n]) path.unshift(n)
  const steps = [order[0].region]
  let actions = 0
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [order[path[i - 1]], order[path[i]]]
    if (a.region === b.region) {
      const id = Object.keys(b.config).find(m => b.config[m] !== a.config[m])!
      steps.push(`${id}:${b.config[id].split(".").pop()}`)
      actions++
      continue
    }
    const byGate = [...openGates(spec, a.config)].some(g => {
      const gate = spec.gates[g]
      return (gate.from === a.region && gate.to === b.region) || (gate.to === a.region && gate.from === b.region)
    })
    steps.push(byGate ? b.region : `⤓${b.region}`)
  }
  return { steps, actions }
}

// ---- quality ------------------------------------------------------------------------------------

const withoutGate = (lock: AuthoredLock, id: string, open: boolean): AuthoredLock => {
  const { [id]: gate, ...gates } = lock.gates
  const switches = Object.fromEntries(
    Object.entries(lock.switches).map(([s, v]) => [
      s,
      isHandle(v) ? { ...v, left: v.left.filter(g => g !== id), right: v.right.filter(g => g !== id) } : v,
    ])
  )
  const connections = [...(lock.connections ?? []), ...(open ? [[gate.from, gate.to] as [string, string]] : [])]
  return { ...lock, gates, switches, connections }
}

type Piece = { name: string; without: (lock: AuthoredLock) => AuthoredLock }

const piecesOf = (lock: AuthoredLock): Piece[] => [
  ...(lock.oneWays ?? []).map((w, i) => ({
    name: `drop ${w.from} >> ${w.to}`,
    without: (l: AuthoredLock) => ({ ...l, oneWays: l.oneWays!.filter((_, j) => j !== i) }),
  })),
  ...(lock.connections ?? []).map(([from, to], i) => ({
    name: `corridor ${from} -- ${to}`,
    without: (l: AuthoredLock) => ({ ...l, connections: l.connections!.filter((_, j) => j !== i) }),
  })),
  ...Object.keys(lock.gates).map(id => ({
    name: `gate ${id}`,
    without: (l: AuthoredLock) => withoutGate(l, id, false),
  })),
]

/**
 * What a sound lock costs, in actions (a board solved, a lever thrown, a key taken — walking is free):
 * the cheapest way out, the cheapest way out past every reward, and the worst a player can have left
 * to do from any state they can get into.
 */
const lockCosts = (lock: AuthoredLock) => {
  const spec = topologyLock(lock)
  if (!walkLock(spec).sound) return undefined
  const found = reachableStates(spec)
  if (found === "tooLarge") return undefined
  const { order, edges } = found
  const acts = (a: number, b: number) => (order[a].region === order[b].region ? 1 : 0)

  // Cheapest remaining actions to the way out, from every state: 0-1 BFS over the moves reversed.
  const backwards: number[][] = order.map(() => [])
  edges.forEach((tos, from) => tos.forEach(to => backwards[to].push(from)))
  const left = order.map(state => (state.region === spec.out ? 0 : Infinity))
  const deque = order.flatMap((state, n) => (state.region === spec.out ? [n] : []))
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

  // The same forwards, carrying which rewards have been walked past.
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
    if (order[at].region === spec.out && mask === full) rewarded = Math.min(rewarded, cost)
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

const profile = (lock: AuthoredLock): Profile | undefined => {
  const costs = lockCosts(lock)
  if (!costs) return undefined
  const needed = piecesOf(lock)
    .filter(piece => !walkLock(topologyLock(piece.without(lock))).sound)
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
 * What a sound lock could do without. Each drop, corridor and gate is taken away in turn, and each gate
 * propped open, and the lock measured again: a piece that changes none of the costs and makes no other
 * piece necessary is doing nothing. A drop whose loss only costs actions is a shortcut, not a need.
 */
export const lockQuality = (lock: AuthoredLock): string[] => {
  const base = profile(lock)
  if (!base) return []
  const notes: string[] = []
  if (base.exit < 2) notes.push("under two actions solve it: a single choice is a switch fork, not a lock")
  for (const piece of piecesOf(lock)) {
    if (base.needed.includes(piece.name)) continue
    const without = profile(piece.without(lock))
    if (sameProfile(without, base)) {
      notes.push(`${piece.name} does nothing`)
      continue
    }
    if (piece.name.startsWith("gate ")) continue
    if (without && (without.exit > base.exit || without.rewarded > base.rewarded))
      notes.push(`${piece.name} is an optional shortcut`)
  }
  for (const id of Object.keys(lock.gates))
    if (sameProfile(profile(withoutGate(lock, id, true)), base)) notes.push(`gate ${id} never stops anyone`)
  return notes
}

/** The regions no order of moves ever stands the player in — authored space the lock can never show. */
export const unreachedRegions = (spec: LockSpec): string[] | "tooLarge" => {
  const found = reachableStates(spec)
  if (found === "tooLarge") return found
  const reached = new Set(found.order.map(state => state.region))
  return spec.regions.filter(region => !reached.has(region))
}
