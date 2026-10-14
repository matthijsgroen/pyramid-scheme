import { oneWayReach } from "../carveConstants"
import { shuffle } from "../random"
import { appetiteAccepts } from "../regions"
import type { ContentKind } from "../regions"
import type { KeyColor, SideSection, SubSection } from "../siteTypes"
import { absorbedCell, contentNow, gateIndices } from "./derive"
import { CONNECTOR_DIRS, DIRS, DIRS2, NODE_STEP, OPPOSITE, makePkey } from "./grid"
import { chainRooms, nid, paddedChainLength } from "./ids"
import { childSectionsOf, doorsShutting } from "./sections"
import type { Cell, Chain, DropSeam, OneWayEdge, Pass, SectionGroup } from "./state"

// Find a chain of `count` cells starting from (startR, startC),
// extending through available maze neighbors not in usedCells. The final cell in the
// chain becomes a section/sub-section endpoint, which later wants a multi-cell footprint
// (see the claiming pass in render) — so when a `scorer` is given, the last step
// is biased toward a neighbor with more surrounding open space, same idea as fork
// placement. Every other step stays a plain random shuffle.
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
        : shuffle(free, rand)
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

/**
 * EVERY AUTHORED SIDE PATH, HUNG OFF THE MAIN WALK, and its sub-sections hung off it: which cells each took,
 * the passages carved to reach them, and the drops a seam carries. Branch points are scored by how open the
 * ground around them is, jittered so mazes stay varied; the sections are bundled onto shared hubs.
 */
export const hangBranches: Pass<
  | "maze"
  | "regions"
  | "content"
  | "junctions"
  | "seamGates"
  | "runGates"
  | "mainBarrierDoors"
  | "mainControls"
  | "lay"
  | "rand"
  | "rung",
  "branches"
> = (prep, state) => {
  const { siteId } = prep.input
  const { sideSections, appetiteOfRegion, branchSections, hubGroupSize, subSectionsOf } = prep.sections
  const { forkIns, forkGroups, junctionGroups } = prep.forks
  const { leverAtPositional } = prep.mechanisms
  const { rand, rung } = state
  const { n: N, mainPath, passages } = state.maze
  const { stepRegion, seams: regionSeamIndices } = state.regions
  const { goal: goalIndex } = state.content
  const { steps: forkJunctionIdx, order: junctionIdxOf } = state.junctions
  const laid = state.lay?.laid
  const pkey = makePkey(N)
  const placedContent = contentNow(state).placed
  const takenByControl = new Set(state.mainControls.at.values())
  const gated = gateIndices(state)
  const absorbed = absorbedCell(state.lay)

  // Passages an attach carves where a candidate had no natural one, beside the maze's own.
  const carved = new Set<string>()
  const hasPassage = (key: string) => passages.has(key) || carved.has(key)
  const neighbors = (r: number, c: number): Array<[number, number]> =>
    DIRS2.map(([dr, dc]) => [r + dr, c + dc] as [number, number]).filter(
      ([nr, nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && hasPassage(pkey(r, c, nr, nc))
    )

  // Full mainPath as corridor so sections can branch from anywhere along it
  const usedCells = new Set<string>(mainPath.map(([r, c]) => `${r},${c}`))
  // Cells a drop seam holds clear while the chains are still being placed, so nothing else is carved
  // through them; given back once the chains are down, as the seam runs are held by the drops from then on.
  const heldForSeams = new Set<string>()
  // The stretches a lock laid off the route are ground already, and a drop's run is held clear of
  // anything a branch could take until the branches are down.
  for (const chain of laid?.chains ?? []) for (const [r, c] of chain.cells) usedCells.add(`${r},${c}`)
  for (const cellKey of laid?.held ?? []) {
    usedCells.add(cellKey)
    heldForSeams.add(cellKey)
  }
  // A laid drop is a seam the lock already cut: its run, launch and landing stand between the two nodes laid for it.
  const seamDrops: OneWayEdge[] = (laid?.drops ?? []).map(drop => ({
    from: drop.from,
    to: drop.to,
    dir: drop.dir,
    launch: drop.launchCell,
    run: drop.run,
    landing: drop.landingCell,
    obstacleId: drop.id,
    realisation: prep.realisation.oneWay!,
  }))

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

  const branchCandidates: Array<[number, number]> = []
  // Cells within the actual puzzle-bearing stretch of the main path (before the goal),
  // in path order — kept separate so fork placement can prefer interleaving with main-path
  // puzzles over the unused corridor tail beyond the goal (see bucketing below).
  //
  // A SEAM'S OWN CELL IS EXCLUDED HERE TOO, alongside the goal's — not because a chain could not
  // grow from a gate room (a junction that already holds a main-path room keeps that room, same as a
  // puzzle or the goal), but because the seams are what shift CONTENT forward past them
  // (`placeMainContent`), moving the goal outward by the width of however many seams fell in content's
  // way — so the same set has to be excluded here too, or the two would disagree about which cells this
  // stretch actually holds.
  //
  // The seams, NOT the gates — READ OFF `regionLayout` (core), NEVER OFF `obstacles` (the mod's). This
  // is BY CONSTRUCTION, not by compensation: `regionLayout` is never dropped by `dropUnownedAuthoring`,
  // so `stepRegion` and therefore the seams are the identical set whether or not the topology mod is
  // even in the build. Scoring draws one `rand()` per candidate below (`scoreCandidates`), and
  // `mainZoneCandidates` is later sliced by contiguous range (`mainZoneSlices`) — so it is not enough
  // for the two builds to exclude the same COUNT of cells, as the gates alone did (mod on excludes
  // exactly the gated seams; mod off excludes none, but the goal shrunk to match — same count leaving
  // the loop, different physical cells inside it, which is exactly what let seed-dependent `rand()`
  // draws diverge after the sweep in `toggleOff.spec.ts` measured 24 of 50 seeds disagreeing on a
  // two-obstacle floor). Keying off `regionLayout` instead means the mod's OWN OBSTACLE LIST never
  // reaches this loop at all: there is no count to keep equal, because there is nothing left for the
  // mod to perturb.
  const mainZoneCandidates: Array<[number, number]> = []
  for (let pi = 0; pi < mainPath.length - 1; pi++) {
    const [pr, pc] = mainPath[pi]
    if (forkJunctionIdx.has(pi) || laid?.reserved.has(pi)) continue
    if (rawFreeNeighbors(pr, pc).length === 0) continue
    branchCandidates.push([pr, pc])
    if (pi < goalIndex && !regionSeamIndices.has(pi)) mainZoneCandidates.push([pr, pc])
  }
  // Side paths hang off the ground a lock laid as well as off the route, never off a door.
  for (const chain of laid?.chains ?? [])
    for (const [pr, pc] of chain.cells)
      if (
        !laid!.doors.has(`${pr},${pc}`) &&
        !laid!.thresholds.has(`${pr},${pc}`) &&
        rawFreeNeighbors(pr, pc).length > 0
      )
        branchCandidates.push([pr, pc])
  // Prefer branch points that sit next to a genuinely large contiguous empty pocket —
  // this is where the fork ends up, and its later multi-cell footprint (the claiming
  // pass in render) floods outward through exactly this kind of pocket. A handful of
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
  const scoreCandidates = (list: Array<[number, number]>): Array<[number, number]> =>
    list
      .map(bc => ({ bc, score: spaciousness(bc) + rand() * 3 }))
      .sort((a, b) => b.score - a.score)
      .map(({ bc }) => bc)
  const shuffledCandidates = scoreCandidates(branchCandidates)

  /**
   * Hangs a chain of `needed` cells off the first of `candidates` that can take one — a free maze
   * neighbour to start from, then a walk through whatever is still empty — and claims what it takes.
   * A candidate whose walk runs out of room gives back the cell it started on and the next is tried.
   *
   * `mayCarve` allows a brand-new passage into a plain grid-adjacent unused cell where a candidate
   * has no natural one to branch into: a deliberate departure from "perfect maze" (a real cycle) at
   * branch spots. Two junctions ending up next to each other is fine — players can explore either
   * order, and it reads as one genuine multi-exit room instead of two separate ones.
   */
  const attachChain = (
    candidates: Array<[number, number]>,
    needed: number,
    mayCarve: boolean
  ): { cells: Array<[number, number]>; attachedAt: [number, number] } | null => {
    for (const [pcr, pcc] of candidates) {
      let freeAdj = shuffle(
        neighbors(pcr, pcc).filter(([ar, ac]) => !usedCells.has(`${ar},${ac}`)),
        rand
      )
      if (freeAdj.length === 0 && mayCarve) {
        const carveCandidates = shuffle(
          DIRS2.map(([dr, dc]): [number, number] => [pcr + dr, pcc + dc]).filter(
            ([nr, nc]) =>
              nr >= 0 &&
              nr < N &&
              nc >= 0 &&
              nc < N &&
              !usedCells.has(`${nr},${nc}`) &&
              !hasPassage(pkey(pcr, pcc, nr, nc))
          ),
          rand
        )
        if (carveCandidates.length > 0) {
          carved.add(pkey(pcr, pcc, carveCandidates[0][0], carveCandidates[0][1]))
          freeAdj = [carveCandidates[0]]
        }
      }
      if (freeAdj.length === 0) continue
      for (const [startR, startC] of freeAdj) {
        usedCells.add(`${startR},${startC}`)
        const rest = extendPath(startR, startC, needed - 1, neighbors, usedCells, rand, (r, c) => pocketSize([r, c], 8))
        if (rest === null) {
          usedCells.delete(`${startR},${startC}`)
          continue
        }
        const cells: Array<[number, number]> = [[startR, startC], ...rest]
        cells.slice(1).forEach(([r, c]) => usedCells.add(`${r},${c}`))
        return { cells, attachedAt: [pcr, pcc] }
      }
    }
    return null
  }

  /**
   * Hangs a chain off a node of its mouth's region by a DROP: its first node stands `oneWayReach`
   * steps along a straight line from the mouth's, every cell between them uncarved and held for the
   * run. No passage joins the two, so the only way between them is the drop, and it falls the way the
   * author wrote it. Nothing is claimed unless the whole run and the chain both fit.
   */
  const attachByDrop = (
    seam: DropSeam,
    needed: number
  ): { cells: Array<[number, number]>; attachedAt: [number, number] } | null => {
    const mouthNodes = mainPath.filter(
      (_, pi) =>
        pi < mainPath.length - 1 &&
        stepRegion[pi] === seam.mouth &&
        !regionSeamIndices.has(pi) &&
        !forkJunctionIdx.has(pi)
    )
    for (const [ar, ac] of scoreCandidates(mouthNodes)) {
      for (const [dr, dc, d] of shuffle(CONNECTOR_DIRS, rand)) {
        const ur = dr / NODE_STEP,
          uc = dc / NODE_STEP
        const reach = oneWayReach(d)
        const [fr, fc] = [ar + ur * reach, ac + uc * reach]
        if (fr < 0 || fr >= N || fc < 0 || fc >= N) continue
        const between = Array.from({ length: reach - 1 }, (_, k) => `${ar + ur * (k + 1)},${ac + uc * (k + 1)}`)
        const held = [...between, `${fr},${fc}`]
        if (held.some(cellKey => usedCells.has(cellKey))) continue
        for (const cellKey of held) usedCells.add(cellKey)
        const rest = extendPath(fr, fc, needed - 1, neighbors, usedCells, rand, (r, c) => pocketSize([r, c], 8))
        if (rest === null) {
          for (const cellKey of held) usedCells.delete(cellKey)
          continue
        }
        rest.forEach(([r, c]) => usedCells.add(`${r},${c}`))
        for (const cellKey of between) heldForSeams.add(cellKey)
        const mouthKey = `${ar},${ac}`
        const chainFirst = `${fr},${fc}`
        // The run is listed from the end it falls FROM, so a drop out of the chain reads back to front.
        const along = seam.mouthFirst ? between : [...between].reverse()
        seamDrops.push({
          from: seam.mouthFirst ? mouthKey : chainFirst,
          to: seam.mouthFirst ? chainFirst : mouthKey,
          dir: seam.mouthFirst ? d : OPPOSITE[d],
          launch: along[0],
          run: along.slice(1, -1),
          landing: along[along.length - 1],
          obstacleId: seam.obstacleId,
          realisation: seam.realisation,
        })
        return { cells: [[fr, fc], ...rest], attachedAt: [ar, ac] }
      }
    }
    return null
  }

  const sectionKinds = (section: SideSection | SubSection): ContentKind[] => [
    ...(section.pathPuzzles > 0 || childSectionsOf(section as SubSection).some(sub => sub.pathPuzzles > 0)
      ? (["puzzle"] as const)
      : []),
    ...(section.end === "staircase" ? [] : (["reward"] as const)),
  ]
  // A route node nothing stands on: no content, control, door, seam, junction, drop end or absorbed room.
  const dropEnds = new Set((laid?.drops ?? []).flatMap(drop => [drop.from, drop.to]))
  const bareRouteStep = (mi: number) =>
    mi > 0 &&
    mi < mainPath.length - 1 &&
    !placedContent.includes(mi) &&
    !takenByControl.has(mi) &&
    !gated.has(mi) &&
    !state.mainBarrierDoors.has(mi) &&
    !regionSeamIndices.has(mi) &&
    !forkJunctionIdx.has(mi) &&
    !laid?.reserved.has(mi) &&
    !absorbed.has(`${mainPath[mi][0]},${mainPath[mi][1]}`) &&
    !dropEnds.has(`${mainPath[mi][0]},${mainPath[mi][1]}`)
  // Bundle side sections onto shared branch points ("hubs"): a `{ in }` fork's sections first, then each
  // junction a laid floor's `forks` holds, then the rest in a shuffled order, `hubGroupSize` to a hub.
  const sectionOrder = shuffle([...branchSections], rand)
  const forkedSections = new Set([...forkGroups, ...junctionGroups].flat())
  const looseSections = sectionOrder.filter(si => !forkedSections.has(si))
  const hubGroups: number[][] = [...forkGroups, ...junctionGroups].map(group => [...group])
  for (let i = 0; i < looseSections.length; i += hubGroupSize) {
    hubGroups.push(looseSections.slice(i, i + hubGroupSize))
  }

  // Split the main-path puzzle stretch into one contiguous slice per hub group, in path
  // order, so each group prefers a different stretch of the corridor instead of every
  // group competing for whichever single spot has the biggest open pocket (which is
  // reliably the unused tail past the last main-path puzzle — the exact clustering this
  // is meant to avoid). Slices are handed out in a shuffled order so hub 0 doesn't always
  // land nearest the entrance. Falls back to the full main zone, then the whole corridor,
  // so this can never make an otherwise-placeable section fail.
  const mainZoneSlices: Array<Array<[number, number]>> = hubGroups.map((_, bi) => {
    const start = Math.floor((bi * mainZoneCandidates.length) / hubGroups.length)
    const end = Math.floor(((bi + 1) * mainZoneCandidates.length) / hubGroups.length)
    return scoreCandidates(mainZoneCandidates.slice(start, end))
  })
  const sliceOrder = shuffle(
    hubGroups.map((_, i) => i),
    rand
  )
  const shuffledMainZoneCandidates = scoreCandidates(mainZoneCandidates)

  let forkShort: number | undefined
  outer: for (const [groupIdx, group] of hubGroups.entries()) {
    let hubCell: [number, number] | null = null
    const ownSlice = mainZoneSlices[sliceOrder[groupIdx]]
    const junctionCell = groupIdx < forkIns.length ? mainPath[junctionIdxOf[groupIdx]] : undefined
    const holdsJunction = groupIdx >= forkIns.length && groupIdx < forkIns.length + junctionGroups.length

    for (const si of group) {
      // Try the shared hub first (if this group already has one), then this group's own
      // stretch of the puzzle zone, then any other main-zone spot, then the full corridor
      // (including the tail) as a last resort. Every one of them may be carved into: see
      // rawFreeNeighbors above for why that has to work for the first branch off a spot too,
      // not only subsequent ones.
      const everywhere: Array<[number, number]> = junctionCell
        ? [junctionCell]
        : holdsJunction
          ? hubCell
            ? [hubCell]
            : scoreCandidates(mainPath.filter((_, mi) => bareRouteStep(mi)))
          : hubCell
            ? [hubCell, ...ownSlice, ...shuffledMainZoneCandidates, ...shuffledCandidates]
            : [...ownSlice, ...shuffledMainZoneCandidates, ...shuffledCandidates]
      // On a laid floor a path hangs only where its region takes everything the path holds.
      const candidateSources = laid
        ? everywhere.filter(([cr, cc]) =>
            sectionKinds(sideSections[si]).every(kind =>
              appetiteAccepts(appetiteOfRegion.get(laid.label.get(`${cr},${cc}`) ?? "") ?? "free", kind)
            )
          )
        : everywhere
      const needed = paddedChainLength(rung.chainPacking, chainRooms(leverAtPositional, sideSections[si], `s${si}`))
      const seam = prep.layout.dropSeams.get(si)
      const attached = seam ? attachByDrop(seam, needed) : attachChain(candidateSources, needed, true)

      if (attached === null) {
        failed = true
        if (junctionCell) forkShort = groupIdx
        break outer
      }
      sectionGroups.push({ sectionIdx: si, ...attached })
      if (!hubCell && !seam) hubCell = attached.attachedAt
    }
  }

  // ── Sub-sections: branch from cells of parent sections ─────────────────
  const subChains: Chain[] = []

  for (const group of sectionGroups) {
    if (failed) break
    const parentSection = sideSections[group.sectionIdx]
    const subs = subSectionsOf.get(group.sectionIdx)
    if (!subs) continue
    const parentDoors = doorsShutting(parentSection, `s${group.sectionIdx}`, [])
    const { sections: subSects, gatedIdxs: subGatedIdxs, ungatedIdxs: subUngatedIdxs } = subs

    // Branch candidates: parent section cells (excluding end cell). In recovery a cell whose
    // only opening has to be carved (see the fallback below) counts too — pre-filtering it out
    // here would put it out of that fallback's reach.
    const hasCarveableNeighbor = (pr: number, pc: number) =>
      DIRS2.some(
        ([dr, dc]) =>
          pr + dr >= 0 && pr + dr < N && pc + dc >= 0 && pc + dc < N && !usedCells.has(`${pr + dr},${pc + dc}`)
      )
    const subBranchCandidates = shuffle(
      group.cells
        .slice(0, -1)
        .filter(
          ([pr, pc]) =>
            neighbors(pr, pc).some(([ar, ac]) => !usedCells.has(`${ar},${ac}`)) ||
            (rung.recovery && hasCarveableNeighbor(pr, pc))
        ),
      rand
    )

    const placedSubs: Array<{ idx: number; cells: Cell[]; attachedAt: Cell }> = []

    for (let si = 0; si < subSects.length; si++) {
      const subNeeded = paddedChainLength(
        rung.chainPacking,
        chainRooms(leverAtPositional, subSects[si], `s${group.sectionIdx}.${si}`)
      )
      // Carving out of the parent chain is kept to recovery, where the frozen attempts are past
      // and a layout that fits at all is worth a cycle. It is what unstuck that phase: by the time
      // sub-sections are placed, earlier chains have boxed the parent in, and one needing a single
      // free cell would fail the whole attempt with plenty of grid still empty one wall away.
      const attached = attachChain(subBranchCandidates, subNeeded, rung.recovery)
      if (attached === null) {
        failed = true
        break
      }
      placedSubs.push({ idx: si, ...attached })
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
      const keyId = nid(siteId, er, ec)
      if (!subKeyHostColorsMap.has(hostIdx)) subKeyHostColorsMap.set(hostIdx, [])
      subKeyHostColorsMap.get(hostIdx)!.push(color)
      for (const gatedIdx of subGatedByColor.get(color)!) subKeyNodeIdMap.set(gatedIdx, keyId)
    }
    for (const { idx, cells, attachedAt } of placedSubs) {
      const sub = subSects[idx]
      const positional = `s${group.sectionIdx}.${idx}`
      // An authored keyId is used verbatim; only an unauthored gate takes the id the
      // key-host distribution above assigned it.
      const authoredSubKeyId = sub.gate?.type === "floor-key" ? sub.gate.keyId : undefined
      subChains.push({
        section: sub,
        cells,
        attachedAt,
        positional,
        idx,
        parentIdx: group.sectionIdx,
        doors: doorsShutting(sub, positional, parentDoors),
        hidden: Boolean(sub.hidden),
        keyNodeId: authoredSubKeyId ?? subKeyNodeIdMap.get(idx),
        keyHostColors: subKeyHostColorsMap.get(idx) ?? [],
      })
    }
  }

  if (failed) return { retry: forkShort === undefined ? [] : [{ type: "forkSeamsNotLaid", fork: forkIns[forkShort] }] }
  for (const cellKey of heldForSeams) usedCells.delete(cellKey)
  state.branches = { used: usedCells, groups: sectionGroups, subChains, seamDrops, carved }
}
