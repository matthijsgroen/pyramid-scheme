import { mulberry32 } from "./random"
import { hashString } from "@/support/hashString"
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
  SideSection,
  DecorationKind,
} from "./siteTypes"
import { validateSite } from "./siteValidator"

// Section hash covers structural fields only — not rewards, render style, or specific key IDs.
// Stable across: loot changes, key reassignment, corridor style tweaks.
// Changes on: puzzle count, chest cadence, difficulty, exit type, gate presence, hidden/trapped flags.
const computeMainSectionHash = (config: FloorConfig): string =>
  String(
    hashString(
      JSON.stringify({
        pathPuzzles: config.pathPuzzles,
        chestEvery: config.chestEvery,
        difficulty: config.difficulty,
        exitOrStaircase: config.exitOrStaircase,
      })
    )
  )

const computeSideSectionHash = (section: SideSection | SubSection, idx: number, parentIdx?: number): string =>
  String(
    hashString(
      JSON.stringify({
        idx,
        parentIdx,
        pathPuzzles: section.pathPuzzles,
        chestEvery: section.chestEvery,
        difficulty: section.difficulty,
        end: section.end,
        hidden: section.hidden,
        trapped: section.trapped,
        gateType: section.gate?.type,
      })
    )
  )

const DIRS: Array<[number, number]> = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
]

// Real path nodes live only on even/even grid coordinates, two cells apart in any
// direction — the cell directly between two connected nodes is a plain corridor
// connector. This guarantees a genuine empty gap wherever the maze winds back near
// itself (a switchback's two strands are never directly adjacent, only ever
// diagonally so), instead of a dense maze where every single cell is real path and
// parallel strands can end up touching with nothing but a thin wall between them.
const NODE_STEP = 2
const DIRS2: Array<[number, number]> = [
  [-NODE_STEP, 0],
  [0, NODE_STEP],
  [NODE_STEP, 0],
  [0, -NODE_STEP],
]
const CONNECTOR_DIRS: Array<[number, number, Direction]> = [
  [-NODE_STEP, 0, "n"],
  [0, NODE_STEP, "e"],
  [NODE_STEP, 0, "s"],
  [0, -NODE_STEP, "w"],
]
const OPPOSITE: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

const makePkey = (N: number) => (r1: number, c1: number, r2: number, c2: number) => {
  const a = r1 * N + c1,
    b = r2 * N + c2
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

// How often the DFS continues in the same direction instead of turning, when it can.
// A plain random-direction DFS maze is very serpentine (every step is a coin flip);
// biasing toward straight runs gives longer corridors and fewer forced turns, which
// reads as "a real place" and needs fewer click-to-reveal stops on first traversal.
const STRAIGHT_BIAS = 0.65

// Generate a perfect DFS maze on an N×N grid starting from (entR, entC).
// Returns adjacency function, BFS path from entrance to farthest cell, and passages set.
const buildMaze = (N: number, entR: number, entC: number, rand: () => number) => {
  const passages = new Set<string>()
  const visited = new Set<string>()
  const pkey = makePkey(N)
  // Direction of travel used to reach each visited cell, for the straightness bias.
  const arrivedVia = new Map<string, [number, number]>()

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
      const straightAhead = incoming && unvisited.find(([nr, nc]) => nr - r === incoming[0] && nc - c === incoming[1])
      const [nr, nc] =
        straightAhead && rand() < STRAIGHT_BIAS ? straightAhead : unvisited[Math.floor(rand() * unvisited.length)]
      passages.add(pkey(r, c, nr, nc))
      visited.add(`${nr},${nc}`)
      arrivedVia.set(`${nr},${nc}`, [nr - r, nc - c])
      stack.push([nr, nc])
    }
  }

  const neighbors = (r: number, c: number): Array<[number, number]> =>
    DIRS2.map(([dr, dc]) => [r + dr, c + dc] as [number, number]).filter(
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
// extending through available maze neighbors not in usedCells. The final cell in the
// chain becomes a section/sub-section endpoint, which later wants a multi-cell footprint
// (see the claiming pass in assembleFloor) — so when a `scorer` is given, the last step
// is biased toward a neighbor with more surrounding open space, same idea as fork
// placement above. Every other step stays a plain random shuffle.
const extendPath = (
  startR: number,
  startC: number,
  count: number,
  neighbors: (r: number, c: number) => Array<[number, number]>,
  usedCells: Set<string>,
  rand: () => number,
  scorer?: (r: number, c: number) => number
): Array<[number, number]> | null => {
  if (count === 0) return []
  const result: Array<[number, number]> = []
  const tempUsed = new Set(usedCells)

  const dfs = (r: number, c: number, remaining: number): boolean => {
    if (remaining === 0) return true
    const free = neighbors(r, c).filter(([nr, nc]) => !tempUsed.has(`${nr},${nc}`))
    const nbrs =
      remaining === 1 && scorer
        ? free
            .map(n => ({ n, score: scorer(n[0], n[1]) + rand() * 3 }))
            .sort((a, b) => b.score - a.score)
            .map(({ n }) => n)
        : free.sort(() => rand() - 0.5)
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
  // Gate/ungated checks use only visible sections so hidden sections don't satisfy key-holder requirements
  const visibleSections = config.sideSections.filter(s => !s.hidden)
  const hasGatedFloorKey = visibleSections.some(s => s.gate?.type === "floor-key")
  const hasUngated = visibleSections.some(s => !s.gate)

  // Hidden sections are included in maze generation (tagged hidden:true on cells) but masked by useAssembledFloor
  const allSections = config.sideSections
  const sideSections =
    hasGatedFloorKey && !hasUngated
      ? [...allSections, { pathPuzzles: 0, difficulty: "starter" as const, end: "treasure" as const }]
      : allSections

  const hiddenSectionIdxs = new Set(allSections.map((s, i) => (s.hidden ? i : -1)).filter(i => i >= 0))

  const gatedFloorKeyIdxs = sideSections.map((_, i) => i).filter(i => sideSections[i].gate?.type === "floor-key")
  const ungatedIdxs = sideSections.map((_, i) => i).filter(i => !sideSections[i].gate)

  // Build the ordered sequence of intermediate main-path node types
  const intermediateTypes = buildIntermediateTypes(config.pathPuzzles, config.chestEvery ?? 0)

  // Minimum node count needed (real path nodes only — the connector cell between two
  // adjacent nodes lives at a separate, non-node grid position, see NODE_STEP above).
  const minCells =
    1 + // entrance
    intermediateTypes.length +
    1 + // goal
    1 + // exit/stairhead
    sideSections.reduce((sum, sec) => {
      const si = buildIntermediateTypes(sec.pathPuzzles, sec.chestEvery ?? 0)
      const secCells = si.length + 1 + (sec.gate ? 1 : 0)
      const subCells = (sec.sideSections ?? []).reduce((s2, sub) => {
        const subI = buildIntermediateTypes(sub.pathPuzzles, sub.chestEvery ?? 0)
        return s2 + subI.length + 1 + (sub.gate ? 1 : 0)
      }, 0)
      return sum + secCells + subCells
    }, 0)

  // Rough count of fork/endpoint rooms that will want a decorative multi-cell footprint
  // later (see footprint-claiming pass below) — a one-pass estimate is fine since that
  // pass is best-effort (claims whatever's free, never fails).
  const subSectionCount = sideSections.reduce((s, sec) => s + (sec.sideSections?.length ?? 0), 0)
  const expectedFootprintRooms =
    sideSections.length /* forks */ +
    2 /* main end + exit */ +
    sideSections.length /* section ends */ +
    subSectionCount /* sub-section ends */
  const FOOTPRINT_SLACK_PER_ROOM = 2

  // Derive odd grid size. Only even/even positions can hold a real node (see NODE_STEP
  // above), so usable node capacity is ((N+1)/2)^2, not N^2 — the grid needs to be
  // noticeably bigger than the old dense model for the same amount of content, which
  // is exactly the point: the odd-position lattice between nodes is what guarantees a
  // genuine gap wherever the path winds back near itself.
  let N = 3
  while (
    Math.pow((N + 1) / 2, 2) <
    minCells * 4 + (N + 1) / 2 + sideSections.length + expectedFootprintRooms * FOOTPRINT_SLACK_PER_ROOM
  )
    N += 2

  const nid = (r: number, c: number) => `${siteId}-${r}-${c}`

  for (let attempt = 0; attempt < 30; attempt++) {
    if (attempt > 0 && attempt % 4 === 0) N += 2

    const rand = mulberry32(seed + attempt * 7919)
    const pkey = makePkey(N)

    // Pick entrance from edge cells (non-corner preferred for more connections).
    // Must be an even/even position — the only kind of cell that can be a real node.
    const edgeCells: Array<[number, number]> = []
    for (let r = 0; r < N; r += 2) {
      edgeCells.push([r, 0])
      edgeCells.push([r, N - 1])
    }
    for (let c = 2; c < N - 1; c += 2) {
      edgeCells.push([0, c])
      edgeCells.push([N - 1, c])
    }
    const [entR, entC] = edgeCells[Math.floor(rand() * edgeCells.length)]

    const { neighbors, mainPath, passages } = buildMaze(N, entR, entC, rand)

    // Exit placed at the farthest dead-end (degree-1) so no corridor passes through it.
    // mainPath is already a sequence of directly-connected nodes (see buildMaze), so
    // the main-path content nodes are just its first interLen+2 entries, taken directly
    // — no stride multiplication needed like the old dense model required.
    const interLen = intermediateTypes.length
    const goalIndex = interLen + 1 // 0 = entrance, 1..interLen = intermediates, interLen+1 = goal
    if (mainPath.length < goalIndex + 2) continue // need >=1 more node past the goal, for a distinct exit

    const mainNodeCells: Array<[number, number]> = mainPath.slice(0, goalIndex + 1)

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

    // A candidate's branch doesn't need a *pre-existing* maze passage to an unused
    // neighbor — same as the hub-carving fallback below, a brand-new passage can be carved
    // into any plain grid-adjacent unused cell on demand. Restricting candidates to cells
    // that already happen to have a spare tree branch (via `neighbors`, passages only)
    // made them vanishingly rare anywhere near the entrance: the DFS spanning tree's few
    // side-branches are scattered roughly uniformly across the *whole* corridor, and the
    // main-path puzzle stretch is a tiny fraction of a corridor sized to fit every side
    // section too — so almost all of those rare branches fell in the long unused tail past
    // the last puzzle, which is exactly the clustering this is meant to avoid.
    const rawFreeNeighbors = (r: number, c: number): Array<[number, number]> =>
      DIRS2.map(([dr, dc]): [number, number] => [r + dr, c + dc]).filter(
        ([nr, nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && !usedCells.has(`${nr},${nc}`)
      )

    type BranchCandidate = { pathCell: [number, number] }
    const branchCandidates: BranchCandidate[] = []
    // Cells within the actual puzzle-bearing stretch of the main path (before the goal),
    // in path order — kept separate so fork placement can prefer interleaving with main-path
    // puzzles over the unused corridor tail beyond the goal (see bucketing below).
    const mainZoneCandidates: BranchCandidate[] = []
    for (let pi = 0; pi < mainPath.length - 1; pi++) {
      const [pr, pc] = mainPath[pi]
      if (rawFreeNeighbors(pr, pc).length === 0) continue
      const candidate: BranchCandidate = { pathCell: [pr, pc] }
      branchCandidates.push(candidate)
      if (pi < goalIndex) mainZoneCandidates.push(candidate)
    }
    // Prefer branch points that sit next to a genuinely large contiguous empty pocket —
    // this is where the fork ends up, and its later multi-cell footprint (the claiming
    // pass below) floods outward through exactly this kind of pocket. A handful of
    // scattered free cells scores far lower than one solid open patch of the same size.
    // Jittered rather than a hard sort so mazes stay varied, not just "biggest room wins".
    const pocketSize = ([pr, pc]: [number, number], cap: number): number => {
      const visited = new Set<string>([`${pr},${pc}`])
      const queue: Array<[number, number]> = [[pr, pc]]
      let count = 0
      while (queue.length > 0 && count < cap) {
        const [r, c] = queue.shift()!
        for (const [dr, dc] of DIRS) {
          const nr = r + dr,
            nc = c + dc
          const key = `${nr},${nc}`
          if (visited.has(key)) continue
          visited.add(key)
          if (nr < 0 || nr >= N || nc < 0 || nc >= N || usedCells.has(key)) continue
          count++
          if (count >= cap) break
          queue.push([nr, nc])
        }
      }
      return count
    }
    const spaciousness = (pathCell: [number, number]): number => pocketSize(pathCell, 8)
    const scoreCandidates = (list: BranchCandidate[]): BranchCandidate[] =>
      list
        .map(bc => ({ bc, score: spaciousness(bc.pathCell) + rand() * 3 }))
        .sort((a, b) => b.score - a.score)
        .map(({ bc }) => bc)
    const shuffledCandidates = scoreCandidates(branchCandidates)

    // Bundle side sections onto shared branch points ("hubs") instead of every section
    // scattering to its own private fork — a floor with many side sections reads as a
    // few significant crossroads rooms rather than many forgettable single junctions.
    // Group size scales with how many sections there are; low counts stay ungrouped
    // (today's behavior, one fork per section).
    const hubGroupSize = sideSections.length >= 5 ? 3 : sideSections.length >= 2 ? 2 : 1
    const sectionOrder = sideSections.map((_, i) => i).sort(() => rand() - 0.5)
    const hubGroups: number[][] = []
    for (let i = 0; i < sectionOrder.length; i += hubGroupSize) {
      hubGroups.push(sectionOrder.slice(i, i + hubGroupSize))
    }

    // Split the main-path puzzle stretch into one contiguous slice per hub group, in path
    // order, so each group prefers a different stretch of the corridor instead of every
    // group competing for whichever single spot has the biggest open pocket (which is
    // reliably the unused tail past the last main-path puzzle — the exact clustering this
    // is meant to avoid). Slices are handed out in a shuffled order so hub 0 doesn't always
    // land nearest the entrance. Falls back to the full main zone, then the whole corridor
    // (today's behavior), so this can never make an otherwise-placeable section fail.
    const mainZoneSlices: BranchCandidate[][] = hubGroups.map((_, bi) => {
      const start = Math.floor((bi * mainZoneCandidates.length) / hubGroups.length)
      const end = Math.floor(((bi + 1) * mainZoneCandidates.length) / hubGroups.length)
      return scoreCandidates(mainZoneCandidates.slice(start, end))
    })
    const sliceOrder = hubGroups.map((_, i) => i).sort(() => rand() - 0.5)
    const shuffledMainZoneCandidates = scoreCandidates(mainZoneCandidates)

    outer: for (const [groupIdx, group] of hubGroups.entries()) {
      let hubCell: [number, number] | null = null
      const ownSlice = mainZoneSlices[sliceOrder[groupIdx]]

      for (const si of group) {
        const section = sideSections[si]
        const secIntermediate = buildIntermediateTypes(section.pathPuzzles, section.chestEvery ?? 0)
        const needed = secIntermediate.length + 1 + (section.gate ? 1 : 0)
        let placed = false

        // Try the shared hub first (if this group already has one), then this group's own
        // stretch of the puzzle zone, then any other main-zone spot, then the full corridor
        // (including the tail) as a last resort.
        const candidateSources: BranchCandidate[] = hubCell
          ? [{ pathCell: hubCell }, ...ownSlice, ...shuffledMainZoneCandidates, ...shuffledCandidates]
          : [...ownSlice, ...shuffledMainZoneCandidates, ...shuffledCandidates]

        for (const {
          pathCell: [pcr, pcc],
        } of candidateSources) {
          let freeAdj = neighbors(pcr, pcc)
            .filter(([ar, ac]) => !usedCells.has(`${ar},${ac}`))
            .sort(() => rand() - 0.5)

          // No natural passage to branch into — carve a brand-new one into a plain
          // grid-adjacent unused cell instead of giving up on this candidate. A deliberate
          // departure from "perfect maze" (a real cycle) at branch spots: two junctions
          // ending up next to each other is fine, players can explore either order — it
          // just makes that visible as one genuine multi-exit room instead of two separate
          // ones. Not just for repeat-hub cells (see rawFreeNeighbors above for why this
          // needs to work for the first branch off a spot too, not only subsequent ones).
          if (freeAdj.length === 0) {
            const carveCandidates = DIRS2.map(([dr, dc]): [number, number] => [pcr + dr, pcc + dc])
              .filter(
                ([nr, nc]) =>
                  nr >= 0 &&
                  nr < N &&
                  nc >= 0 &&
                  nc < N &&
                  !usedCells.has(`${nr},${nc}`) &&
                  !passages.has(pkey(pcr, pcc, nr, nc))
              )
              .sort(() => rand() - 0.5)
            if (carveCandidates.length > 0) {
              passages.add(pkey(pcr, pcc, carveCandidates[0][0], carveCandidates[0][1]))
              freeAdj = [carveCandidates[0]]
            }
          }
          if (freeAdj.length === 0) continue

          for (const [startR, startC] of freeAdj) {
            usedCells.add(`${startR},${startC}`)
            const rest = extendPath(startR, startC, needed - 1, neighbors, usedCells, rand, (r, c) =>
              pocketSize([r, c], 8)
            )
            if (rest === null) {
              usedCells.delete(`${startR},${startC}`)
              continue
            }
            const cells: Array<[number, number]> = [[startR, startC], ...rest]
            cells.slice(1).forEach(([r, c]) => usedCells.add(`${r},${c}`))
            sectionGroups.push({ sectionIdx: si, cells, intermediate: secIntermediate, attachedAt: [pcr, pcc] })
            if (!hubCell) hubCell = [pcr, pcc]
            placed = true
            break
          }
          if (placed) break
        }

        if (!placed) {
          failed = true
          break outer
        }
      }
    }

    // ── Sub-sections: branch from cells of parent sections ─────────────────
    type SubSectionGroup = {
      subSection: SubSection
      cells: Array<[number, number]>
      intermediate: Array<"puzzle" | "chest">
      parentSectionIdx: number
      subSectionIdx: number
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
        const subNeeded = subIntermediate.length + 1 + (sub.gate ? 1 : 0)
        let placed = false

        for (const [pcr, pcc] of subBranchCandidates) {
          const freeAdj = neighbors(pcr, pcc)
            .filter(([ar, ac]) => !usedCells.has(`${ar},${ac}`))
            .sort(() => rand() - 0.5)
          if (freeAdj.length === 0) continue
          for (const [startR, startC] of freeAdj) {
            usedCells.add(`${startR},${startC}`)
            const rest = extendPath(startR, startC, subNeeded - 1, neighbors, usedCells, rand, (r, c) =>
              pocketSize([r, c], 8)
            )
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
          parentSectionIdx: group.sectionIdx,
          subSectionIdx: idx,
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

    // Build room cell specs: posKey -> room properties (sectionHash injected separately)
    type RoomSpec = Omit<RoomCell, "type" | "dirs" | "state" | "sectionHash" | "hidden">
    const roomSpecs = new Map<string, RoomSpec>()
    const cellSectionHash = new Map<string, string>()
    const hiddenCellPositions = new Set<string>()
    // Which section's authored decoration pool a footprint room should draw from.
    const cellDecorationPool = new Map<string, DecorationKind[] | undefined>()

    const posKey = (r: number, c: number) => `${r},${c}`

    const mainSectionHash = computeMainSectionHash(config)
    for (const [r, c] of mainPath) {
      cellSectionHash.set(posKey(r, c), mainSectionHash)
      cellDecorationPool.set(posKey(r, c), config.decorations)
    }
    for (const group of sectionGroups) {
      const sHash = computeSideSectionHash(sideSections[group.sectionIdx], group.sectionIdx)
      const isHidden = hiddenSectionIdxs.has(group.sectionIdx)
      const pool = sideSections[group.sectionIdx].decorations
      for (const [r, c] of group.cells) {
        cellSectionHash.set(posKey(r, c), sHash)
        cellDecorationPool.set(posKey(r, c), pool)
        if (isHidden) hiddenCellPositions.add(posKey(r, c))
      }
    }
    for (const { subSection, cells, parentSectionIdx, subSectionIdx } of subSectionGroups) {
      const sHash = computeSideSectionHash(subSection, subSectionIdx, parentSectionIdx)
      for (const [r, c] of cells) {
        cellSectionHash.set(posKey(r, c), sHash)
        cellDecorationPool.set(posKey(r, c), subSection.decorations)
      }
    }

    // Collect branch junction cells (become fork nodes)
    const forkPositions = new Set(sectionGroups.map(g => posKey(g.attachedAt[0], g.attachedAt[1])))

    // Main path nodes
    const lastPuzzleIntermediateIdx = config.lastMainPuzzleFamily ? intermediateTypes.lastIndexOf("puzzle") : -1
    let mainChestIdx = 0
    for (let mi = 0; mi < mainNodeCells.length; mi++) {
      const [r, c] = mainNodeCells[mi]
      if (mi === 0) {
        if (config.entrance) {
          const stairId = typeof config.entrance === "object" ? config.entrance.stairId : `${siteId}:entrance`
          roomSpecs.set(posKey(r, c), { roomType: "stairhead", stairId })
        } else {
          roomSpecs.set(posKey(r, c), { roomType: "entrance" })
        }
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
    if (config.exitOrStaircase === "exit") {
      roomSpecs.set(posKey(exR, exC), { roomType: "exit" })
    } else {
      const stairId = typeof config.exitOrStaircase === "object" ? config.exitOrStaircase.stairId : `${siteId}:main`
      roomSpecs.set(posKey(exR, exC), { roomType: "stairhead", stairId })
    }

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

      // Intermediate nodes within section (puzzles/traps + chests) — consecutive nodes,
      // the connector cell between each pair lives at a separate grid position.
      for (let pi = 0; pi < intermediate.length; pi++) {
        const [r, c] = cells[contentStart + pi]
        if (intermediate[pi] === "chest") {
          roomSpecs.set(posKey(r, c), { roomType: "treasure", reward: { type: "hieroglyphs" } })
        } else if (section.trapped) {
          roomSpecs.set(posKey(r, c), { roomType: "trap" })
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
      } else if (section.end === "staircase" || typeof section.end === "object") {
        const stairId = typeof section.end === "object" ? section.end.stairId : `${siteId}:side${sectionIdx}`
        roomSpecs.set(posKey(er, ec), { roomType: "stairhead", stairId })
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
        } else if (subSection.trapped) {
          roomSpecs.set(posKey(r, c), { roomType: "trap" })
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
      } else if (subSection.end === "staircase" || typeof subSection.end === "object") {
        const stairId = typeof subSection.end === "object" ? subSection.end.stairId : `${siteId}:subsection`
        roomSpecs.set(posKey(er, ec), { roomType: "stairhead", stairId })
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
      // Compute dirs from passages — nodes are two cells apart (see NODE_STEP above)
      const dirs = new Set<Direction>()
      for (const [dr, dc, d] of CONNECTOR_DIRS) {
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
      const sectionHash = cellSectionHash.get(cellKey) ?? mainSectionHash
      const hidden = hiddenCellPositions.has(cellKey) || undefined
      if (spec) {
        const roomCell: RoomCell = {
          type: "room",
          roomType: spec.roomType,
          dirs,
          state: "fogged",
          sectionHash,
          ...(hidden ? { hidden } : {}),
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
          sectionHash,
          ...(hidden ? { hidden } : {}),
        }
        cells2D[r][c] = corridorCell
      }
    }

    // Materialize the connector cell for every real edge between two used nodes — this
    // is the plain 1-wide corridor cell physically between them (see NODE_STEP above).
    // Each edge is only processed once (from its lower-keyed endpoint) since it's
    // symmetric. A connector inherits `hidden` only when both endpoints do, so a hidden
    // section's own internal corridors stay hidden together with it, while the single
    // corridor linking a hidden section to its (visible) attachment point stays visible
    // — same as a normal doorway would.
    for (const cellKey of usedCells) {
      const [r, c] = cellKey.split(",").map(Number)
      for (const [dr, dc, d] of CONNECTOR_DIRS) {
        const nr = r + dr,
          nc = c + dc
        const neighborKey = `${nr},${nc}`
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue
        if (!passages.has(pkey(r, c, nr, nc)) || !usedCells.has(neighborKey)) continue
        if (r * N + c > nr * N + nc) continue // process each edge once
        const mr = (r + nr) / 2,
          mc = (c + nc) / 2
        const hidden = hiddenCellPositions.has(cellKey) && hiddenCellPositions.has(neighborKey) ? true : undefined
        const sectionHash = cellSectionHash.get(cellKey) ?? mainSectionHash
        cells2D[mr][mc] = {
          type: "corridor",
          dirs: new Set([d, OPPOSITE[d]]),
          state: "fogged",
          sectionHash,
          ...(hidden ? { hidden } : {}),
        }
      }
    }

    // Set entrance cell state to "reachable"
    const [entRr, entCc] = [entR, entC]
    const entranceCell = cells2D[entRr][entCc]
    if (entranceCell.type === "room") {
      cells2D[entRr][entCc] = { ...entranceCell, state: "reachable" }
    }

    // Decorations: fork rooms and leaf-degree endpoint rooms (dead ends — treasure,
    // stairhead, exit) may show a decoration drawn from their section's authored pool.
    // Purely cosmetic, placed directly on the room's own cell — the renderer draws it
    // offset into whichever side has open void next to it (see SiteMapView.tsx).
    const endpointPositions = new Set<string>()
    for (const [pk, spec] of roomSpecs) {
      if (spec.roomType !== "treasure" && spec.roomType !== "stairhead" && spec.roomType !== "exit") continue
      const [r, c] = pk.split(",").map(Number)
      const cell = cells2D[r][c]
      if (cell.type === "room" && cell.dirs.size === 1) endpointPositions.add(pk)
    }
    const decorationPoolIdx = new Map<DecorationKind[], number>()
    const nextDecoration = (pool?: DecorationKind[]): DecorationKind | undefined => {
      if (!pool) return undefined
      const idx = decorationPoolIdx.get(pool) ?? 0
      decorationPoolIdx.set(pool, idx + 1)
      return pool[idx]
    }
    for (const pk of new Set([...forkPositions, ...endpointPositions])) {
      const decoration = nextDecoration(cellDecorationPool.get(pk))
      if (!decoration) continue
      const [r, c] = pk.split(",").map(Number)
      const owner = cells2D[r][c]
      if (owner.type === "room") cells2D[r][c] = { ...owner, decoration }
    }

    const staircases: Record<string, readonly [number, number]> = {}
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = cells2D[r][c]
        if (cell.type === "room" && cell.roomType === "stairhead" && cell.stairId) {
          staircases[cell.stairId] = [r, c]
        }
      }
    }

    const grid: FloorGrid = {
      cells: cells2D,
      rows: N,
      cols: N,
      entrancePos: [entR, entC],
      exitPos: [exR, exC],
      siteId,
      staircases,
    }

    const v = validateSite(grid)
    if (v.valid) return { success: true, grid }
  }

  return {
    success: false,
    reasons: [{ type: "layoutNotFound" }],
  }
}
