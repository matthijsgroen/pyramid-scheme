import type { LaidFloor } from "../laidFloor"
import { shuffle } from "../random"
import { DIRS2, NODE_STEP, edgeNodes, makePkey } from "./grid"
import { blockNodes, type ReservedBlock, type ReservedWalk } from "./reserveRooms"
import { pass } from "./state"
import type { Cell } from "./state"

/** What steers a DFS step: how likely it keeps straight ahead, and how likely a turn goes the way the last one did. */
type Steer = { straightBias: number; turnBias: number }

/** Which way a step turns relative to the one before it: 1 and -1 are the two rotations, 0 is straight on. */
const turnOf = (from: [number, number], to: [number, number]) => Math.sign(from[0] * to[1] - from[1] * to[0])

/** The next cell of a DFS walk: straight on by the bias, else a turn the way the last one went by the turn bias,
 * else any open neighbour. A walk with no turn bias draws exactly as a plain straightness bias does. */
const stepFrom = (
  unvisited: Array<[number, number]>,
  [r, c]: [number, number],
  incoming: [number, number] | undefined,
  lastTurn: number,
  rand: () => number,
  { straightBias, turnBias }: Steer
) => {
  const straightAhead = incoming && unvisited.find(([nr, nc]) => nr - r === incoming[0] && nc - c === incoming[1])
  if (straightAhead && rand() < straightBias) return straightAhead
  if (turnBias > 0 && incoming && lastTurn !== 0) {
    const sameWay = unvisited.find(([nr, nc]) => turnOf(incoming, [nr - r, nc - c]) === lastTurn)
    if (sameWay && rand() < turnBias) return sameWay
  }
  return unvisited[Math.floor(rand() * unvisited.length)]
}

// Generate a perfect DFS maze on an N×N grid starting from (entR, entC).
// Returns the BFS path from entrance to the chosen main-path endpoint, and the passages set.
// `targetDistance` picks the main path's length: the *true* farthest node in the spanning tree is
// always the maze's diameter, which is a large fraction of the whole grid almost regardless of grid
// size — using it unconditionally means the main path is always "as long as physically possible,"
// never short relative to how little content it carries. Instead this picks the closest node to
// `targetDistance` hops from the entrance (falling back to the true farthest node if the grid is too
// small to reach it), so path length is something an author can actually target via
// FloorConfig.packing rather than an emergent side effect of grid size.
const buildMaze = (N: number, entR: number, entC: number, rand: () => number, steer: Steer, targetDistance: number) => {
  const passages = new Set<string>()
  const visited = new Set<string>()
  const pkey = makePkey(N)
  // Direction of travel used to reach each visited cell, for the straightness bias, and the way its last turn went.
  const arrivedVia = new Map<string, [number, number]>()
  const lastTurnAt = new Map<string, number>()

  // ponytail: iterative DFS avoids stack overflow for large N
  const stack: Array<[number, number]> = [[entR, entC]]
  visited.add(`${entR},${entC}`)
  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1]
    const unvisited = DIRS2.map(([dr, dc]) => [r + dr, c + dc] as [number, number]).filter(
      ([nr, nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && !visited.has(`${nr},${nc}`)
    )
    if (unvisited.length === 0) {
      stack.pop()
    } else {
      const incoming = arrivedVia.get(`${r},${c}`)
      const lastTurn = lastTurnAt.get(`${r},${c}`) ?? 0
      const [nr, nc] = stepFrom(unvisited, [r, c], incoming, lastTurn, rand, steer)
      passages.add(pkey(r, c, nr, nc))
      visited.add(`${nr},${nc}`)
      arrivedVia.set(`${nr},${nc}`, [nr - r, nc - c])
      lastTurnAt.set(`${nr},${nc}`, (incoming && turnOf(incoming, [nr - r, nc - c])) || lastTurn)
      stack.push([nr, nc])
    }
  }

  const neighbors = (r: number, c: number): Array<[number, number]> =>
    DIRS2.map(([dr, dc]) => [r + dr, c + dc] as [number, number]).filter(
      ([nr, nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && passages.has(pkey(r, c, nr, nc))
    )

  // BFS from entrance: track the true farthest node (fallback for a too-small grid) and the
  // closest node to targetDistance (preferred main-path endpoint — see comment above).
  const par = new Map<string, string | null>([[`${entR},${entC}`, null]])
  const q: Array<[number, number, number]> = [[entR, entC, 0]]
  let farthest: [number, number] = [entR, entC]
  let maxDist = 0
  let targetPick: [number, number] | null = null
  let targetPickDist = Infinity
  while (q.length > 0) {
    const [r, c, d] = q.shift()!
    if (d > maxDist) {
      maxDist = d
      farthest = [r, c]
    }
    if (d >= targetDistance && d < targetPickDist) {
      targetPickDist = d
      targetPick = [r, c]
    }
    for (const [nr, nc] of neighbors(r, c)) {
      if (!par.has(`${nr},${nc}`)) {
        par.set(`${nr},${nc}`, `${r},${c}`)
        q.push([nr, nc, d + 1])
      }
    }
  }
  const chosen = targetPick ?? farthest

  const mainPath: Array<[number, number]> = []
  let cur: string | null = `${chosen[0]},${chosen[1]}`
  while (cur) {
    const [r, c] = cur.split(",").map(Number)
    mainPath.unshift([r, c])
    cur = par.get(cur) ?? null
  }

  return { mainPath, passages }
}

// Grows the maze among the nodes a lock left free: passages join the laid ways exactly as laid, and a free
// node is reached from another free node and from no laid one, so a side path grown here can never join two
// regions the lock keeps apart. A side path attaches to laid ground by a passage the attach itself carves.
const growMazeAround = (N: number, laid: LaidFloor, rand: () => number, steer: Steer) => {
  const passages = new Set<string>(laid.passages)
  const pkey = makePkey(N)
  const visited = new Set<string>([...laid.label.keys(), ...laid.held])
  const arrivedVia = new Map<string, [number, number]>()
  const lastTurnAt = new Map<string, number>()
  for (let sr = 0; sr < N; sr += NODE_STEP)
    for (let sc = 0; sc < N; sc += NODE_STEP) {
      if (visited.has(`${sr},${sc}`)) continue
      visited.add(`${sr},${sc}`)
      const stack: Array<[number, number]> = [[sr, sc]]
      while (stack.length > 0) {
        const [r, c] = stack[stack.length - 1]
        const unvisited = DIRS2.map(([dr, dc]) => [r + dr, c + dc] as [number, number]).filter(
          ([nr, nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && !visited.has(`${nr},${nc}`)
        )
        if (unvisited.length === 0) {
          stack.pop()
          continue
        }
        const incoming = arrivedVia.get(`${r},${c}`)
        const lastTurn = lastTurnAt.get(`${r},${c}`) ?? 0
        const [nr, nc] = stepFrom(unvisited, [r, c], incoming, lastTurn, rand, steer)
        passages.add(pkey(r, c, nr, nc))
        visited.add(`${nr},${nc}`)
        arrivedVia.set(`${nr},${nc}`, [nr - r, nc - c])
        lastTurnAt.set(`${nr},${nc}`, (incoming && turnOf(incoming, [nr - r, nc - c])) || lastTurn)
        stack.push([nr, nc])
      }
    }
  return { mainPath: laid.route, passages }
}

// Grows the maze around the ways walked to the reserved blocks: every walked node is a root, taken in a shuffled
// order after the hubs' doors, and the DFS steps onto any node no walk and no block holds. A block is entered and left only along the
// rays its walks took, so nothing is dug through a ring.
const growAroundBlocks = (
  N: number,
  walks: ReservedWalk,
  blocks: readonly ReservedBlock[],
  rand: () => number,
  steer: Steer
) => {
  const passages = new Set<string>(walks.passages)
  const pkey = makePkey(N)
  const held = blockNodes(blocks)
  const walked = [...walks.mainPath, ...[...walks.spines.values()].flatMap(({ via, cells }) => [...via, ...cells])]
  const walkedKeys = new Set(walked.map(([r, c]) => `${r},${c}`))
  const visited = new Set<string>([...held, ...walkedKeys])
  const arrivedVia = new Map<string, [number, number]>()
  const lastTurnAt = new Map<string, number>()
  // A room on the main path is a hub: the node past each of its free rays roots a maze of its own, grown first, for
  // a side path to leave the room by.
  const doors = blocks
    .filter(({ on }) => "main" in on)
    .flatMap(({ rays }) => rays)
    .filter(ray => ray.slice(1, -1).every(([r, c]) => !walkedKeys.has(`${r},${c}`)))
    .map(ray => ray[ray.length - 1])
    .filter(([r, c]) => !visited.has(`${r},${c}`))
  for (const [r, c] of doors) visited.add(`${r},${c}`)
  const stack: Array<[number, number]> = [
    ...shuffle(
      walked.filter(([r, c]) => !held.has(`${r},${c}`)),
      rand
    ),
    ...shuffle(doors, rand),
  ]
  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1]
    const unvisited = DIRS2.map(([dr, dc]) => [r + dr, c + dc] as [number, number]).filter(
      ([nr, nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && !visited.has(`${nr},${nc}`)
    )
    if (unvisited.length === 0) {
      stack.pop()
      continue
    }
    const incoming = arrivedVia.get(`${r},${c}`)
    const lastTurn = lastTurnAt.get(`${r},${c}`) ?? 0
    const [nr, nc] = stepFrom(unvisited, [r, c], incoming, lastTurn, rand, steer)
    passages.add(pkey(r, c, nr, nc))
    visited.add(`${nr},${nc}`)
    arrivedVia.set(`${nr},${nc}`, [nr - r, nc - c])
    lastTurnAt.set(`${nr},${nc}`, (incoming && turnOf(incoming, [nr - r, nc - c])) || lastTurn)
    stack.push([nr, nc])
  }
  return { mainPath: walks.mainPath, passages }
}

/**
 * THE MAZE THE FLOOR IS CARVED FROM: a laid floor's route with a maze grown among the nodes the lock left
 * free, the ways walked to the reserved rooms with a maze grown around them, or a fresh maze from an edge
 * entrance whose main path walks the rung's target distance.
 *
 * The exit is a true dead end (degree 1). The packing knob (targetDistance) ends the main path at a
 * mid-maze node, not the maze's farthest leaf, so the exit cell keeps tree passages toward the
 * still-carved region past it. Left in place, `edgeAllowed` draws those as real doors into any adjacent
 * used side-section corridor, so the corridor reads as continuing past an exit that actually ends the
 * visit the moment it's stepped on. Every passage incident to the exit except the one to its main-path
 * predecessor is dropped here, before any branch is hung, so nothing branches through or beside it.
 */
export const growMaze = pass(
  "growMaze",
  ["rung", "lay", "rand"],
  ["maze"],
  (prep, state) => {
    const laid = state.lay?.laid
    const { rand } = state
    const walks = state.walks ?? undefined
    const N = laid ? laid.n : state.rung.n
    // The entrance stands on an edge node — the only kind of cell that can be a real node.
    const edgeCells: Cell[] = laid || walks ? [] : edgeNodes(N)
    const [entR, entC] = laid
      ? laid.route[0]
      : walks
        ? walks.entrance
        : edgeCells[Math.floor(rand() * edgeCells.length)]

    const steer: Steer = { straightBias: prep.sizing.straightBias, turnBias: 0 }
    const { mainPath, passages } = laid
      ? growMazeAround(N, laid, rand, steer)
      : walks
        ? growAroundBlocks(N, walks, state.blocks ?? [], rand, steer)
        : buildMaze(N, entR, entC, rand, steer, state.rung.targetDistance)

    const exit = mainPath[mainPath.length - 1]
    if (mainPath.length > 1) {
      const pkey = makePkey(N)
      const [exR, exC] = exit
      const [predR, predC] = mainPath[mainPath.length - 2]
      for (const [dr, dc] of DIRS2) {
        const nr = exR + dr,
          nc = exC + dc
        if (nr === predR && nc === predC) continue
        passages.delete(pkey(exR, exC, nr, nc))
      }
    }
    state.maze = { n: N, entrance: [entR, entC], exit, mainPath, passages }
  },
  ["walks", "blocks"]
)
