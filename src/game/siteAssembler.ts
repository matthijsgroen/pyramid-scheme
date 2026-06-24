import { mulberry32 } from "./random"
import type { AssemblerResult, FloorConfig, FloorGrid, GridCell, Direction, CorridorCell, RoomCell } from "./siteTypes"
import { validateSite } from "./siteValidator"

const DIRS: Array<[number, number]> = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
]

const DIRMAP: Array<[number, number, Direction]> = [
  [-1, 0, "n"],
  [0, 1, "e"],
  [1, 0, "s"],
  [0, -1, "w"],
]

const makePkey = (N: number) => (r1: number, c1: number, r2: number, c2: number) => {
  const a = r1 * N + c1,
    b = r2 * N + c2
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

// Generate a perfect DFS maze on an N×N grid starting from (entR, entC).
// Returns adjacency function, BFS shortest path from entrance to center, and passages set.
const buildMaze = (N: number, entR: number, entC: number, rand: () => number) => {
  const passages = new Set<string>()
  const visited = new Set<string>()
  const pkey = makePkey(N)

  // ponytail: iterative DFS avoids stack overflow for large N
  const stack: Array<[number, number]> = [[entR, entC]]
  visited.add(`${entR},${entC}`)
  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1]
    const unvisited = DIRS.map(([dr, dc]) => [r + dr, c + dc] as [number, number]).filter(
      ([nr, nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && !visited.has(`${nr},${nc}`)
    )
    if (unvisited.length === 0) {
      stack.pop()
    } else {
      const [nr, nc] = unvisited[Math.floor(rand() * unvisited.length)]
      passages.add(pkey(r, c, nr, nc))
      visited.add(`${nr},${nc}`)
      stack.push([nr, nc])
    }
  }

  const neighbors = (r: number, c: number): Array<[number, number]> =>
    DIRS.map(([dr, dc]) => [r + dr, c + dc] as [number, number]).filter(
      ([nr, nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && passages.has(pkey(r, c, nr, nc))
    )

  // BFS from entrance to center
  const mid = Math.floor(N / 2)
  const par = new Map<string, string | null>([[`${entR},${entC}`, null]])
  const q: Array<[number, number]> = [[entR, entC]]
  outer: while (q.length > 0) {
    const [r, c] = q.shift()!
    for (const [nr, nc] of neighbors(r, c)) {
      if (!par.has(`${nr},${nc}`)) {
        par.set(`${nr},${nc}`, `${r},${c}`)
        q.push([nr, nc])
        if (nr === mid && nc === mid) break outer
      }
    }
  }

  const mainPath: Array<[number, number]> = []
  let cur: string | null = `${mid},${mid}`
  while (cur) {
    const [r, c] = cur.split(",").map(Number)
    mainPath.unshift([r, c])
    cur = par.get(cur) ?? null
  }

  return { neighbors, mainPath, passages }
}

// Find a chain of `count` cells starting from (startR, startC),
// extending through available maze neighbors not in usedCells.
const extendPath = (
  startR: number,
  startC: number,
  count: number,
  neighbors: (r: number, c: number) => Array<[number, number]>,
  usedCells: Set<string>,
  rand: () => number
): Array<[number, number]> | null => {
  if (count === 0) return []
  const result: Array<[number, number]> = []
  const tempUsed = new Set(usedCells)

  const dfs = (r: number, c: number, remaining: number): boolean => {
    if (remaining === 0) return true
    const nbrs = neighbors(r, c)
      .filter(([nr, nc]) => !tempUsed.has(`${nr},${nc}`))
      .sort(() => rand() - 0.5)
    for (const [nr, nc] of nbrs) {
      tempUsed.add(`${nr},${nc}`)
      result.push([nr, nc])
      if (dfs(nr, nc, remaining - 1)) return true
      result.pop()
      tempUsed.delete(`${nr},${nc}`)
    }
    return false
  }

  return dfs(startR, startC, count) ? result : null
}

export const assembleFloor = (siteId: string, config: FloorConfig, seed: number): AssemblerResult => {
  const hasGatedFloorKey = config.sideSections.some(s => s.gate?.type === "floor-key")
  const hasUngated = config.sideSections.some(s => !s.gate)

  // Auto-inject a minimal ungated treasure section as key-holder when all sections are gated
  const sideSections =
    hasGatedFloorKey && !hasUngated
      ? [...config.sideSections, { pathPuzzles: 0, difficulty: "easy" as const, end: "treasure" as const }]
      : config.sideSections

  const gatedFloorKeyIdxs = sideSections.map((_, i) => i).filter(i => sideSections[i].gate?.type === "floor-key")
  const ungatedIdxs = sideSections.map((_, i) => i).filter(i => !sideSections[i].gate)

  // Minimum cells needed (nodes only, sections may need extra for branching)
  const minCells =
    1 + // entrance
    config.pathPuzzles +
    1 + // goal
    1 + // exit/stairhead
    sideSections.reduce((sum, sec) => sum + sec.pathPuzzles + 1 + (sec.gate ? 1 : 0), 0)

  // Derive odd grid size: enough cells + padding for layout freedom
  let N = 3
  while (N * N < minCells + N + sideSections.length) N += 2

  const nid = (r: number, c: number) => `${siteId}-${r}-${c}`

  for (let attempt = 0; attempt < 30; attempt++) {
    if (attempt > 0 && attempt % 4 === 0) N += 2

    const rand = mulberry32(seed + attempt * 7919)
    const mid = Math.floor(N / 2)
    const pkey = makePkey(N)

    // Pick entrance from edge cells (non-corner preferred for more connections)
    const edgeCells: Array<[number, number]> = []
    for (let r = 0; r < N; r++) {
      edgeCells.push([r, 0])
      edgeCells.push([r, N - 1])
    }
    for (let c = 1; c < N - 1; c++) {
      edgeCells.push([0, c])
      edgeCells.push([N - 1, c])
    }
    const [entR, entC] = edgeCells[Math.floor(rand() * edgeCells.length)]

    const { neighbors, mainPath, passages } = buildMaze(N, entR, entC, rand)

    // Need at least entrance + pathPuzzles + goal distinct cells on the main path
    if (mainPath.length < config.pathPuzzles + 2) continue

    const mainPathSet = new Set(mainPath.map(([r, c]) => `${r},${c}`))

    // Select which main path cells become nodes (entrance, evenly-spaced puzzles, goal)
    const nodeIndices = [0]
    for (let p = 1; p <= config.pathPuzzles; p++) {
      nodeIndices.push(Math.round((p * (mainPath.length - 1)) / (config.pathPuzzles + 1)))
    }
    nodeIndices.push(mainPath.length - 1)
    const mainNodeCells = nodeIndices.map(i => mainPath[i])

    const usedCells = new Set<string>(mainPathSet)

    // Exit/stairhead: prefer dead-end cells adjacent to center
    const adjFree = neighbors(mid, mid).filter(([nr, nc]) => !usedCells.has(`${nr},${nc}`))
    const onEntranceCorridor = (nr: number, nc: number): boolean => {
      if (entR === mid) return nr === mid
      if (entC === mid) return nc === mid
      return nr === entR || nc === mid
    }
    const pool = adjFree.filter(([nr, nc]) => !onEntranceCorridor(nr, nc))
    if (pool.length === 0) continue
    const deadEnds = pool.filter(([nr, nc]) => neighbors(nr, nc).length === 1)
    const exitCandidates = deadEnds.length > 0 ? deadEnds : pool
    const exitCell = exitCandidates[Math.floor(rand() * exitCandidates.length)]
    usedCells.add(`${exitCell[0]},${exitCell[1]}`)

    // Assign each section to cells branching from any main path cell (excluding center).
    type SectionGroup = {
      sectionIdx: number
      cells: Array<[number, number]>
    }
    const sectionGroups: SectionGroup[] = []
    let failed = false

    type BranchCandidate = { pathCell: [number, number] }
    const branchCandidates: BranchCandidate[] = []
    for (let pi = 0; pi < mainPath.length - 1; pi++) {
      const [pr, pc] = mainPath[pi]
      const hasAdj = neighbors(pr, pc).some(([ar, ac]) => !usedCells.has(`${ar},${ac}`))
      if (!hasAdj) continue
      branchCandidates.push({ pathCell: [pr, pc] })
    }
    const shuffledCandidates = [...branchCandidates].sort(() => rand() - 0.5)

    for (let si = 0; si < sideSections.length; si++) {
      const section = sideSections[si]
      const needed = section.pathPuzzles + 1 + (section.gate ? 1 : 0)
      let placed = false

      for (const {
        pathCell: [pcr, pcc],
      } of shuffledCandidates) {
        const freeAdj = neighbors(pcr, pcc).filter(([ar, ac]) => !usedCells.has(`${ar},${ac}`))
        if (freeAdj.length === 0) continue

        const [startR, startC] = freeAdj[Math.floor(rand() * freeAdj.length)]
        usedCells.add(`${startR},${startC}`)
        const rest = extendPath(startR, startC, needed - 1, neighbors, usedCells, rand)
        if (rest === null) {
          usedCells.delete(`${startR},${startC}`)
          continue
        }

        const cells: Array<[number, number]> = [[startR, startC], ...rest]
        cells.slice(1).forEach(([r, c]) => usedCells.add(`${r},${c}`))
        sectionGroups.push({ sectionIdx: si, cells })
        placed = true
        break
      }

      if (!placed) {
        failed = true
        break
      }
    }

    if (failed) continue

    // Pre-compute key node IDs (end cell of each key-host ungated section)
    const keyNodeIdMap = new Map<number, string>() // gated section idx → key node id
    for (let gi = 0; gi < gatedFloorKeyIdxs.length; gi++) {
      const gatedIdx = gatedFloorKeyIdxs[gi]
      const hostIdx = ungatedIdxs[gi % ungatedIdxs.length]
      const hostGroup = sectionGroups.find(g => g.sectionIdx === hostIdx)
      if (!hostGroup) continue
      const [er, ec] = hostGroup.cells[hostGroup.cells.length - 1]
      keyNodeIdMap.set(gatedIdx, nid(er, ec))
    }

    // Determine which section indices are key hosts
    const keyHostIdxs = new Set(
      [...keyNodeIdMap.entries()]
        .map(([, kid]) => {
          const g = sectionGroups.find(g => {
            const [er, ec] = g.cells[g.cells.length - 1]
            return nid(er, ec) === kid
          })
          return g?.sectionIdx
        })
        .filter((x): x is number => x !== undefined)
    )

    // Build room cell specs: posKey -> room properties
    type RoomSpec = Omit<RoomCell, "type" | "dirs" | "state">
    const roomSpecs = new Map<string, RoomSpec>()

    const posKey = (r: number, c: number) => `${r},${c}`

    // Main path nodes
    for (let mi = 0; mi < mainNodeCells.length; mi++) {
      const [r, c] = mainNodeCells[mi]
      if (mi === 0) {
        roomSpecs.set(posKey(r, c), { roomType: "entrance" })
      } else if (mi === mainNodeCells.length - 1) {
        roomSpecs.set(posKey(r, c), { roomType: "treasure", reward: { type: "mosaicPiece" } })
      } else {
        roomSpecs.set(posKey(r, c), { roomType: "puzzle", family: "sumplete" })
      }
    }

    // Exit / stairhead
    const [exR, exC] = exitCell
    roomSpecs.set(posKey(exR, exC), {
      roomType: config.exitOrStaircase === "exit" ? "exit" : "stairhead",
    })

    // Section nodes
    for (const group of sectionGroups) {
      const { sectionIdx, cells } = group
      const section = sideSections[sectionIdx]
      const isFloorKeyGate = section.gate?.type === "floor-key"
      const isTombKeyGate = section.gate?.type === "tomb-key"
      const keyNodeId = isFloorKeyGate ? keyNodeIdMap.get(sectionIdx) : undefined
      const isKeyHost = keyHostIdxs.has(sectionIdx)

      let contentStart = 0

      // Gate node occupies cells[0] for gated sections
      if (isFloorKeyGate && keyNodeId) {
        const [gr, gc] = cells[0]
        roomSpecs.set(posKey(gr, gc), { roomType: "gate", requiredKeyId: keyNodeId, gateVariant: "floor-key" })
        contentStart = 1
      } else if (isTombKeyGate) {
        const [gr, gc] = cells[0]
        roomSpecs.set(posKey(gr, gc), {
          roomType: "gate",
          requiredKeyId: `tomb-key-${siteId}-${sectionIdx}`,
          gateVariant: "tomb-key",
        })
        contentStart = 1
      }

      // Puzzle nodes within section
      for (let pi = 0; pi < section.pathPuzzles; pi++) {
        const [r, c] = cells[contentStart + pi]
        roomSpecs.set(posKey(r, c), { roomType: "puzzle", family: "sumplete" })
      }

      // End node
      const [er, ec] = cells[cells.length - 1]
      if (isKeyHost) {
        roomSpecs.set(posKey(er, ec), {
          roomType: "treasure",
          reward: { type: "tombKey", keyId: nid(er, ec) },
        })
      } else if (section.end === "staircase") {
        roomSpecs.set(posKey(er, ec), { roomType: "stairhead" })
      } else {
        roomSpecs.set(posKey(er, ec), { roomType: "treasure", reward: { type: "hieroglyphs" } })
      }
    }

    // Build 2D grid
    const cells2D: GridCell[][] = Array.from({ length: N }, () =>
      Array.from({ length: N }, (): GridCell => ({ type: "empty" }))
    )

    // Fill used cells with corridor or room
    for (const cellKey of usedCells) {
      const [r, c] = cellKey.split(",").map(Number)
      // Compute dirs from passages
      const dirs = new Set<Direction>()
      for (const [dr, dc, d] of DIRMAP) {
        const nr = r + dr,
          nc = c + dc
        if (
          nr >= 0 &&
          nr < N &&
          nc >= 0 &&
          nc < N &&
          passages.has(pkey(r, c, nr, nc)) &&
          usedCells.has(`${nr},${nc}`)
        ) {
          dirs.add(d)
        }
      }

      const spec = roomSpecs.get(cellKey)
      if (spec) {
        const roomCell: RoomCell = {
          type: "room",
          roomType: spec.roomType,
          dirs,
          state: "fogged",
          ...(spec.reward ? { reward: spec.reward } : {}),
          ...(spec.requiredKeyId ? { requiredKeyId: spec.requiredKeyId } : {}),
          ...(spec.gateVariant ? { gateVariant: spec.gateVariant } : {}),
          ...(spec.family ? { family: spec.family } : {}),
        }
        cells2D[r][c] = roomCell
      } else {
        const corridorCell: CorridorCell = {
          type: "corridor",
          dirs,
          state: "fogged",
        }
        cells2D[r][c] = corridorCell
      }
    }

    // Set entrance cell state to "reachable"
    const [entRr, entCc] = [entR, entC]
    const entranceCell = cells2D[entRr][entCc]
    if (entranceCell.type === "room") {
      cells2D[entRr][entCc] = { ...entranceCell, state: "reachable" }
    }

    const grid: FloorGrid = {
      cells: cells2D,
      rows: N,
      cols: N,
      entrancePos: [entR, entC],
      exitPos: [exR, exC],
      siteId,
    }

    const v = validateSite(grid)
    if (v.valid) return { success: true, grid }
  }

  return {
    success: false,
    reasons: [{ type: "layoutNotFound" }],
  }
}
