import { mulberry32 } from "./random"
import type {
  AssemblerResult,
  FloorConfig,
  FloorGrid,
  GridCell,
  Direction,
  CorridorCell,
  RoomCell,
  KeyColor,
  SubSection,
} from "./siteTypes"
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
// Returns adjacency function, BFS path from entrance to farthest cell, and passages set.
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

  // BFS from entrance to find farthest reachable cell (deepest dead-end in spanning tree)
  const par = new Map<string, string | null>([[`${entR},${entC}`, null]])
  const q: Array<[number, number, number]> = [[entR, entC, 0]]
  let farthest: [number, number] = [entR, entC]
  let maxDist = 0
  while (q.length > 0) {
    const [r, c, d] = q.shift()!
    if (d > maxDist) {
      maxDist = d
      farthest = [r, c]
    }
    for (const [nr, nc] of neighbors(r, c)) {
      if (!par.has(`${nr},${nc}`)) {
        par.set(`${nr},${nc}`, `${r},${c}`)
        q.push([nr, nc, d + 1])
      }
    }
  }

  const mainPath: Array<[number, number]> = []
  let cur: string | null = `${farthest[0]},${farthest[1]}`
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

const buildIntermediateTypes = (pathPuzzles: number, chestEvery: number): Array<"puzzle" | "chest"> => {
  const types: Array<"puzzle" | "chest"> = []
  for (let p = 1; p <= pathPuzzles; p++) {
    types.push("puzzle")
    if (chestEvery > 0 && p % chestEvery === 0) types.push("chest")
  }
  return types
}

export const assembleFloor = (siteId: string, config: FloorConfig, seed: number): AssemblerResult => {
  const hasGatedFloorKey = config.sideSections.some(s => s.gate?.type === "floor-key")
  const hasUngated = config.sideSections.some(s => !s.gate)

  // Auto-inject a minimal ungated treasure section as key-holder when all sections are gated
  const sideSections =
    hasGatedFloorKey && !hasUngated
      ? [...config.sideSections, { pathPuzzles: 0, difficulty: "starter" as const, end: "treasure" as const }]
      : config.sideSections

  const gatedFloorKeyIdxs = sideSections.map((_, i) => i).filter(i => sideSections[i].gate?.type === "floor-key")
  const ungatedIdxs = sideSections.map((_, i) => i).filter(i => !sideSections[i].gate)

  // Build the ordered sequence of intermediate main-path node types
  const intermediateTypes = buildIntermediateTypes(config.pathPuzzles, config.chestEvery ?? 0)

  // Minimum cells needed (nodes only, sections may need extra for branching)
  const minCells =
    1 + // entrance
    intermediateTypes.length +
    1 + // goal
    1 + // exit/stairhead
    sideSections.reduce((sum, sec) => {
      const si = buildIntermediateTypes(sec.pathPuzzles, sec.chestEvery ?? 0)
      const rc = si.length + 1 + (sec.gate ? 1 : 0)
      const secCells = rc <= 1 ? rc : (rc - 1) * 2 + 1
      const subCells = (sec.sideSections ?? []).reduce((s2, sub) => {
        const subI = buildIntermediateTypes(sub.pathPuzzles, sub.chestEvery ?? 0)
        const subRc = subI.length + 1 + (sub.gate ? 1 : 0)
        return s2 + (subRc <= 1 ? subRc : (subRc - 1) * 2 + 1)
      }, 0)
      return sum + secCells + subCells
    }, 0)

  // Derive odd grid size: enough cells + padding for layout freedom
  let N = 3
  while (N * N < minCells + N + sideSections.length) N += 2

  const nid = (r: number, c: number) => `${siteId}-${r}-${c}`

  for (let attempt = 0; attempt < 30; attempt++) {
    if (attempt > 0 && attempt % 4 === 0) N += 2

    const rand = mulberry32(seed + attempt * 7919)
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

    // Stride-2 spacing: 1 corridor between each room.
    // Exit placed at the farthest dead-end (degree-1) so no corridor passes through it.
    const interLen = intermediateTypes.length
    const minPathLen = interLen * 2 + 3
    if (mainPath.length < minPathLen + 1) continue

    const mainNodeCells: Array<[number, number]> = [mainPath[0]]
    for (let i = 0; i < interLen; i++) mainNodeCells.push(mainPath[(i + 1) * 2])
    mainNodeCells.push(mainPath[minPathLen - 1])

    // Full mainPath as corridor so sections can branch from anywhere along it
    const usedCells = new Set<string>(mainPath.map(([r, c]) => `${r},${c}`))
    const [exR, exC] = mainPath[mainPath.length - 1]

    // Assign each section to cells branching from any main path cell (excluding center).
    type SectionGroup = {
      sectionIdx: number
      cells: Array<[number, number]>
      intermediate: Array<"puzzle" | "chest">
      attachedAt: [number, number]
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
      const secIntermediate = buildIntermediateTypes(section.pathPuzzles, section.chestEvery ?? 0)
      const roomCount = secIntermediate.length + 1 + (section.gate ? 1 : 0)
      const needed = roomCount <= 1 ? roomCount : (roomCount - 1) * 2 + 1
      let placed = false

      for (const {
        pathCell: [pcr, pcc],
      } of shuffledCandidates) {
        const freeAdj = neighbors(pcr, pcc)
          .filter(([ar, ac]) => !usedCells.has(`${ar},${ac}`))
          .sort(() => rand() - 0.5)
        if (freeAdj.length === 0) continue

        for (const [startR, startC] of freeAdj) {
          usedCells.add(`${startR},${startC}`)
          const rest = extendPath(startR, startC, needed - 1, neighbors, usedCells, rand)
          if (rest === null) {
            usedCells.delete(`${startR},${startC}`)
            continue
          }
          const cells: Array<[number, number]> = [[startR, startC], ...rest]
          cells.slice(1).forEach(([r, c]) => usedCells.add(`${r},${c}`))
          sectionGroups.push({ sectionIdx: si, cells, intermediate: secIntermediate, attachedAt: [pcr, pcc] })
          placed = true
          break
        }
        if (placed) break
      }

      if (!placed) {
        failed = true
        break
      }
    }

    // ── Sub-sections: branch from cells of parent sections ─────────────────
    type SubSectionGroup = {
      subSection: SubSection
      cells: Array<[number, number]>
      intermediate: Array<"puzzle" | "chest">
      keyNodeId?: string
      isKeyHost: boolean
      keyHostColor?: KeyColor
      keyHostColors?: KeyColor[]
    }
    const subSectionGroups: SubSectionGroup[] = []

    for (const group of sectionGroups) {
      if (failed) break
      const parentSection = sideSections[group.sectionIdx]
      if (!parentSection.sideSections?.length) continue

      let subSects = parentSection.sideSections
      // Auto-inject ungated key-holder if all sub-sections are floor-key gated
      const allSubGated = subSects.every(s => s.gate?.type === "floor-key")
      const anySubUngated = subSects.some(s => !s.gate)
      if (allSubGated && !anySubUngated)
        subSects = [...subSects, { pathPuzzles: 0, difficulty: "starter" as const, end: "treasure" as const }]

      const subGatedIdxs = subSects.map((_, i) => i).filter(i => subSects[i].gate?.type === "floor-key")
      const subUngatedIdxs = subSects.map((_, i) => i).filter(i => !subSects[i].gate)

      // Branch candidates: parent section cells (excluding end cell)
      const subBranchCandidates = group.cells
        .slice(0, -1)
        .filter(([pr, pc]) => neighbors(pr, pc).some(([ar, ac]) => !usedCells.has(`${ar},${ac}`)))
        .sort(() => rand() - 0.5)

      const placedSubs: Array<{
        idx: number
        cells: Array<[number, number]>
        intermediate: Array<"puzzle" | "chest">
      }> = []

      for (let si = 0; si < subSects.length; si++) {
        const sub = subSects[si]
        const subIntermediate = buildIntermediateTypes(sub.pathPuzzles, sub.chestEvery ?? 0)
        const subRoomCount = subIntermediate.length + 1 + (sub.gate ? 1 : 0)
        const subNeeded = subRoomCount <= 1 ? subRoomCount : (subRoomCount - 1) * 2 + 1
        let placed = false

        for (const [pcr, pcc] of subBranchCandidates) {
          const freeAdj = neighbors(pcr, pcc)
            .filter(([ar, ac]) => !usedCells.has(`${ar},${ac}`))
            .sort(() => rand() - 0.5)
          if (freeAdj.length === 0) continue
          for (const [startR, startC] of freeAdj) {
            usedCells.add(`${startR},${startC}`)
            const rest = extendPath(startR, startC, subNeeded - 1, neighbors, usedCells, rand)
            if (rest === null) {
              usedCells.delete(`${startR},${startC}`)
              continue
            }
            const cells: Array<[number, number]> = [[startR, startC], ...rest]
            cells.slice(1).forEach(([r, c]) => usedCells.add(`${r},${c}`))
            placedSubs.push({ idx: si, cells, intermediate: subIntermediate })
            placed = true
            break
          }
          if (placed) break
        }
        if (!placed) {
          failed = true
          break
        }
      }
      if (failed) break

      // Key distribution for this parent's sub-sections
      const subColorOrder: KeyColor[] = []
      const subGatedByColor = new Map<KeyColor, number[]>()
      for (const gatedIdx of subGatedIdxs) {
        const gate = subSects[gatedIdx].gate as { type: "floor-key"; color?: KeyColor }
        const color: KeyColor = gate.color ?? "blue"
        if (!subGatedByColor.has(color)) {
          subGatedByColor.set(color, [])
          subColorOrder.push(color)
        }
        subGatedByColor.get(color)!.push(gatedIdx)
      }
      const subKeyNodeIdMap = new Map<number, string>()
      const subKeyHostColorsMap = new Map<number, KeyColor[]>()
      for (let ci = 0; ci < subColorOrder.length; ci++) {
        const color = subColorOrder[ci]
        const hostIdx = subUngatedIdxs[ci % subUngatedIdxs.length]
        const hostPlaced = placedSubs.find(g => g.idx === hostIdx)
        if (!hostPlaced) continue
        const [er, ec] = hostPlaced.cells[hostPlaced.cells.length - 1]
        const keyId = nid(er, ec)
        if (!subKeyHostColorsMap.has(hostIdx)) subKeyHostColorsMap.set(hostIdx, [])
        subKeyHostColorsMap.get(hostIdx)!.push(color)
        for (const gatedIdx of subGatedByColor.get(color)!) subKeyNodeIdMap.set(gatedIdx, keyId)
      }
      const subKeyHostIdxs = new Set(subKeyHostColorsMap.keys())

      for (const { idx, cells, intermediate } of placedSubs) {
        subSectionGroups.push({
          subSection: subSects[idx],
          cells,
          intermediate,
          keyNodeId: subKeyNodeIdMap.get(idx),
          isKeyHost: subKeyHostIdxs.has(idx),
          keyHostColor: subKeyHostColorsMap.get(idx)?.[0],
          keyHostColors: subKeyHostColorsMap.get(idx),
        })
      }
    }

    if (failed) continue

    // Build a random key chain: treasure-end gated sections first (they relay the next key),
    // staircase-end sections last (they're terminal and can't hold a relay key).
    // chain[0]'s key → ungated section end; chain[i]'s key → chain[i-1]'s end room.
    const gatedTreasureIdxs = gatedFloorKeyIdxs.filter(i => sideSections[i].end !== "staircase")
    const gatedStaircaseIdxs = gatedFloorKeyIdxs.filter(i => sideSections[i].end === "staircase")
    const chain = [
      ...[...gatedTreasureIdxs].sort(() => rand() - 0.5),
      ...[...gatedStaircaseIdxs].sort(() => rand() - 0.5),
    ]

    const keyNodeIdMap = new Map<number, string>() // gated section idx → key node id
    const chainKeyColorMap = new Map<number, KeyColor>() // section idx → key color its end room holds

    if (chain.length > 0 && ungatedIdxs.length > 0) {
      const hostGroup = sectionGroups.find(g => g.sectionIdx === ungatedIdxs[0])
      if (hostGroup) {
        const [er, ec] = hostGroup.cells[hostGroup.cells.length - 1]
        keyNodeIdMap.set(chain[0], nid(er, ec))
        const gate0 = sideSections[chain[0]].gate as { type: "floor-key"; color?: KeyColor }
        chainKeyColorMap.set(ungatedIdxs[0], gate0.color ?? "blue")
      }
      for (let ci = 1; ci < chain.length; ci++) {
        const prevGroup = sectionGroups.find(g => g.sectionIdx === chain[ci - 1])
        if (!prevGroup) continue
        const [er, ec] = prevGroup.cells[prevGroup.cells.length - 1]
        keyNodeIdMap.set(chain[ci], nid(er, ec))
        const gateI = sideSections[chain[ci]].gate as { type: "floor-key"; color?: KeyColor }
        chainKeyColorMap.set(chain[ci - 1], gateI.color ?? "blue")
      }
    }

    const chainKeyHostIdxs = new Set(chainKeyColorMap.keys())

    // Build room cell specs: posKey -> room properties
    type RoomSpec = Omit<RoomCell, "type" | "dirs" | "state">
    const roomSpecs = new Map<string, RoomSpec>()

    const posKey = (r: number, c: number) => `${r},${c}`

    // Collect branch junction cells (become fork nodes)
    const forkPositions = new Set(sectionGroups.map(g => posKey(g.attachedAt[0], g.attachedAt[1])))

    // Main path nodes
    const lastPuzzleIntermediateIdx = config.lastMainPuzzleFamily ? intermediateTypes.lastIndexOf("puzzle") : -1
    let mainChestIdx = 0
    for (let mi = 0; mi < mainNodeCells.length; mi++) {
      const [r, c] = mainNodeCells[mi]
      if (mi === 0) {
        roomSpecs.set(posKey(r, c), { roomType: "entrance" })
      } else if (mi === mainNodeCells.length - 1) {
        roomSpecs.set(posKey(r, c), {
          roomType: "treasure",
          reward: config.mainEndReward ?? { type: "mosaicPiece" },
        })
      } else if (intermediateTypes[mi - 1] === "chest") {
        roomSpecs.set(posKey(r, c), {
          roomType: "treasure",
          reward: config.chestRewards?.[mainChestIdx++] ?? { type: "hieroglyphs" },
        })
      } else {
        const isLastPuzzle = mi - 1 === lastPuzzleIntermediateIdx
        const family =
          isLastPuzzle && config.lastMainPuzzleFamily
            ? config.lastMainPuzzleFamily
            : (config.puzzleFamily ?? "sumplete")
        roomSpecs.set(posKey(r, c), { roomType: "puzzle", family })
      }
    }

    // Corridor cells that are branch junctions become fork nodes too
    for (const pk of forkPositions) {
      if (!roomSpecs.has(pk)) roomSpecs.set(pk, { roomType: "fork" })
    }

    // Exit / stairhead
    roomSpecs.set(posKey(exR, exC), {
      roomType: config.exitOrStaircase === "exit" ? "exit" : "stairhead",
    })

    // The farthest mainPath cell has degree 1 (no free adjacents) so no section can branch from it.
    // Give it a small treasure so it renders as a room rather than a dead-end corridor.
    const [farthestR, farthestC] = mainPath[mainPath.length - 1]
    if (!roomSpecs.has(posKey(farthestR, farthestC))) {
      roomSpecs.set(posKey(farthestR, farthestC), { roomType: "treasure", reward: { type: "hieroglyphs" } })
    }

    // Section nodes
    for (const group of sectionGroups) {
      const { sectionIdx, cells, intermediate } = group
      const section = sideSections[sectionIdx]
      const isFloorKeyGate = section.gate?.type === "floor-key"
      const isTombKeyGate = section.gate?.type === "tomb-key"
      const keyNodeId = isFloorKeyGate ? keyNodeIdMap.get(sectionIdx) : undefined

      let contentStart = 0

      // Gate node occupies cells[0] for gated sections
      if (isFloorKeyGate && keyNodeId) {
        const [gr, gc] = cells[0]
        const floorKeyGate = section.gate as { type: "floor-key"; color?: KeyColor }
        roomSpecs.set(posKey(gr, gc), {
          roomType: "gate",
          requiredKeyId: keyNodeId,
          gateVariant: "floor-key",
          keyColor: floorKeyGate.color ?? "blue",
        })
        contentStart = 1
      } else if (isTombKeyGate) {
        const [gr, gc] = cells[0]
        const tombGate = section.gate as { type: "tomb-key"; wardKeyId: string }
        roomSpecs.set(posKey(gr, gc), {
          roomType: "gate",
          requiredKeyId: tombGate.wardKeyId,
          gateVariant: "tomb-key",
        })
        contentStart = 1
      }

      // Intermediate nodes within section (puzzles + chests), stride-2 to leave corridors
      for (let pi = 0; pi < intermediate.length; pi++) {
        const [r, c] = cells[(contentStart + pi) * 2]
        if (intermediate[pi] === "chest") {
          roomSpecs.set(posKey(r, c), { roomType: "treasure", reward: { type: "hieroglyphs" } })
        } else {
          roomSpecs.set(posKey(r, c), { roomType: "puzzle", family: config.puzzleFamily ?? "sumplete" })
        }
      }

      // End node
      const [er, ec] = cells[cells.length - 1]
      if (chainKeyHostIdxs.has(sectionIdx)) {
        roomSpecs.set(posKey(er, ec), {
          roomType: "treasure",
          reward: { type: "tombKey", keyId: nid(er, ec) },
          keyColor: chainKeyColorMap.get(sectionIdx),
        })
      } else if (section.end === "staircase") {
        roomSpecs.set(posKey(er, ec), { roomType: "stairhead" })
      } else {
        roomSpecs.set(posKey(er, ec), {
          roomType: "treasure",
          reward: section.endReward ?? { type: "hieroglyphs" },
        })
      }
    }

    // Sub-section nodes
    for (const {
      subSection,
      cells,
      intermediate,
      keyNodeId,
      isKeyHost,
      keyHostColor,
      keyHostColors,
    } of subSectionGroups) {
      const isFloorKeyGate = subSection.gate?.type === "floor-key"
      const isTombKeyGate = subSection.gate?.type === "tomb-key"
      let contentStart = 0

      if (isFloorKeyGate && keyNodeId) {
        const [gr, gc] = cells[0]
        const floorKeyGate = subSection.gate as { type: "floor-key"; color?: KeyColor }
        roomSpecs.set(posKey(gr, gc), {
          roomType: "gate",
          requiredKeyId: keyNodeId,
          gateVariant: "floor-key",
          keyColor: floorKeyGate.color ?? "blue",
        })
        contentStart = 1
      } else if (isTombKeyGate) {
        const [gr, gc] = cells[0]
        const tombGate = subSection.gate as { type: "tomb-key"; wardKeyId: string }
        roomSpecs.set(posKey(gr, gc), {
          roomType: "gate",
          requiredKeyId: tombGate.wardKeyId,
          gateVariant: "tomb-key",
        })
        contentStart = 1
      }

      for (let pi = 0; pi < intermediate.length; pi++) {
        const [r, c] = cells[(contentStart + pi) * 2]
        if (intermediate[pi] === "chest") {
          roomSpecs.set(posKey(r, c), { roomType: "treasure", reward: { type: "hieroglyphs" } })
        } else {
          roomSpecs.set(posKey(r, c), { roomType: "puzzle", family: config.puzzleFamily ?? "sumplete" })
        }
      }

      const [er, ec] = cells[cells.length - 1]
      if (isKeyHost) {
        const hColors = keyHostColors ?? (keyHostColor ? [keyHostColor] : [])
        roomSpecs.set(posKey(er, ec), {
          roomType: "treasure",
          reward: { type: "tombKey", keyId: nid(er, ec) },
          ...(hColors.length === 1 ? { keyColor: hColors[0] } : {}),
          ...(hColors.length > 1 ? { keyColors: hColors } : {}),
        })
      } else if (subSection.end === "staircase") {
        roomSpecs.set(posKey(er, ec), { roomType: "stairhead" })
      } else {
        roomSpecs.set(posKey(er, ec), {
          roomType: "treasure",
          reward: subSection.endReward ?? { type: "hieroglyphs" },
        })
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
          ...(spec.keyColor ? { keyColor: spec.keyColor } : {}),
          ...(spec.keyColors ? { keyColors: spec.keyColors } : {}),
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
