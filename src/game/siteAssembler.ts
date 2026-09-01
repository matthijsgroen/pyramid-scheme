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
  Difficulty,
} from "./siteTypes"
import type { ResolveBoardIndex } from "./seeds/boardIndex"
import { validateSite } from "./siteValidator"

// Resolves an authored `encounter` (exact family id, or tag(s)) to a concrete family id
// plus that family's own tags. Injected by the caller so this domain module never needs
// to know which families/mods actually exist — see resolveEncounter in
// src/app/families/familyRegistry.ts for the real (registry-backed) implementation.
export type EncounterResolution = { familyId: string; tags: string[] }
export type ResolveEncounter = (encounter: string | string[] | undefined, defaultTag: string) => EncounterResolution

// Resolves a main-path puzzle room's own completion precondition (e.g. a tableau's
// hieroglyph requirement) to opaque key ids — same idea as ResolveEncounter, injected so
// this module never needs to know which family owns which requirement, only that one might
// exist. Real implementation dispatches by familyId to whichever family's own FamilyMeta
// declares one (see src/mods/allFamilyMeta.ts); most families provide none.
export type ResolveKeyRequirements = (
  familyId: string,
  ctx: { journeyId: string; floorIndex: number; pathIndex: number; encounterArgs?: unknown }
) => string[] | undefined
const defaultResolveKeyRequirements: ResolveKeyRequirements = () => undefined

const DEFAULT_TAG_FAMILIES: Record<string, string> = {
  trap: "arithmetic-reflex",
  puzzle: "sumplete",
  "tomb-puzzle": "tableau",
}
const DEFAULT_FAMILY_TAGS: Record<string, string[]> = {
  "arithmetic-reflex": ["trap"],
  sumplete: ["puzzle"],
  tableau: ["tomb-puzzle"],
  crocodile: ["tomb-puzzle"],
  "treasure-chest": ["treasure"],
  "fez-shop": ["shop"],
  "key-gate": ["gate"],
}
// Fallback for callers that don't inject the real family registry (tests, stories) —
// production always passes familyRegistry.ts's resolveEncounter.
const defaultResolveEncounter: ResolveEncounter = (encounter, defaultTag) => {
  const value = (Array.isArray(encounter) ? encounter[0] : encounter) ?? defaultTag
  const familyId = DEFAULT_TAG_FAMILIES[value] ?? value
  return { familyId, tags: DEFAULT_FAMILY_TAGS[familyId] ?? [] }
}

// A section hash is a run's handle on a stretch of floor: saved explored cells and found hidden
// corridors are filed under it, and a cell whose hash no longer matches is dropped as stale. So it
// must cover everything the LAYOUT depends on, and nothing else — a hash that moves for a
// non-structural reason throws away progress on a floor that did not change.
//
// Stable across: loot changes, key reassignment, decorations, themes, and re-authoring WHICH
// encounter a room serves. Changes on: puzzle count, difficulty, exit type, gate presence, hidden
// flag, whether the section is isolated from leftover maze edges, and the floor's own carve knobs.
//
// Both hashes carry the floor's carve knobs (`packing`, `corridorStraightness`), because those
// re-carve the WHOLE floor — every side section along with the main path. Without them a floor could
// be re-shaped end to end while every hash held still, and a run would restore its explored cells
// onto a maze that no longer exists. See docs/game-design/world-spec-stability.md.
//
// `isolated` is why an encounter is not in here directly. The assembler reads a section's encounter
// for exactly one layout decision — a trap gets cut off from stray tree edges, the same treatment a
// gate gets — so the hash records that decision rather than the encounter behind it. Swapping a
// section from one puzzle family to another is then invisible to a save, which is the point: a
// pyramid's encounters are authored per pyramid and re-authored often.
// The hash as it was computed before `isolated` replaced `sealed`/`encounter` above. Assembled onto
// every cell as `legacySectionHash` purely so a save written under the old scheme keeps matching its
// own cells: without it, every section in the world would rehash at once, and since a looted room is
// remembered only by its explored-cell entry, every chest would come back unlooted. Delete both of
// these once no live save predates the change.
const computeLegacyMainSectionHash = (config: FloorConfig): string =>
  String(
    hashString(
      JSON.stringify({
        pathPuzzles: config.pathPuzzles,
        difficulty: config.difficulty,
        exitOrStaircase: config.exitOrStaircase,
      })
    )
  )

const computeLegacySideSectionHash = (section: SideSection | SubSection, idx: number, parentIdx?: number): string =>
  String(
    hashString(
      JSON.stringify({
        idx,
        parentIdx,
        pathPuzzles: section.pathPuzzles,
        difficulty: section.difficulty,
        end: section.end,
        hidden: section.hidden,
        sealed: section.sealed,
        encounter: section.encounter,
        gateType: section.gate?.type,
      })
    )
  )

// The floor-wide inputs to the carve itself: change either and every cell on the floor moves.
const carveShape = (config: FloorConfig) => ({
  packing: config.packing,
  corridorStraightness: config.corridorStraightness,
})

const computeMainSectionHash = (config: FloorConfig, isolated: boolean): string =>
  String(
    hashString(
      JSON.stringify({
        pathPuzzles: config.pathPuzzles,
        difficulty: config.difficulty,
        exitOrStaircase: config.exitOrStaircase,
        isolated,
        ...carveShape(config),
      })
    )
  )

const computeSideSectionHash = (
  section: SideSection | SubSection,
  idx: number,
  isolated: boolean,
  floor: FloorConfig,
  parentIdx?: number
): string =>
  String(
    hashString(
      JSON.stringify({
        idx,
        parentIdx,
        ...carveShape(floor),
        pathPuzzles: section.pathPuzzles,
        difficulty: section.difficulty,
        end: section.end,
        hidden: section.hidden,
        isolated,
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
// Overridable per floor via FloorConfig.corridorStraightness (see assembleFloor).
const DEFAULT_STRAIGHT_BIAS = 0.65

// Multiplier on the grid's roaming room beyond its bare content minimum (see the N-growth
// loop in assembleFloor). 1 = today's default footprint; <1 packs the floor (and its
// winding corridors) tighter, >1 gives it more breathing room. Overridable per floor via
// FloorConfig.packing.
const DEFAULT_PACKING = 1

// Maze carving is a per-attempt gamble (each attempt reshuffles branch points and section
// order), so assembleFloor retries. The first RECOVERY_ATTEMPT attempts run at the original
// sizing; the rest re-size the grid to what the carve actually needs and wind the side chains
// down. Measured over every authored floor × 30 seeds each: all of them assemble, the slowest
// at attempt 37, so the tail of the budget is headroom rather than something floors rely on.
// See the retry loop in assembleFloor for why the first stretch is deliberately frozen.
const RECOVERY_ATTEMPT = 30
const ASSEMBLY_ATTEMPTS = 60

// Generate a perfect DFS maze on an N×N grid starting from (entR, entC).
// Returns adjacency function, BFS path from entrance to the chosen main-path endpoint, and
// passages set. `targetDistance` picks the main path's length: the *true* farthest node in
// the spanning tree is always the maze's diameter, which is a large fraction of the whole
// grid almost regardless of grid size — using it unconditionally means the main path is
// always "as long as physically possible," never short relative to how little content it
// carries. Instead this picks the closest node to `targetDistance` hops from the entrance
// (falling back to the true farthest node if the grid is too small to reach it), so path
// length is something an author can actually target via FloorConfig.packing rather than an
// emergent side effect of grid size.
const buildMaze = (
  N: number,
  entR: number,
  entC: number,
  rand: () => number,
  straightBias: number,
  targetDistance: number
) => {
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
        straightAhead && rand() < straightBias ? straightAhead : unvisited[Math.floor(rand() * unvisited.length)]
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

// Spreads `count` content items evenly across [startIdx, totalLen-2], reserving the final
// index for the chain's own terminal room (the main path's goal+exit; a section's end room)
// and everything before `startIdx` for whatever already occupies the head (the entrance;
// a section's gate room, if any). Same technique for the main path and every section/
// sub-section chain, so a padded (packing-scaled) chain gets its content interleaved with
// the extra room instead of packed at the front with all the padding trailing behind it.
const spreadContentIndices = (count: number, startIdx: number, totalLen: number): number[] => {
  const indices: number[] = []
  if (count === 0) return indices
  const used = new Set<number>()
  const lastIdx = totalLen - 2 // reserve the final index for the terminal room
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1)
    let idx = Math.round(startIdx + t * (lastIdx - startIdx))
    idx = Math.max(startIdx, Math.min(lastIdx, idx))
    while (used.has(idx) && idx < lastIdx) idx++
    while (used.has(idx) && idx > startIdx) idx--
    used.add(idx)
    indices.push(idx)
  }
  indices.sort((a, b) => a - b)
  return indices
}

export type AssembleFloorKeyRequirements = {
  resolveKeyRequirements?: ResolveKeyRequirements
  floorRef?: { journeyId: string; floorIndex: number }
  /** Which seed-list entry each room draws, by its authored address — injected for the same reason
   * resolveEncounter is: this module knows a floor's chains, never which world they belong to.
   * Absent (stories, specs, the builder) leaves rooms unstamped and they index by their own hash. */
  resolveBoardIndex?: ResolveBoardIndex
}

export const assembleFloor = (
  siteId: string,
  config: FloorConfig,
  seed: number,
  resolveEncounter: ResolveEncounter = defaultResolveEncounter,
  keyRequirements: AssembleFloorKeyRequirements = {}
): AssemblerResult => {
  const {
    resolveKeyRequirements = defaultResolveKeyRequirements,
    floorRef = { journeyId: siteId, floorIndex: 0 },
    resolveBoardIndex,
  } = keyRequirements
  const treasureChest = resolveEncounter("treasure-chest", "treasure-chest")
  const fezShop = resolveEncounter("fez-shop", "fez-shop")
  const keyGate = resolveEncounter("key-gate", "key-gate")

  // A floor-key gate's key host is a purely local, structural requirement — every floor-key
  // gate on this floor needs exactly one key SOMEWHERE on this same floor, decided here,
  // before any section's own endReward gets treated as competing content. "Available host"
  // means genuinely free capacity: ungated AND not already carrying its own authored reward
  // (a section holding a map piece/mosaic/fragment is not free capacity just because it
  // lacks a gate — see docs/game-design/keys-and-locks-solver.md, "Slots have capacity").
  // Gate/ungated checks use only visible sections so hidden sections don't satisfy key-holder requirements.
  const visibleSections = config.sideSections.filter(s => !s.hidden)
  const hasGatedFloorKey = visibleSections.some(s => s.gate?.type === "floor-key")
  const hasFreeUngatedHost = visibleSections.some(s => !s.gate && !s.endReward)

  // Hidden sections are included in maze generation (tagged hidden:true on cells) but masked by useAssembledFloor
  const allSections = config.sideSections
  const sideSections =
    hasGatedFloorKey && !hasFreeUngatedHost
      ? [...allSections, { pathPuzzles: 0, difficulty: "starter" as const, end: "treasure" as const }]
      : allSections

  const hiddenSectionIdxs = new Set(allSections.map((s, i) => (s.hidden ? i : -1)).filter(i => i >= 0))

  const gatedFloorKeyIdxs = sideSections.map((_, i) => i).filter(i => sideSections[i].gate?.type === "floor-key")
  const ungatedIdxs = sideSections.map((_, i) => i).filter(i => !sideSections[i].gate && !sideSections[i].endReward)

  // The auto-injection above guarantees a free host whenever one's needed — this is a
  // structural safety net, not an expected path: if a floor-key gate still has nowhere to
  // put its key, that's an unsolvable floor, not a per-seed maze fluke, so it fails
  // immediately rather than burning every retry attempt on something a different seed can't fix.
  if (gatedFloorKeyIdxs.length > 0 && ungatedIdxs.length === 0) {
    return { success: false, reasons: [{ type: "noUngatedSectionForKey" }] }
  }

  // Minimum node count for the main path alone (entrance, its own content, goal, exit) —
  // kept separate from `minCells` below (which folds in every side-section's cost too) so
  // `packing`'s path-length target scales with what the *main path itself* needs, not with
  // how much unrelated side-section content happens to branch off it elsewhere.
  const mainPathCells = 1 /* entrance */ + config.pathPuzzles + 1 /* goal */ + 1 /* exit/stairhead */

  // Minimum node count needed (real path nodes only — the connector cell between two
  // adjacent nodes lives at a separate, non-node grid position, see NODE_STEP above).
  const minCells =
    mainPathCells +
    sideSections.reduce((sum, sec) => {
      const secCells = sec.pathPuzzles + 1 + (sec.gate ? 1 : 0)
      const subCells = (sec.sideSections ?? []).reduce((s2, sub) => s2 + sub.pathPuzzles + 1 + (sub.gate ? 1 : 0), 0)
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

  // `packing` targets the main path's actual walkable *length*, not the grid's bounding
  // box. buildMaze's BFS always used to pick the true farthest node in the spanning tree
  // as the main-path end — which is, by definition, the longest route the maze can offer —
  // so a winding corridor was always "as long as physically possible" regardless of how
  // little content it carried or how small the surrounding grid was. `targetDistance`
  // (node-hops, not counting the connector cell between each pair — see NODE_STEP) is what
  // buildMaze now aims for instead: `mainPathCells` hops at packing=0 (walk exactly enough
  // to fit the main path's own content, no wandering) scaling up to `mainPathCells * 6` at
  // packing=1 (today's rough default feel) and beyond for packing>1. Deliberately scaled by
  // `mainPathCells`, not the fuller `minCells` below — side-section content branches off
  // the main path rather than extending it, so a floor with two chunky gated sections
  // shouldn't get a longer main path than one with none, just because minCells is bigger.
  // See buildMaze's own comment for the fallback when a grid is too small to reach the
  // target.
  const packing = config.packing ?? DEFAULT_PACKING
  const targetDistance = Math.max(1, Math.round(mainPathCells * (1 + 5 * packing)))

  // Same `packing` scaling applied to every section/sub-section chain — a gated path used
  // to be *exactly* `pathPuzzles + gate + end` cells long, deaf to both `packing` and
  // `corridorStraightness`, however spacious or winding the rest of the floor got. Reusing
  // the identical formula (not a separate, lighter-touch one) keeps one mental model for
  // "how long is a walk" everywhere in the DSL, main path or side path alike.
  //
  // `chainPacking` is `packing` for every ordinary attempt; the recovery phase in the retry
  // loop below winds it down, trading a side path's cosmetic wandering for a layout that fits
  // at all. Nothing outside that loop should change it.
  let chainPacking = packing
  const paddedChainLength = (contentCellsCount: number): number =>
    Math.max(contentCellsCount, Math.round(contentCellsCount * (1 + 5 * chainPacking)))

  // What the carve *actually* consumes, as opposed to `minCells`'s bare content count: every
  // side-section and sub-section chain is carved at its `paddedChainLength`, which is 6× its
  // content at packing=1 and 11× at packing=2. Sizing the grid off `minCells` therefore
  // undershoots badly on floors with many side sections (expert and up), and the retry loop
  // below has to rescue them by growing N on shuffle luck — for 17 authored floors it never
  // did, and they failed outright with `layoutNotFound`. This is the honest figure, and it
  // moves with `chainPacking`, so the recovery phase re-sizes the grid to whatever it has
  // wound the chains down to rather than leaving a shrunken floor rattling around a huge grid.
  const carvedCells = (): number =>
    mainPathCells +
    sideSections.reduce((sum, sec) => {
      const secCells = paddedChainLength(sec.pathPuzzles + 1 + (sec.gate ? 1 : 0))
      const subCells = (sec.sideSections ?? []).reduce(
        (s2, sub) => s2 + paddedChainLength(sub.pathPuzzles + 1 + (sub.gate ? 1 : 0)),
        0
      )
      return sum + secCells + subCells
    }, 0)

  // Derive odd grid size. Only even/even positions can hold a real node (see NODE_STEP
  // above), so usable node capacity is ((N+1)/2)^2, not N^2 — the grid needs to be
  // noticeably bigger than the old dense model for the same amount of content, which
  // is exactly the point: the odd-position lattice between nodes is what guarantees a
  // genuine gap wherever the path winds back near itself. Sized to comfortably fit
  // whichever is bigger: the content itself (`minCells` + packing-scaled headroom for
  // section carving), or enough room for a maze to actually offer a path of
  // `targetDistance` hops (a DFS-maze's diameter is typically a large fraction of its
  // total node count, so `targetDistance * 2` is a generous safety margin — if it's still
  // not enough, the retry loop below grows N further; buildMaze never fails outright).
  const deriveN = (contentCells: number): number => {
    let n = 3
    while (
      Math.pow((n + 1) / 2, 2) <
      Math.max(
        contentCells +
          packing *
            (contentCells * 3 + (n + 1) / 2 + sideSections.length + expectedFootprintRooms * FOOTPRINT_SLACK_PER_ROOM),
        targetDistance * 2
      )
    )
      n += 2
    return n
  }
  const startingN = deriveN(minCells)
  let N = startingN

  const nid = (r: number, c: number) => `${siteId}-${r}-${c}`

  // Attempts 0..RECOVERY_ATTEMPT-1 are FROZEN: same starting N, same growth cadence, same
  // chain lengths, same per-attempt seed as before the recovery phase existed. A pyramid/tomb
  // interior is a persistent, revisitable place whose stored exploredSections and position are
  // keyed to its layout (useJourneys' isPersistentInterior), so re-sizing a floor that already
  // assembles would silently invalidate a player's progress on it.
  //
  // Only a floor that has exhausted the original budget — one nobody can currently enter at
  // all, so there is no progress to protect — enters recovery. There, each attempt sizes the
  // grid to what the carve genuinely needs (`carvedCells`, the figure the original sizing
  // should always have used) while winding `chainPacking` down from `packing` to 0, so the
  // floor is retried across the whole spectrum from "every side path as windy as authored" to
  // "every side path at its bare content length". The last attempt is therefore the most
  // permissive shape this config can take, which is what makes the phase converge instead of
  // just rerolling the same too-tight puzzle. Cosmetically shorter side paths on a floor that
  // was previously unreachable is a plain win.
  for (let attempt = 0; attempt < ASSEMBLY_ATTEMPTS; attempt++) {
    if (attempt >= RECOVERY_ATTEMPT) {
      const steps = Math.max(1, ASSEMBLY_ATTEMPTS - RECOVERY_ATTEMPT - 1)
      chainPacking = (packing * (steps - (attempt - RECOVERY_ATTEMPT))) / steps
      N = Math.max(startingN, deriveN(carvedCells()))
    } else if (attempt > 0 && attempt % 4 === 0) N += 2

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

    const straightBias = config.corridorStraightness ?? DEFAULT_STRAIGHT_BIAS
    const { neighbors, mainPath, passages } = buildMaze(N, entR, entC, rand, straightBias, targetDistance)

    // Exit placed at the main path's end, forced to degree-1 below so no corridor passes
    // through it. Content nodes (puzzles/chests + the goal) are spread evenly across the whole main
    // path instead of packed against the entrance — packing them up front left a long
    // bare corridor behind the goal with nothing to do and nowhere to branch. Spreading
    // keeps something to find along the whole walk, and puts the goal last (closest to
    // the exit) so there's no unused tail behind it either.
    const contentCount = config.pathPuzzles + 1 // + goal
    if (mainPath.length < contentCount + 2) continue // need entrance + content + a distinct exit

    const contentIndices = spreadContentIndices(contentCount, 1, mainPath.length)
    const goalIndex = contentIndices[contentIndices.length - 1]
    // puzzleIndices[k] is the mainPath position of the k-th puzzle (0-based, path order) —
    // used to index into config.rewards[k] below.
    const puzzleIndices = contentIndices.slice(0, -1)
    const puzzleRole = new Map<number, number>()
    puzzleIndices.forEach((idx, k) => puzzleRole.set(idx, k))

    // Full mainPath as corridor so sections can branch from anywhere along it
    const usedCells = new Set<string>(mainPath.map(([r, c]) => `${r},${c}`))
    const [exR, exC] = mainPath[mainPath.length - 1]

    // Force the exit to be a true dead-end (degree 1). The packing knob (targetDistance) ends
    // the main path at a mid-maze node, not the maze's farthest leaf, so the exit cell keeps
    // tree passages toward the still-carved region past it. Left in place, `edgeAllowed` draws
    // those as real doors into any adjacent used side-section corridor, so the corridor reads as
    // continuing past an exit that actually ends the visit the moment it's stepped on. Drop every
    // passage incident to the exit except the one to its main-path predecessor — before sections
    // carve (they read `passages` via `neighbors`), so nothing branches through or beside it.
    const [predR, predC] = mainPath[mainPath.length - 2]
    for (const [dr, dc] of DIRS2) {
      const nr = exR + dr,
        nc = exC + dc
      if (nr === predR && nc === predC) continue
      passages.delete(pkey(exR, exC, nr, nc))
    }

    // Assign each section to cells branching from any main path cell (excluding center).
    type SectionGroup = {
      sectionIdx: number
      cells: Array<[number, number]>
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
        const needed = paddedChainLength(section.pathPuzzles + 1 + (section.gate ? 1 : 0))
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
            sectionGroups.push({ sectionIdx: si, cells, attachedAt: [pcr, pcc] })
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
      attachedAt: [number, number]
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
      // Same "free host, not just ungated" reasoning as the top-level side sections above —
      // a sub-section already carrying its own endReward isn't free capacity for a key.
      const anySubGatedFloorKey = subSects.some(s => s.gate?.type === "floor-key")
      const anySubFreeUngated = subSects.some(s => !s.gate && !s.endReward)
      if (anySubGatedFloorKey && !anySubFreeUngated)
        subSects = [...subSects, { pathPuzzles: 0, difficulty: "starter" as const, end: "treasure" as const }]

      const subGatedIdxs = subSects.map((_, i) => i).filter(i => subSects[i].gate?.type === "floor-key")
      const subUngatedIdxs = subSects.map((_, i) => i).filter(i => !subSects[i].gate && !subSects[i].endReward)

      // Same reasoning as the top-level check above — this is config-derived, not
      // seed-derived, so failing immediately (not retrying) is correct here too.
      if (subGatedIdxs.length > 0 && subUngatedIdxs.length === 0) {
        return { success: false, reasons: [{ type: "noUngatedSectionForKey" }] }
      }

      // Branch candidates: parent section cells (excluding end cell). In recovery a cell whose
      // only opening has to be carved (see the fallback below) counts too — pre-filtering it out
      // here would put it out of that fallback's reach.
      const hasCarveableNeighbor = (pr: number, pc: number) =>
        DIRS2.some(
          ([dr, dc]) =>
            pr + dr >= 0 && pr + dr < N && pc + dc >= 0 && pc + dc < N && !usedCells.has(`${pr + dr},${pc + dc}`)
        )
      const subBranchCandidates = group.cells
        .slice(0, -1)
        .filter(
          ([pr, pc]) =>
            neighbors(pr, pc).some(([ar, ac]) => !usedCells.has(`${ar},${ac}`)) ||
            (attempt >= RECOVERY_ATTEMPT && hasCarveableNeighbor(pr, pc))
        )
        .sort(() => rand() - 0.5)

      const placedSubs: Array<{
        idx: number
        cells: Array<[number, number]>
        attachedAt: [number, number]
      }> = []

      for (let si = 0; si < subSects.length; si++) {
        const sub = subSects[si]
        const subNeeded = paddedChainLength(sub.pathPuzzles + 1 + (sub.gate ? 1 : 0))
        let placed = false

        for (const [pcr, pcc] of subBranchCandidates) {
          let freeAdj = neighbors(pcr, pcc)
            .filter(([ar, ac]) => !usedCells.has(`${ar},${ac}`))
            .sort(() => rand() - 0.5)

          // In recovery, carve a brand-new passage out of the parent chain rather than give up
          // on this candidate — the same departure from "perfect maze" the top-level branch loop
          // above already makes, and for the same reason. Sub-sections not having it is what left
          // the recovery phase stuck: by the time they're placed, earlier chains have boxed the
          // parent in, and a sub-section needing a single free cell would fail the whole attempt
          // with plenty of grid still empty one wall away. Kept to recovery so the frozen
          // attempts stay byte-identical.
          if (freeAdj.length === 0 && attempt >= RECOVERY_ATTEMPT) {
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
            const rest = extendPath(startR, startC, subNeeded - 1, neighbors, usedCells, rand, (r, c) =>
              pocketSize([r, c], 8)
            )
            if (rest === null) {
              usedCells.delete(`${startR},${startC}`)
              continue
            }
            const cells: Array<[number, number]> = [[startR, startC], ...rest]
            cells.slice(1).forEach(([r, c]) => usedCells.add(`${r},${c}`))
            placedSubs.push({ idx: si, cells, attachedAt: [pcr, pcc] })
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

      for (const { idx, cells, attachedAt } of placedSubs) {
        subSectionGroups.push({
          subSection: subSects[idx],
          cells,
          attachedAt,
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

    // Build a random key chain: only FREE (no endReward) treasure-end gated sections can
    // safely relay the next key onward — one that already carries its own authored reward
    // must be a chain LEAF (receives a key, never grants one), same "never overwrite an
    // authored reward" rule as the ungated-entry host above. Staircase-end sections are
    // always leaves too (terminal, no relay). chain[0]'s key → ungated section end; each
    // later element's key → the MOST RECENT free section's end room, which may end up
    // granting several different leaves' keys at once (not necessarily its own immediate
    // successor) — never a rewarded section's own room.
    const gatedTreasureIdxs = gatedFloorKeyIdxs.filter(i => sideSections[i].end !== "staircase")
    const gatedStaircaseIdxs = gatedFloorKeyIdxs.filter(i => sideSections[i].end === "staircase")
    const chain = [
      ...[...gatedTreasureIdxs].sort(() => rand() - 0.5),
      ...[...gatedStaircaseIdxs].sort(() => rand() - 0.5),
    ]

    const keyNodeIdMap = new Map<number, string>() // gated section idx → key node id
    const chainKeyColorMap = new Map<number, KeyColor[]>() // host section idx → key color(s) its end room holds

    if (chain.length > 0 && ungatedIdxs.length > 0) {
      const hostGroup = sectionGroups.find(g => g.sectionIdx === ungatedIdxs[0])
      if (hostGroup) {
        let hostIdx = ungatedIdxs[0]
        let hostCell = hostGroup.cells[hostGroup.cells.length - 1]

        for (const idx of chain) {
          keyNodeIdMap.set(idx, nid(hostCell[0], hostCell[1]))
          const gate = sideSections[idx].gate as { type: "floor-key"; color?: KeyColor }
          const colors = chainKeyColorMap.get(hostIdx) ?? []
          colors.push(gate.color ?? "blue")
          chainKeyColorMap.set(hostIdx, colors)

          if (!sideSections[idx].endReward) {
            const group = sectionGroups.find(g => g.sectionIdx === idx)
            if (group) {
              hostIdx = idx
              hostCell = group.cells[group.cells.length - 1]
            }
          }
        }
      }
    }

    const chainKeyHostIdxs = new Set(chainKeyColorMap.keys())

    // Build room cell specs: posKey -> room properties (sectionHash injected separately)
    type RoomSpec = Omit<RoomCell, "type" | "dirs" | "state" | "sectionHash" | "legacySectionHash" | "hidden">
    const roomSpecs = new Map<string, RoomSpec>()
    const cellSectionHash = new Map<string, string>()
    const cellLegacySectionHash = new Map<string, string>()
    const hiddenCellPositions = new Set<string>()
    // Which section's authored decoration pool a footprint room should draw from.
    const cellDecorationPool = new Map<string, DecorationKind[] | undefined>()

    const posKey = (r: number, c: number) => `${r},${c}`

    // ── Gate isolation ──────────────────────────────────────────────────────────
    // `passages` is a spanning tree over the *entire* node lattice, built once before
    // any section exists — most of its edges never get walked by main-path/section/
    // sub-section construction, but any two used cells that happen to be tree-adjacent
    // still read as a real door once dirs get computed below (see the two loops after
    // `cells2D` is allocated). For plain content that's a harmless bonus: a stray
    // loop or shortcut nobody planned but nobody minds either. For gated content it's
    // a softlock/bypass — a section only exists behind its gate because the gate is
    // its *only* legitimate entrance, so it must never gain a "free" extra door from
    // a leftover tree edge. Trapped content gets the same treatment even without a
    // gate: a stray door would let a player step past a trap cell for free.
    // `intendedEdgeKeys` records the edges each chain actually walked (main path, and
    // each section's/sub-section's attach point through its own cells in order);
    // `gatedCellKeys` marks every cell behind a gate or trap, including a gated/trapped
    // section's plain sub-sections (still behind the same outer gate/trap) and a plain
    // section's own gated/trapped sub-section. A door is allowed if it's an intended
    // edge, or if neither endpoint is gated/trapped content.
    const gatedCellKeys = new Set<string>()
    const intendedEdgeKeys = new Set<string>()
    const markChain = (attachedAt: [number, number], chainCells: Array<[number, number]>) => {
      let [pr, pc] = attachedAt
      for (const [r, c] of chainCells) {
        intendedEdgeKeys.add(pkey(pr, pc, r, c))
        ;[pr, pc] = [r, c]
      }
    }
    for (let mi = 0; mi < mainPath.length - 1; mi++) {
      const [r, c] = mainPath[mi]
      const [nr, nc] = mainPath[mi + 1]
      intendedEdgeKeys.add(pkey(r, c, nr, nc))
    }
    // Isolation: cut a stretch off from the leftover maze edges, so no stray tree edge lets a player
    // step past what guards it. A gate asks for it, and `sealed` asks for it on an ordinary visible
    // path — which is how a trap gets it too: world-gen writes `sealed` on the section it gives a
    // trap to (placeEncounters), so nothing here has to read an encounter to lay out a floor. A
    // sub-section inherits its parent's isolation — reaching it means going through the parent
    // either way.
    //
    // Named once because the section hash records exactly this boolean, so hash and layout cannot
    // drift apart: a floor forgets a run's progress only when its corridors really changed.
    const sideIsolated = (idx: number): boolean => Boolean(sideSections[idx].gate) || Boolean(sideSections[idx].sealed)
    const subIsolated = (parentIdx: number, sub: SubSection): boolean =>
      sideIsolated(parentIdx) || Boolean(sub.gate) || Boolean(sub.sealed)
    // Every consecutive main-path edge is already `intended` above, so isolating the main path only
    // blocks *extra* leftover edges that would merge a shortcut around a puzzle room.
    const mainIsolated = Boolean(config.sealed)

    if (mainIsolated) {
      for (const [r, c] of mainPath) gatedCellKeys.add(posKey(r, c))
    }
    for (const group of sectionGroups) {
      markChain(group.attachedAt, group.cells)
      if (sideIsolated(group.sectionIdx)) {
        for (const [r, c] of group.cells) gatedCellKeys.add(posKey(r, c))
      }
    }
    for (const sub of subSectionGroups) {
      markChain(sub.attachedAt, sub.cells)
      if (subIsolated(sub.parentSectionIdx, sub.subSection)) {
        for (const [r, c] of sub.cells) gatedCellKeys.add(posKey(r, c))
      }
    }
    const edgeAllowed = (r: number, c: number, nr: number, nc: number): boolean => {
      if (!passages.has(pkey(r, c, nr, nc))) return false
      if (intendedEdgeKeys.has(pkey(r, c, nr, nc))) return true
      return !gatedCellKeys.has(posKey(r, c)) && !gatedCellKeys.has(posKey(nr, nc))
    }

    // Which tier each cell's own section was authored at, so a passage into a pocket of another
    // difficulty is BUILT of that difficulty (docs/game-design/spritesheet-renderer-prep.md — the
    // material is the rank whose tomb this is). Rooms carry it already; corridors did not.
    const cellDifficulty = new Map<string, Difficulty>()
    const mainSectionHash = computeMainSectionHash(config, mainIsolated)
    const legacyMainSectionHash = computeLegacyMainSectionHash(config)
    for (const [r, c] of mainPath) {
      cellSectionHash.set(posKey(r, c), mainSectionHash)
      cellLegacySectionHash.set(posKey(r, c), legacyMainSectionHash)
      cellDecorationPool.set(posKey(r, c), config.decorations)
      cellDifficulty.set(posKey(r, c), config.difficulty)
    }
    for (const group of sectionGroups) {
      const sHash = computeSideSectionHash(
        sideSections[group.sectionIdx],
        group.sectionIdx,
        sideIsolated(group.sectionIdx),
        config
      )
      const legacyHash = computeLegacySideSectionHash(sideSections[group.sectionIdx], group.sectionIdx)
      const isHidden = hiddenSectionIdxs.has(group.sectionIdx)
      const pool = sideSections[group.sectionIdx].decorations
      const sectionTier = sideSections[group.sectionIdx].difficulty
      for (const [r, c] of group.cells) {
        cellSectionHash.set(posKey(r, c), sHash)
        cellLegacySectionHash.set(posKey(r, c), legacyHash)
        cellDecorationPool.set(posKey(r, c), pool)
        cellDifficulty.set(posKey(r, c), sectionTier)
        if (isHidden) hiddenCellPositions.add(posKey(r, c))
      }
    }
    for (const { subSection, cells, parentSectionIdx, subSectionIdx } of subSectionGroups) {
      const sHash = computeSideSectionHash(
        subSection,
        subSectionIdx,
        subIsolated(parentSectionIdx, subSection),
        config,
        parentSectionIdx
      )
      const legacyHash = computeLegacySideSectionHash(subSection, subSectionIdx, parentSectionIdx)
      for (const [r, c] of cells) {
        cellSectionHash.set(posKey(r, c), sHash)
        cellLegacySectionHash.set(posKey(r, c), legacyHash)
        cellDecorationPool.set(posKey(r, c), subSection.decorations)
        cellDifficulty.set(posKey(r, c), subSection.difficulty)
      }
    }

    // Collect branch junction cells (become fork nodes)
    const forkPositions = new Set(sectionGroups.map(g => posKey(g.attachedAt[0], g.attachedAt[1])))

    // Main path nodes — spread across the full path per contentIndices/goalIndex above;
    // everything else along mainPath is left unassigned and falls through to plain corridor.
    // The goal-room fallback here is defensive only: every real config sets mainEndReward
    // explicitly (buildSite.ts). An unset one falls back to the same grant-nothing placeholder
    // every other unset reward slot uses.
    for (let mi = 0; mi < mainPath.length; mi++) {
      const [r, c] = mainPath[mi]
      if (mi === 0) {
        if (config.entrance) {
          const stairId = typeof config.entrance === "object" ? config.entrance.stairId : `${siteId}:entrance`
          roomSpecs.set(posKey(r, c), { roomType: "portal", stairId })
        } else {
          roomSpecs.set(posKey(r, c), { roomType: "portal" })
        }
      } else if (mi === goalIndex) {
        roomSpecs.set(posKey(r, c), {
          roomType: "encounter",
          family: treasureChest.familyId,
          tags: treasureChest.tags,
          ...(config.mainEndReward ? { reward: config.mainEndReward } : {}),
        })
      } else if (puzzleRole.has(mi)) {
        const k = puzzleRole.get(mi)!
        // Per-node override (authored `nodes` selectors, e.g. the last room's capstone) if this
        // index has one, else the chain's default `encounter`.
        const override = config.encountersByIndex?.[k]
        const family =
          override !== undefined ? resolveEncounter(override, "puzzle") : resolveEncounter(config.encounter, "puzzle")
        const reward = config.rewards?.[k]
        const requiredKeyIds = resolveKeyRequirements(family.familyId, {
          ...floorRef,
          pathIndex: k,
          encounterArgs: config.encounterArgs,
        })
        const boardIndex = resolveBoardIndex?.(family.familyId, { section: "main", pathIndex: k })
        roomSpecs.set(posKey(r, c), {
          roomType: "encounter",
          family: family.familyId,
          tags: family.tags,
          pathIndex: k,
          ...(boardIndex !== undefined ? { boardIndex } : {}),
          ...(config.encounterArgs !== undefined ? { encounterArgs: config.encounterArgs } : {}),
          difficulty: config.difficulty,
          ...(config.theme !== undefined ? { theme: config.theme } : {}),
          ...(config.role !== undefined ? { role: config.role } : {}),
          ...(requiredKeyIds?.length ? { requiredKeyIds } : {}),
          ...(reward ? { reward } : {}),
        })
      }
    }

    // Corridor cells that are branch junctions become fork nodes too
    for (const pk of forkPositions) {
      if (!roomSpecs.has(pk)) roomSpecs.set(pk, { roomType: "fork" })
    }

    // Exit / stairhead
    if (config.exitOrStaircase === "exit") {
      roomSpecs.set(posKey(exR, exC), { roomType: "portal" })
    } else {
      const stairId = typeof config.exitOrStaircase === "object" ? config.exitOrStaircase.stairId : `${siteId}:main`
      roomSpecs.set(posKey(exR, exC), { roomType: "portal", stairId })
    }

    // Section nodes
    for (const group of sectionGroups) {
      const { sectionIdx, cells } = group
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
          roomType: "encounter",
          family: keyGate.familyId,
          tags: keyGate.tags,
          requiredKeyId: keyNodeId,
          gateVariant: "floor-key",
          keyColor: floorKeyGate.color ?? "blue",
        })
        contentStart = 1
      } else if (isTombKeyGate) {
        const [gr, gc] = cells[0]
        const tombGate = section.gate as { type: "tomb-key"; wardKeyId: string }
        roomSpecs.set(posKey(gr, gc), {
          roomType: "encounter",
          family: keyGate.familyId,
          tags: keyGate.tags,
          requiredKeyId: tombGate.wardKeyId,
          gateVariant: "tomb-key",
        })
        contentStart = 1
      }

      // Intermediate nodes within section (puzzles/traps) — spread across whatever room
      // `paddedChainLength` gave this chain (see spreadContentIndices), same technique as
      // the main path, instead of assumed-consecutive from contentStart (which only ever
      // held when a chain was exactly its bare content length).
      const secContentIndices = spreadContentIndices(section.pathPuzzles, contentStart, cells.length)
      for (let pi = 0; pi < section.pathPuzzles; pi++) {
        const [r, c] = cells[secContentIndices[pi]]
        const reward = section.rewards?.[pi]
        const secOverride = section.encountersByIndex?.[pi]
        const family =
          secOverride !== undefined
            ? resolveEncounter(secOverride, "puzzle")
            : resolveEncounter(section.encounter, "puzzle")
        const requiredKeyIds = resolveKeyRequirements(family.familyId, {
          ...floorRef,
          pathIndex: pi,
          encounterArgs: section.encounterArgs,
        })
        const boardIndex = resolveBoardIndex?.(family.familyId, { section: `s${sectionIdx}`, pathIndex: pi })
        roomSpecs.set(posKey(r, c), {
          roomType: "encounter",
          // Never inherits the floor's own tableau encounter — tableaus consume hieroglyph
          // symbols the player may not have yet, so a side path stays sumplete (the "puzzle"
          // tag's default) unless it explicitly opts into a different family itself.
          family: family.familyId,
          tags: family.tags,
          pathIndex: pi,
          ...(boardIndex !== undefined ? { boardIndex } : {}),
          ...(section.encounterArgs !== undefined ? { encounterArgs: section.encounterArgs } : {}),
          difficulty: section.difficulty,
          ...(section.theme !== undefined ? { theme: section.theme } : {}),
          ...(section.role !== undefined ? { role: section.role } : {}),
          ...(requiredKeyIds?.length ? { requiredKeyIds } : {}),
          ...(reward ? { reward } : {}),
        })
      }

      // End node
      const [er, ec] = cells[cells.length - 1]
      if (chainKeyHostIdxs.has(sectionIdx)) {
        const hColors = chainKeyColorMap.get(sectionIdx) ?? []
        roomSpecs.set(posKey(er, ec), {
          roomType: "encounter",
          family: treasureChest.familyId,
          tags: treasureChest.tags,
          reward: { type: "tombKey", keyId: nid(er, ec) },
          ...(hColors.length === 1 ? { keyColor: hColors[0] } : {}),
          ...(hColors.length > 1 ? { keyColors: hColors } : {}),
        })
      } else if (section.end === "staircase" || typeof section.end === "object") {
        const stairId = typeof section.end === "object" ? section.end.stairId : `${siteId}:side${sectionIdx}`
        roomSpecs.set(posKey(er, ec), { roomType: "portal", stairId })
      } else {
        // A shop is a section whose resolved encounter is fez-shop (a pathPuzzles:0 node — no chain,
        // so `encounter` describes this end node). It renders its `rewards[]` as buyable stock; a
        // plain end renders its single endReward. Shop-off → encounter didn't resolve to fez-shop →
        // falls back to a treasure chest here.
        const isShop =
          section.encounter !== undefined &&
          resolveEncounter(section.encounter, "treasure").familyId === fezShop.familyId
        roomSpecs.set(posKey(er, ec), {
          roomType: "encounter",
          family: isShop ? fezShop.familyId : treasureChest.familyId,
          tags: isShop ? fezShop.tags : treasureChest.tags,
          ...(isShop ? { stock: section.rewards ?? [] } : section.endReward ? { reward: section.endReward } : {}),
        })
      }
    }

    // Sub-section nodes
    for (const {
      subSection,
      cells,
      keyNodeId,
      isKeyHost,
      keyHostColor,
      keyHostColors,
      parentSectionIdx,
      subSectionIdx,
    } of subSectionGroups) {
      const isFloorKeyGate = subSection.gate?.type === "floor-key"
      const isTombKeyGate = subSection.gate?.type === "tomb-key"
      let contentStart = 0

      if (isFloorKeyGate && keyNodeId) {
        const [gr, gc] = cells[0]
        const floorKeyGate = subSection.gate as { type: "floor-key"; color?: KeyColor }
        roomSpecs.set(posKey(gr, gc), {
          roomType: "encounter",
          family: keyGate.familyId,
          tags: keyGate.tags,
          requiredKeyId: keyNodeId,
          gateVariant: "floor-key",
          keyColor: floorKeyGate.color ?? "blue",
        })
        contentStart = 1
      } else if (isTombKeyGate) {
        const [gr, gc] = cells[0]
        const tombGate = subSection.gate as { type: "tomb-key"; wardKeyId: string }
        roomSpecs.set(posKey(gr, gc), {
          roomType: "encounter",
          family: keyGate.familyId,
          tags: keyGate.tags,
          requiredKeyId: tombGate.wardKeyId,
          gateVariant: "tomb-key",
        })
        contentStart = 1
      }

      // Spread across whatever room `paddedChainLength` gave this chain — same technique
      // as the parent section and the main path (see spreadContentIndices). Indices must map
      // through `subContentIndices` (not a raw `(contentStart + pi) * 2`), so a multi-puzzle
      // sub-section indexes its own content rather than past it.
      const subContentIndices = spreadContentIndices(subSection.pathPuzzles, contentStart, cells.length)
      for (let pi = 0; pi < subSection.pathPuzzles; pi++) {
        const [r, c] = cells[subContentIndices[pi]]
        const reward = subSection.rewards?.[pi]
        const subOverride = subSection.encountersByIndex?.[pi]
        const family =
          subOverride !== undefined
            ? resolveEncounter(subOverride, "puzzle")
            : resolveEncounter(subSection.encounter, "puzzle")
        const requiredKeyIds = resolveKeyRequirements(family.familyId, {
          ...floorRef,
          pathIndex: pi,
          encounterArgs: subSection.encounterArgs,
        })
        const boardIndex = resolveBoardIndex?.(family.familyId, {
          section: `s${parentSectionIdx}.${subSectionIdx}`,
          pathIndex: pi,
        })
        roomSpecs.set(posKey(r, c), {
          roomType: "encounter",
          // Same reasoning as the side-section case above: never inherits the floor's
          // tableau encounter unless the sub-section explicitly opts in itself.
          family: family.familyId,
          tags: family.tags,
          pathIndex: pi,
          ...(boardIndex !== undefined ? { boardIndex } : {}),
          ...(subSection.encounterArgs !== undefined ? { encounterArgs: subSection.encounterArgs } : {}),
          difficulty: subSection.difficulty,
          ...(subSection.theme !== undefined ? { theme: subSection.theme } : {}),
          ...(subSection.role !== undefined ? { role: subSection.role } : {}),
          ...(requiredKeyIds?.length ? { requiredKeyIds } : {}),
          ...(reward ? { reward } : {}),
        })
      }

      const [er, ec] = cells[cells.length - 1]
      if (isKeyHost) {
        const hColors = keyHostColors ?? (keyHostColor ? [keyHostColor] : [])
        roomSpecs.set(posKey(er, ec), {
          roomType: "encounter",
          family: treasureChest.familyId,
          tags: treasureChest.tags,
          reward: { type: "tombKey", keyId: nid(er, ec) },
          ...(hColors.length === 1 ? { keyColor: hColors[0] } : {}),
          ...(hColors.length > 1 ? { keyColors: hColors } : {}),
        })
      } else if (subSection.end === "staircase" || typeof subSection.end === "object") {
        const stairId = typeof subSection.end === "object" ? subSection.end.stairId : `${siteId}:subsection`
        roomSpecs.set(posKey(er, ec), { roomType: "portal", stairId })
      } else {
        const isShop =
          subSection.encounter !== undefined &&
          resolveEncounter(subSection.encounter, "treasure").familyId === fezShop.familyId
        roomSpecs.set(posKey(er, ec), {
          roomType: "encounter",
          family: isShop ? fezShop.familyId : treasureChest.familyId,
          tags: isShop ? fezShop.tags : treasureChest.tags,
          ...(isShop
            ? { stock: subSection.rewards ?? [] }
            : subSection.endReward
              ? { reward: subSection.endReward }
              : {}),
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
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && usedCells.has(`${nr},${nc}`) && edgeAllowed(r, c, nr, nc)) {
          dirs.add(d)
        }
      }

      const spec = roomSpecs.get(cellKey)
      const sectionHash = cellSectionHash.get(cellKey) ?? mainSectionHash
      const legacySectionHash = cellLegacySectionHash.get(cellKey) ?? legacyMainSectionHash
      const hidden = hiddenCellPositions.has(cellKey) || undefined
      if (spec) {
        // Spread the whole spec (RoomSpec = RoomCell minus the structural fields set here)
        // rather than copying fields one by one — a field dropped from this list is exactly
        // the bug class that silently discarded pathIndex/requiredKeyIds until a test caught
        // it; spreading means a future RoomCell field can't go missing here again.
        const roomCell: RoomCell = {
          type: "room",
          dirs,
          state: "fogged",
          // The tier of the section this room stands in, so the map is BUILT of it — a treasure room
          // in a junior pocket is junior stone even though only encounter rooms carry a difficulty of
          // their own. The spread below still wins, so a room authored at its own tier keeps it.
          ...(cellDifficulty.get(cellKey) ? { difficulty: cellDifficulty.get(cellKey) } : {}),
          sectionHash,
          legacySectionHash,
          ...(hidden ? { hidden } : {}),
          ...spec,
        }
        cells2D[r][c] = roomCell
      } else {
        const cellTier = cellDifficulty.get(posKey(r, c))
        const corridorCell: CorridorCell = {
          type: "corridor",
          dirs,
          state: "fogged",
          sectionHash,
          legacySectionHash,
          ...(cellTier ? { difficulty: cellTier } : {}),
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
        if (!usedCells.has(neighborKey) || !edgeAllowed(r, c, nr, nc)) continue
        if (r * N + c > nr * N + nc) continue // process each edge once
        const mr = (r + nr) / 2,
          mc = (c + nc) / 2
        const hidden = hiddenCellPositions.has(cellKey) && hiddenCellPositions.has(neighborKey) ? true : undefined
        const sectionHash = cellSectionHash.get(cellKey) ?? mainSectionHash
        const connectorTier = cellDifficulty.get(cellKey)
        cells2D[mr][mc] = {
          type: "corridor",
          dirs: new Set([d, OPPOSITE[d]]),
          state: "fogged",
          sectionHash,
          legacySectionHash: cellLegacySectionHash.get(cellKey) ?? legacyMainSectionHash,
          ...(connectorTier ? { difficulty: connectorTier } : {}),
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
      const [r, c] = pk.split(",").map(Number)
      // Dead-end rooms only — treasure/shop chests and stairs/exits, never mid-path or
      // the floor's own entrance (a portal, but never a decoration-worthy dead end).
      const isTreasureLike =
        spec.roomType === "encounter" && (spec.tags?.includes("treasure") || spec.tags?.includes("shop"))
      const isPortalEndpoint = spec.roomType === "portal" && !(r === entR && c === entC)
      if (!isTreasureLike && !isPortalEndpoint) continue
      const cell = cells2D[r][c]
      if (cell.type === "room" && cell.dirs.size === 1) endpointPositions.add(pk)
    }
    // Which prop a room draws is picked by WHERE it is, not by how many rooms drew before it. A
    // per-pool counter looks equivalent but is not: the generated world gives every section its own
    // pool literal, so each counter started at zero again and all but the first kind went unused —
    // every fork in the world held a crate.
    const pickDecoration = (pool: DecorationKind[] | undefined, pk: string): DecorationKind | undefined =>
      pool?.length ? pool[hashString(`${siteId}:decoration:${pk}`) % pool.length] : undefined
    for (const pk of new Set([...forkPositions, ...endpointPositions])) {
      const decoration = pickDecoration(cellDecorationPool.get(pk), pk)
      if (!decoration) continue
      const [r, c] = pk.split(",").map(Number)
      const owner = cells2D[r][c]
      if (owner.type === "room") cells2D[r][c] = { ...owner, decoration }
    }

    const staircases: Record<string, readonly [number, number]> = {}
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = cells2D[r][c]
        if (cell.type === "room" && cell.stairId) {
          staircases[cell.stairId] = [r, c]
        }
      }
    }

    const grid: FloorGrid = {
      cells: cells2D,
      difficulty: config.difficulty,
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
