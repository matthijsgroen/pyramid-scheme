// A LOCK DRAWN THE WAY IT WOULD BE SKETCHED ON PAPER: the way in bottom left, the main path along the
// bottom to the way out, every other region rising off the one it joins, and each drop routed around
// what is drawn.
import type { Lock } from "./lockAuthoring"
import { barriersOf, isRegionGate, joinOf, nestSpotOf } from "./lockAuthoring"
import { openAtStart } from "./lockWalkSpec"
import type { DraftLock } from "./lockNotation"

type Sketch = {
  regions: string[]
  edges: Record<string, { from: string; to: string; token: string }>
  drops: { from: string; to: string; token?: string }[]
  boxes: Record<string, string>
  notes: string[]
  in: string
  out: string
}

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
const drawSketch = (sketch: Sketch): string => {
  const gateToken = (edge: string) => sketch.edges[edge].token
  const boxLabel = (region: string) => sketch.boxes[region]

  // The gate tree, rooted at the way in: a breadth-first parent for every region. A join that closes a
  // loop is not part of it, and is routed afterwards, like a drop.
  const links = new Map<string, { to: string; gate: string }[]>()
  for (const [gate, { from, to }] of Object.entries(sketch.edges)) {
    links.set(from, [...(links.get(from) ?? []), { to, gate }])
    links.set(to, [...(links.get(to) ?? []), { to: from, gate }])
  }
  const parent = new Map<string, { of: string; gate: string }>()
  const seen = new Set([sketch.in])
  const queue = [sketch.in]
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
  for (let at: string | undefined = seen.has(sketch.out) ? sketch.out : sketch.in; at; at = parent.get(at)?.of)
    main.unshift(at)
  // A region only drops reach is drawn beside the first region that drops into it; no corridor joins them.
  const hangs = new Map<string, string>()
  for (let grew = true; grew;) {
    grew = false
    for (const { from, to } of sketch.drops) {
      if (seen.has(to) || hangs.has(to) || !(seen.has(from) || hangs.has(from))) continue
      hangs.set(to, from)
      grew = true
    }
  }
  // ponytail: a region nothing reaches at all sits on the bottom row after the main path.
  const roots = [...main, ...sketch.regions.filter(region => !seen.has(region) && !hangs.has(region))]

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

  const labels = [...sketch.regions.map(boxLabel), ...Object.keys(sketch.edges).map(gateToken)]
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
  for (const region of sketch.regions) {
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
  write(boxSpan.get(sketch.in)!.x - 2, rowY(sketch.in), "→")
  const out = boxSpan.get(sketch.out)!
  write(out.x + out.w + 1, out.y, "→")

  // Drops and joins closing a loop are routed cheapest-first around everything drawn, and never cross a
  // line: the floor they stand for is flat, and a corridor has no bridge over another.
  const free = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && text[y][x] === undefined && solid[y][x] === 0 && drop[y][x] === 0
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
  type Node = { x: number; y: number; dir: number; cost: number; prev?: Node }
  const route = (from: string, to: string): Node[] | undefined => {
    const goals = new Set(touching(to).map(([x, y]) => `${x},${y}`))
    // ponytail: linear-scan Dijkstra; the canvas is a few thousand cells, a heap if locks grow large.
    const open: Node[] = touching(from).map(([x, y]) => ({ x, y, dir: -1, cost: 0 }))
    const best = new Map<string, number>()
    while (open.length > 0) {
      open.sort((a, b) => a.cost - b.cost)
      const node = open.shift()!
      const key = `${node.x},${node.y},${node.dir}`
      if ((best.get(key) ?? Infinity) <= node.cost) continue
      best.set(key, node.cost)
      if (goals.has(`${node.x},${node.y}`)) {
        const path: Node[] = []
        for (let n: Node | undefined = node; n; n = n.prev) path.unshift(n)
        return path
      }
      STEPS.forEach((step, dir) => {
        const [nx, ny] = [node.x + step.dx, node.y + step.dy]
        const turn = node.dir !== -1 && node.dir !== dir ? 4 : 0
        if (free(nx, ny)) open.push({ x: nx, y: ny, dir, cost: node.cost + 1 + turn, prev: node })
      })
    }
    return undefined
  }
  const outOf = (n: Node, region: string) => {
    const { x, y, w } = boxSpan.get(region)!
    return STEPS.find(s => {
      const [bx, by] = [n.x + s.dx, n.y + s.dy]
      return by === y && bx >= x && bx < x + w
    })!
  }
  const trace = (path: Node[], layer: number[][]) =>
    path.forEach((n, i) => {
      for (const neighbour of [path[i - 1], path[i + 1]]) {
        if (!neighbour) continue
        layer[n.y][n.x] |= STEPS.find(s => s.dx === neighbour.x - n.x && s.dy === neighbour.y - n.y)!.out
      }
    })

  // A token goes on the first straight stretch of a path with room for it; a path with none gets a note.
  const placeToken = (path: Node[], token: string): boolean => {
    for (let i = 0; i < path.length; i++) {
      let j = i
      while (j + 1 < path.length && path[j + 1].y === path[i].y) j++
      if (j - i + 1 < token.length + 2) continue
      write(
        Math.min(path[i].x, path[j].x) + Math.floor((Math.abs(path[j].x - path[i].x) + 1 - token.length) / 2),
        path[i].y,
        token
      )
      return true
    }
    return false
  }

  // A join closing a loop: a corridor routed around what is drawn, its gate written on a straight stretch.
  for (const [gate, { from, to }] of Object.entries(sketch.edges)) {
    if (parent.get(to)?.gate === gate || parent.get(from)?.gate === gate) continue
    const path = route(from, to)
    if (!path) {
      unrouted.push(`${from} -[${gateToken(gate)}]- ${to}`)
      continue
    }
    trace(path, solid)
    const [first, last] = [path[0], path[path.length - 1]]
    solid[first.y][first.x] |= outOf(first, from).out
    solid[last.y][last.x] |= outOf(last, to).out
    const token = gateToken(gate)
    if (!placeToken(path, token)) sketch.notes.push(`${from} -[${token}]- ${to}`)
  }

  // A falling corridor's gates are written on its drop line.
  for (const { from, to, token } of sketch.drops) {
    const path = route(from, to)
    if (!path) {
      unrouted.push(`${from} ╌▶ ${to}`)
      continue
    }
    trace(path, drop)
    // Both ends are drawn: where the drop leaves its region, and an arrow where it lands.
    const [first, last] = [path[0], path[path.length - 1]]
    if (path.length > 1) drop[first.y][first.x] |= outOf(first, from).out
    text[last.y][last.x] = outOf(last, to).arrow
    if (token !== undefined && !placeToken(path, token)) sketch.notes.push(`${from} >> -[${token}]- ${to}`)
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
  const legend =
    "■ shut at the start   □ open   ▒ region barred   ╌▶ one-way   ↺ reset   ⊙ plate   ◉ plate with a stone   Name:state opens it"
  return [
    ...rows.map(row => row.slice(indent)),
    "",
    ...sketch.notes,
    legend,
    ...unrouted.map(u => `no room to draw without crossing: ${u}`),
  ].join("\n")
}

const sketchOf = (lock: Lock, drafts: readonly string[]): Sketch => {
  const open = new Set(openAtStart(lock))
  const condition = (id: string) => {
    const gate = lock.gates[id]
    const owner = (name: string) => {
      const m = lock.mechanics[name]
      if (drafts.includes(name)) return `${name}?`
      // A plate, named with :empty when that is what it asks; or a condition on what the player carries.
      if (!m) return (lock as DraftLock).weights?.plates[name]?.opens.empty.includes(id) ? `${name}:empty` : name
      if (m.control === "fork-switch" || m.control === "sequence") return name
      return `${name}:${Object.keys(m.opens)
        .filter(state => m.opens[state].includes(id))
        .join("/")}`
    }
    const reset = Object.values(lock.mechanics).some(m => m.control === "sequence" && m.resetAt === id) ? "↺" : ""
    return gate.owners.map(owner).join(gate.mode === "any" ? "|" : "+") + reset
  }
  const token = (id: string) => (open.has(id) ? "□" : "■") + condition(id)
  const edges: Sketch["edges"] = {}
  const drops: Sketch["drops"] = []
  const notes: string[] = []
  // A busy spot is no spot (nestSpotOf), so it is drawn as its barriers.
  const nest = nestSpotOf(lock)
  lock.connections.forEach((connection, c) => {
    const [a, b] = joinOf(connection)
    const barriers = barriersOf(connection)
    const drop = barriers.find(id => Object.hasOwn(lock.oneWays ?? {}, id))
    if (!drop) {
      const spot = nest && [a, b].includes(nest.from) && [a, b].includes(nest.to)
      edges[String(c)] = { from: a, to: b, token: spot ? "&" : barriers.map(token).join(" ") }
      return
    }
    const others = barriers.filter(id => id !== drop)
    drops.push({ ...lock.oneWays![drop], ...(others.length > 0 ? { token: others.map(token).join(" ") } : {}) })
  })
  // A drop no connection names is a corridor of its own, drawn like any other.
  const named = new Set(lock.connections.flatMap(connection => barriersOf(connection)))
  for (const [id, oneWay] of Object.entries(lock.oneWays ?? {})) if (!named.has(id)) drops.push(oneWay)
  const boxes = Object.fromEntries(
    Object.keys(lock.regions).map(region => {
      const standing = Object.entries(lock.mechanics).flatMap(([id, m]) => ("in" in m && m.in === region ? [id] : []))
      const steps = Object.entries(lock.mechanics).flatMap(([id, m]) =>
        m.control === "sequence" ? m.steps.flatMap((step, k) => (step.in === region ? [`${id}${k + 1}`] : [])) : []
      )
      const weights = (lock as DraftLock).weights
      const plates = Object.entries(weights?.plates ?? {}).flatMap(([id, plate]) =>
        plate.in === region ? [`${plate.stone ? "◉" : "⊙"}${id}`] : []
      )
      const barred = Object.entries(lock.gates)
        .filter(([, gate]) => isRegionGate(gate) && gate.region === region)
        .map(([id]) => ` ${open.has(id) ? "░" : "▒"}${condition(id)}`)
        .join("")
      return [region, `[${[region, ...standing, ...steps, ...plates].join(" · ")}${barred}]`]
    })
  )
  return { regions: Object.keys(lock.regions), edges, drops, boxes, notes, in: lock.in, out: lock.out }
}

export const drawLock = (lock: Lock, drafts: readonly string[] = []): string => drawSketch(sketchOf(lock, drafts))
