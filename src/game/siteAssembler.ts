import { mulberry32, shuffle } from "./random"
import { hashString } from "@/support/hashString"
import { type Mark, markFor } from "./mark"
import type {
  AssemblerFailure,
  AssemblerResult,
  FloorConfig,
  MechanismRecord,
  FloorGrid,
  GridCell,
  Direction,
  CorridorCell,
  RoomCell,
  KeyColor,
  SubSection,
  SideSection,
  DecorationKind,
  WallDecorationKind,
  Difficulty,
} from "./siteTypes"
import { HANDLE_SIDES, MECHANISM_AT_REST } from "./siteTypes"
import { appetiteAccepts, offRouteChains, regionOfStep, regionRoute, strandedRegions } from "./regions"
import type { ContentKind, SideChain } from "./regions"
import { crossesNoDoor, doorsToEnterRegion, seamIndexFor, topologyFaults } from "./obstacles"
import type { Control, Obstacle } from "./obstacles"
import { cellSlot } from "./cellSlot"
import { stairIdAt } from "./stairAddress"
import { footprintSize } from "./roomFootprint"
import type { ResolveBoardIndex } from "./seeds/boardIndex"
import { validateSite } from "./siteValidator"
import { rolesOfProp, rolesOfWallItem } from "./dressingTags"
import type { FamilyMeta } from "./families/familyMeta"

// Resolves an authored `encounter` (exact family id, or tag(s)) to a concrete family id
// plus that family's own tags. Injected by the caller so this domain module never needs
// to know which families/mods actually exist — see resolveEncounter in
// src/app/families/familyRegistry.ts for the real (registry-backed) implementation.
// `reEnterable` mirrors the resolved family's own FamilyMeta.reEnterable — whether a finished room of
// it is walked back INTO. Carried here because a switch needs it and core may not read a mod's meta:
// the resolver that knows the registry answers, and this module only asks.
// `ownerMod` names the mod that contributed the resolved family, and is absent exactly when no family
// answered the query — which is how a caller holding only this resolution tells a room whose mod left
// the build from one a mod that is here still stands in.
export type EncounterResolution = { familyId: string; tags: string[]; reEnterable?: boolean; ownerMod?: string }
export type ResolveEncounter = (encounter: string | string[] | undefined, defaultTag: string) => EncounterResolution

// The one place a resolved FamilyMeta becomes an EncounterResolution — shared by
// familyRegistry.ts's app-layer resolveEncounter and allFamilyMeta.ts's world-gen-reachable
// resolveEncounterMeta, so a field neither can read without the other (rewardPriority's
// siblings, reEnterable before it) is added once instead of copied into two lookup functions.
// `fallback` is the pre-resolution id/tag query, echoed back (id-joined if an array) when no
// family matched — an unauthored or mod-disabled encounter falls through to the runtime's own
// family-absence handling rather than resolving to nothing.
export const encounterFromMeta = (meta: FamilyMeta | undefined, fallback: string | string[]): EncounterResolution => {
  if (!meta) return { familyId: Array.isArray(fallback) ? fallback.join("+") : fallback, tags: [] }
  return {
    familyId: meta.id,
    tags: meta.tags,
    ownerMod: meta.ownerMod,
    ...(meta.reEnterable ? { reEnterable: true } : {}),
  }
}

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
// production always passes familyRegistry.ts's resolveEncounter. Never claims `reEnterable`: this
// fallback's own catalogue holds no family that offers a walk back in, and it has no registry to ask
// about any other id, so a switch resolved through it is refused rather than guessed open. A caller
// that needs a real answer (world-gen's sweep, the runtime) injects a resolver that has one.
export const defaultResolveEncounter: ResolveEncounter = (encounter, defaultTag) => {
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
// `isolated` is why an encounter is not in here directly: the assembler reads a section's encounter for
// exactly one layout decision — cutting a trap off from stray tree edges — so the hash records that
// decision, not the encounter. Swapping a section to another puzzle family is then invisible to a save.
//
// `legacySectionHash` is the same hash without that substitution, carried on every cell so a save written
// under the old scheme keeps matching its own cells. Delete both once no live save predates it.
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

/** The main path's own address, in the same vocabulary boardIndex.ts uses for its chains. */
const MAIN_SECTION_ADDRESS = "main"

/** The shape the positional addresses take, which an authored label must not imitate — otherwise a
 * label could collide with a sibling that happens to sit at that index. */
const POSITIONAL_ADDRESS = /^(main|s\d+(\.\d+)?)$/

/** What a label may be made of. `#` and `/` are the address's own separators (cellIdentity.ts), so a
 * label carrying either would produce a cell address that reads back as a different section or floor. */
const USABLE_LABEL = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

/** How many levels of section the carve builds: the paths off the main one, and the paths off those.
 * `sectionTooDeep` refuses anything hung below that, and seeds/boardIndex.ts stops at the same depth. */
const CARVED_SECTION_DEPTH = 2

/**
 * What hangs off a section, however deep it was authored.
 *
 * The type stops one level down because that is as deep as the carve goes, while the DSL nests
 * without limit (worldGen/dsl.ts) and the serializer bakes whatever it is given — so a deeper level
 * arrives here as data the type cannot see. Reading it is what lets the floor be refused by name
 * instead of assembled with the deepest sections missing.
 */
const childSectionsOf = (section: SubSection): SubSection[] => (section as SideSection).sideSections ?? []

/**
 * What each of a floor's sections is called: its authored `label` where it has one, else where it sits.
 *
 * Labelling is opt-in per path, because naming every one of them would be a tax on authoring for the
 * sake of the few that matter. An unlabelled section keeps the positional address and the hazard that
 * comes with it — insert a sidepath ahead of it and it shifts — which is exactly what a label buys off.
 *
 * Walks every authored level, not only the ones the carve reaches: a name is a save key wherever it
 * sits, so one repeated three levels down would share progress exactly as one repeated at the top.
 *
 * Returns the duplicates instead of the addresses when two sections would answer to the same name: a
 * save cannot tell them apart, so their progress would be shared between two places.
 */
const sectionAddresses = (
  config: FloorConfig
): { ok: true; of: Map<string, string> } | { ok: false; duplicate: string } => {
  const of = new Map<string, string>()
  const taken = new Set<string>([MAIN_SECTION_ADDRESS])
  const claim = (positional: string, label: string | undefined): string | null => {
    const address = label ?? positional
    // A label shaped like a positional address could collide with whichever sibling lands on that
    // index; one carrying an address separator would not survive being read back at all.
    if (label !== undefined && (POSITIONAL_ADDRESS.test(label) || !USABLE_LABEL.test(label))) return null
    if (taken.has(address)) return null
    taken.add(address)
    of.set(positional, address)
    return address
  }
  const walk = (sections: SubSection[], prefix: string): string | null => {
    for (const [idx, section] of sections.entries()) {
      const positional = `${prefix}${idx}`
      if (claim(positional, section.label) === null) return section.label ?? positional
      const deeper = walk(childSectionsOf(section), `${positional}.`)
      if (deeper !== null) return deeper
    }
    return null
  }
  const duplicate = walk(config.sideSections, "s")
  return duplicate === null ? { ok: true, of } : { ok: false, duplicate }
}

/** Every section authored below the depth the carve builds, by the name it answers to. */
const sectionsTooDeep = (config: FloorConfig, addressOf: ReadonlyMap<string, string>): string[] => {
  const below: string[] = []
  const walk = (sections: SubSection[], prefix: string, depth: number): void => {
    for (const [idx, section] of sections.entries()) {
      const positional = `${prefix}${idx}`
      if (depth > CARVED_SECTION_DEPTH) below.push(addressOf.get(positional) ?? positional)
      // A section already named goes no deeper: its own children are refused along with it, and one
      // name per branch says where the authoring left what the carve builds.
      else walk(childSectionsOf(section), `${positional}.`, depth + 1)
    }
  }
  walk(config.sideSections, "s", 1)
  return below
}

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
const DEFAULT_PACKING = 0.1

// Maze carving is a per-attempt gamble (each attempt reshuffles branch points and section
// order), so assembleFloor retries. The first RECOVERY_ATTEMPT attempts run at the original
// sizing; the rest re-size the grid to what the carve actually needs and wind the side chains
// down. Measured over every authored floor × 30 seeds each: all of them assemble, the slowest
// at attempt 37, so the tail of the budget is headroom rather than something floors rely on.
// See the retry loop in assembleFloor for why the first stretch is deliberately frozen.
const RECOVERY_ATTEMPT = 30
// Attempts spent at one packing before asking for more room, and how much more. Four rerolls is
// enough for a floor that only needed shuffle luck; seven rungs of 1.5x carry the tightest default
// past 1, so no floor is stuck at a wish its sections cannot fit.
const ATTEMPTS_PER_RUNG = 4
// Every other rung widens; the ones between just grow the grid. More room is the cheaper rescue —
// it costs the player nothing — and a longer main path is what re-couples a floor's walk to how much
// side content hangs off it, which is the very thing `targetDistance` exists to prevent.
const ATTEMPTS_PER_WIDEN = 8
const PACKING_WIDEN = 2
// The roomiest a widening will ever ask for. Past it the retry goes back to growing the grid, which
// is the lever that suits a floor whose sections already have room to wander: compounding the wish
// instead carves a walk hundreds of cells long for a floor holding three puzzles.
const PACKING_CEILING = 1
const ASSEMBLY_ATTEMPTS = 60

/** The five kinds a god can be DEPICTED on, as `tileAssets.ts`'s resolver reads them: a patron reaches
 * the map through these and nothing else. Copied rather than imported for the reason `artCensus.ts`
 * gives — that module pulls in the app's PNG imports. */
const PATRON_KINDS = new Set<string>(["statue", "shrine", "wallShrine", "stela", "mask"])
/** How many rooms per floor a dedicated site gives to its god. See `patronRooms` for why this is a
 * count rather than a weight, and what weighting cost when it was measured. */
const PATRON_PER_FLOOR = 1

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
  /** Where this floor was AUTHORED — which journey, which of its levels, which floor of that level.
   * `levelIndex` is what separates two levels of one journey, so the ids derived from it (a switch's
   * gate stems) stay distinct across the world; unset (stories, the builder) it reads as 0. */
  floorRef?: { journeyId: string; levelIndex?: number; floorIndex: number }
  /** Which seed-list entry each room draws, by its authored address — injected for the same reason
   * resolveEncounter is: this module knows a floor's chains, never which world they belong to.
   * Absent (stories, specs, the builder) leaves rooms unstamped and they index by their own hash. */
  resolveBoardIndex?: ResolveBoardIndex
}

// A floor-key gate whose keyId is authored gets its key from wherever the author names (a
// family, a room reward) rather than this floor's own rotation — so it needs no host chest
// grown for it and takes no part in the key-host chain below.
const needsFloorKeyHost = (s: SubSection): boolean => s.gate?.type === "floor-key" && !s.gate.keyId

/**
 * THE SECTION THE ASSEMBLER GROWS ITSELF where a level's floor-key gates have nowhere to put their key,
 * so a floor carries paths its authoring never named — `s2.1` on a shipped floor may be one of these.
 */
const GROWN_KEY_HOST = { pathPuzzles: 0, difficulty: "starter", end: "treasure" } as const

/**
 * Whether one level of a floor owes a key a home it does not already have.
 *
 * A floor-key gate's key host is a purely local, structural requirement — every floor-key gate at one
 * level needs exactly one key SOMEWHERE at that same level, decided before any section's own endReward
 * gets treated as competing content. "Available host" means genuinely free capacity: ungated AND not
 * already carrying its own authored reward (a section holding a map piece/mosaic/fragment is not free
 * capacity just because it lacks a gate — see docs/game-design/keys-and-locks-solver.md, "Slots have
 * capacity").
 *
 * Asked of whichever sections may ANSWER it: every level asks only its visible ones, so a hidden
 * section never satisfies a key-holder requirement at any depth.
 */
const owesAKeyHost = (eligible: readonly SubSection[]): boolean =>
  eligible.some(needsFloorKeyHost) && !eligible.some(s => !s.gate && !s.endReward)

/** Which of one level's sections hold a floor-key gate owing a key, and which are free to host one.
 * A hidden section is never free capacity: its cells are masked until the player finds them, so a key
 * put there is one they may never be shown a way to. */
const keyHostIdxs = (sections: readonly SubSection[]) => ({
  gatedIdxs: sections.map((_, i) => i).filter(i => needsFloorKeyHost(sections[i])),
  ungatedIdxs: sections
    .map((_, i) => i)
    .filter(i => !sections[i].gate && !sections[i].endReward && !sections[i].hidden),
})

/** What a lever's room is drawn and filled by. Nothing but a name here: which family answers to it is
 * the registry's, and the floor only says a lever stands in this room. */
const HANDLE_FAMILY = "handle"

/** The sections a handle drives carry its gate, so the rest of the carve meets an ordinary authored
 * floor-key gate: the section is isolated behind it, no host chest is grown for a key nothing on this
 * floor mints, and the gate room is written by the one place that writes gate rooms. */
const withHandleGates = (
  config: FloorConfig,
  addressOf: ReadonlyMap<string, string>,
  gateKeyByAddress: ReadonlyMap<string, string>
): FloorConfig => {
  // Every authored section has an address (sectionAddresses claims one for each), and a missing one
  // would silently skip a gate the lever is already carrying a position for.
  const gateKeyAt = (positional: string): string | undefined => {
    const address = addressOf.get(positional)
    if (address === undefined) throw new Error(`[siteAssembler] section ${positional} has no address`)
    return gateKeyByAddress.get(address)
  }
  return {
    ...config,
    sideSections: config.sideSections.map((side, idx) => {
      const subSections = side.sideSections?.map((sub, subIdx) => {
        const keyId = gateKeyAt(`s${idx}.${subIdx}`)
        return keyId ? { ...sub, gate: { type: "floor-key" as const, keyId } } : sub
      })
      const keyId = gateKeyAt(`s${idx}`)
      return {
        ...side,
        ...(subSections ? { sideSections: subSections } : {}),
        ...(keyId ? { gate: { type: "floor-key" as const, keyId } } : {}),
      }
    }),
  }
}

/**
 * One carved path hanging off another: what was authored, where the carve put it, and the name it
 * answers to.
 *
 * A path off the main walk and a path off one of those differ only in these fields, so every pass
 * below — isolation, the cell metadata, the rooms — reads a chain rather than a level, and a rule
 * written once holds at both.
 */
type Chain = {
  section: SideSection | SubSection
  cells: Array<[number, number]>
  attachedAt: [number, number]
  /** Where it sits among its siblings: `s0`, `s0.1`. */
  positional: string
  /** Its own index, and its parent's where it has one — what the section hash is keyed on. */
  idx: number
  parentIdx?: number
  /** The doors that must be earned to stand on it: its own where it is gated or sealed, and every
   * ancestor's. Empty for ground the player reaches unimpeded. */
  doors: string[]
  hidden: boolean
  /** The floor key its gate wants, where it has an unauthored floor-key gate. */
  keyNodeId?: string
  /** The colours of the keys its end room hands out — empty where it hosts none. */
  keyHostColors: KeyColor[]
}

/** The doors shutting a chain off from the way in: its parent's, plus its own where it has one. */
const doorsShutting = (
  section: SideSection | SubSection,
  positional: string,
  inherited: readonly string[]
): string[] => (section.gate || section.sealed ? [...inherited, positional] : [...inherited])

export const assembleFloor = (
  siteId: string,
  authoredConfig: FloorConfig,
  seed: number,
  resolveEncounter: ResolveEncounter = defaultResolveEncounter,
  keyRequirements: AssembleFloorKeyRequirements = {}
): AssemblerResult => {
  const {
    resolveKeyRequirements = defaultResolveKeyRequirements,
    floorRef = { journeyId: siteId, floorIndex: 0 },
    resolveBoardIndex,
  } = keyRequirements
  // Before anything is carved: two sections a save could not tell apart is a data-loss bug, not a
  // layout one, so it fails the floor loudly here rather than quietly sharing one player's progress
  // between two places. `yarn generate-world` and the floor sweep both build every floor, so an
  // authored label that collides cannot reach a player.
  const addresses = sectionAddresses(authoredConfig)
  if (!addresses.ok) {
    return { success: false, reasons: [{ type: "unusableSectionAddress", address: addresses.duplicate }] }
  }

  // A section hung below the two levels the carve builds would be authored, serialized and then never
  // exist — the gate, the reward and the rooms on it all quietly absent from the floor a player walks.
  // How deep a config goes is fixed before a seed is chosen, so it is refused by name here rather than
  // dropped, the same way a misnamed one-way is.
  const tooDeep = sectionsTooDeep(authoredConfig, addresses.of)
  if (tooDeep.length > 0) {
    return { success: false, reasons: tooDeep.map(address => ({ type: "sectionTooDeep" as const, address })) }
  }

  // A LAYOUT IS FIXED BY THE CONFIG, NOT BY THE SEED, so a broken one is refused once here rather
  // than blamed on sixty carves that could never have satisfied it either. Ordered so each check can
  // trust what the one before it established: names are unique before connections are resolved
  // against them, and both hold before the walk that finds what nothing reaches.
  const regionLayout = authoredConfig.regionLayout
  if (regionLayout) {
    const declared = new Set<string>()
    const repeated = new Set<string>()
    for (const { name } of regionLayout.regions) {
      if (declared.has(name)) repeated.add(name)
      declared.add(name)
    }
    if (repeated.size > 0)
      return {
        success: false,
        reasons: [...repeated].map(name => ({ type: "regionNameRepeated" as const, name })),
      }
    const undeclaredEnds = new Set<string>()
    for (const [from, to] of regionLayout.connections)
      for (const end of [from, to]) if (!declared.has(end)) undeclaredEnds.add(end)
    if (undeclaredEnds.size > 0)
      return {
        success: false,
        reasons: [...undeclaredEnds].map(name => ({ type: "connectionNamesNoRegion" as const, name })),
      }
    const badPorts = (["in", "out"] as const)
      .filter(port => !declared.has(regionLayout[port]))
      .map(port => ({ type: "portNamesNoRegion" as const, port, name: regionLayout[port] }))
    if (badPorts.length > 0) return { success: false, reasons: badPorts }
    const stranded = strandedRegions(regionLayout)
    if (stranded.length > 0)
      return { success: false, reasons: stranded.map(name => ({ type: "regionUnreachable" as const, name })) }
  }

  // REFUSED BEFORE A WALL IS CARVED, like the region checks above and for the same reason: which
  // regions exist, what joins them and which route the main path threads are all fixed by the config,
  // so a misnamed id is answered once here rather than blamed on sixty carves that could never have
  // satisfied it.
  const topologyProblems = topologyFaults(regionLayout, authoredConfig.obstacles ?? [], authoredConfig.controls ?? [])
  if (topologyProblems.length > 0) return { success: false, reasons: topologyProblems }

  // An authored one-way naming a section this floor does not have is the same kind of mistake: which
  // sections exist is fixed by the config, not by the seed, so a misnamed end is refused once here
  // rather than blamed on sixty carves that could never have satisfied it either. The region-addressed
  // form (`obstacles`, kind "oneWay") is validated the same way, just against regions instead of
  // sections — `topologyProblems` above already covers it.
  const knownSectionAddresses = new Set<string>([MAIN_SECTION_ADDRESS, ...addresses.of.values()])
  const unusableOneWays = (authoredConfig.oneWays ?? []).filter(
    oneWay => !knownSectionAddresses.has(oneWay.from) || !knownSectionAddresses.has(oneWay.to)
  )
  if (unusableOneWays.length > 0) {
    return {
      success: false,
      reasons: unusableOneWays.map(({ from, to }) => ({ type: "oneWayUnsatisfied" as const, from, to })),
    }
  }

  // A HANDLE'S REACH IS AUTHORED, SO WHAT IT CANNOT REACH IS ANSWERED BEFORE A WALL IS CARVED — the
  // same reasoning, and the same shape, as the one-way above: which sections exist and what each
  // already carries is fixed by the config, so a lever naming one it cannot have is refused once, by
  // the name that failed.
  const sectionByAddress = new Map<string, SideSection | SubSection>()
  for (const [idx, side] of authoredConfig.sideSections.entries()) {
    sectionByAddress.set(addresses.of.get(`s${idx}`) ?? `s${idx}`, side)
    for (const [subIdx, sub] of (side.sideSections ?? []).entries())
      sectionByAddress.set(addresses.of.get(`s${idx}.${subIdx}`) ?? `s${idx}.${subIdx}`, sub)
  }
  // A GATE IS NAMED BY WHERE THE FLOOR WAS AUTHORED AND THE SECTION IT STANDS ON, NEVER BY THE CARVE.
  // Same reasoning as a switch's `switch:` stem: a position kept from an earlier layout must not come
  // to fit a door it was never thrown for, and an authoring address is what a re-carve cannot move.
  const handleStem = (n: number) =>
    `handle:${floorRef.journeyId}#${floorRef.levelIndex ?? 0}#${floorRef.floorIndex}#${n}`
  // AN OBSTACLE'S KEY IS NAMED THE SAME WAY: where the floor was AUTHORED plus the obstacle's own
  // AUTHORED id — neither of which a re-carve can move, so a saved lever position cannot come to fit
  // a door it was never thrown for.
  const gateKeyOf = (id: string) =>
    `obstacle:${floorRef.journeyId}#${floorRef.levelIndex ?? 0}#${floorRef.floorIndex}:${id}`
  // THE SHAPE BOTH AUTHORING PATHS COMPILE THROUGH: a handle is the two-state case of a control, so
  // the same four fields drive the same compile step whichever wrote them — `id` and `in` are a
  // control's own, not this compile step's business.
  type Mechanism = Pick<Control, "states" | "initial" | "returnsToInitial" | "opens">
  // ONE MECHANISM-BUILDING PATH: `opens` names obstacles by id; `resolveGateKey` says what gate key
  // each id mints — a control mints one from the obstacle's own authored id (`gateKeyOf`), a handle
  // already knows each driven section's key and hands it back verbatim. Iterates `states`, not
  // `Object.entries(opens)`, so compiled order follows what the author declared.
  const compileMechanism = (mechanism: Mechanism, resolveGateKey: (obstacleId: string) => string): MechanismRecord => ({
    states: mechanism.states,
    initial: mechanism.initial,
    returnsToInitial: mechanism.returnsToInitial,
    positions: mechanism.states.flatMap(state =>
      (mechanism.opens[state] ?? []).map(id => ({ state, gateKeyId: resolveGateKey(id) }))
    ),
  })
  // The id a stairhead here takes when the authoring named none — the floor's own address plus where
  // on it the stairs stand, built by the one constructor world generation also mints ids with, so a
  // floor assembled from an unnamed stairhead lands on the same id the spec would have given it.
  const stairOnThisFloor = (path: string) =>
    stairIdAt({
      journeyId: floorRef.journeyId,
      pyramidIndex: floorRef.levelIndex ?? 0,
      floorIndex: floorRef.floorIndex,
      path,
    })
  const handleGateKeyByAddress = new Map<string, string>()
  const leverByAddress = new Map<string, MechanismRecord>()
  // THE PAIR BOTH ENDS WEAR, by the gate key that already names one end: a mechanism's room is found
  // again through the keys its own positions carry, so nothing has to re-derive which section or region
  // a mark is for. Populated here for handles and below (after `controlRecords`) for controls — one map,
  // read by the single pass over the finished grid that paints marks onto both ends (near the end of
  // this function).
  const markByGateKey = new Map<string, Mark>()
  for (const [n, handle] of (authoredConfig.handles ?? []).entries()) {
    const refuse = (address: string): AssemblerFailure => ({
      success: false,
      reasons: [{ type: "handleUnsatisfied", handle: n, address }],
    })
    // Two levers in one section would answer to the same name in a save (cellSlot.ts), which is the
    // data-loss bug the address checks above exist for. A lever naming no section on either side is
    // refused by the same name: it drives nothing, so it is a room the player taps with no door on the
    // end of it, and an authoring typo should say so here rather than reach the world as a floor.
    if (
      !knownSectionAddresses.has(handle.in) ||
      leverByAddress.has(handle.in) ||
      handle.left.length + handle.right.length === 0
    )
      return refuse(handle.in)
    // A HANDLE IS THE TWO-STATE CASE OF A CONTROL: what it drives becomes `opens`, keyed by side and
    // naming the driven section's own address, so the same compile step a control goes through mints
    // its mechanism record below. BOTH SIDES ARE READ THE SAME WAY AND INTO THE SAME INDEX, which is
    // what makes a section named on both sides refuse itself: the second naming finds the first one's
    // gate already written, exactly as a second handle driving it would. Such a door is one the lever
    // could neither open nor close.
    const opens: Record<string, string[]> = {}
    for (const side of HANDLE_SIDES) {
      opens[side] = []
      for (const driven of handle[side]) {
        // The main path has no entrance to gate; the lever's own section would shut the lever in behind
        // the door it opens; and a section already gated — by an author or by another handle — would
        // lose one of the two doors without saying so.
        if (
          !sectionByAddress.has(driven) ||
          driven === handle.in ||
          sectionByAddress.get(driven)?.gate !== undefined ||
          handleGateKeyByAddress.has(driven)
        )
          return refuse(driven)
        const gateKeyId = `${handleStem(n)}:${driven}`
        handleGateKeyByAddress.set(driven, gateKeyId)
        markByGateKey.set(gateKeyId, markFor(n))
        opens[side].push(driven)
      }
    }
    // A LEVER DECLARES BOTH SIDES WHATEVER IT DRIVES, so the walk knows a door can be shut again even
    // where the far side names no gate of its own. It hangs on `starts` before anyone touches it — so
    // those gates stand open on arrival without the carve having to place an already-open door
    // (mechanismDoors.ts reads `initial` for exactly that) — and can always be thrown back. The gate
    // key each driven section mints is already known (`handleGateKeyByAddress`, above), so the resolver
    // hands it back rather than minting one the way a control's own obstacle id does.
    leverByAddress.set(
      handle.in,
      compileMechanism(
        { states: [...HANDLE_SIDES], initial: handle.starts ?? HANDLE_SIDES[0], returnsToInitial: true, opens },
        driven => handleGateKeyByAddress.get(driven)!
      )
    )
  }

  // A CONTROL IS COMPILED INTO THE RECORD THE WALK ALREADY EATS, the same step a handle desugars
  // through above. `opens` names obstacles by their authored ids; `positions` names the gate keys
  // those ids mint, one entry per obstacle per state that opens it — several entries may share a
  // state, which is what lets one position open a set.
  const controlRecords = (authoredConfig.controls ?? []).map(control => ({
    control,
    record: compileMechanism(control, gateKeyOf),
  }))
  // A CONTROL AND EVERY OBSTACLE IT OPENS WEAR ONE MARK, so the map reads "this lever, these doors" as
  // one pair the same way a handle's does — derived from the AUTHORED obstacle id(s) it drives, sorted
  // and joined so the seed is the same regardless of `opens`' state order, and stable across a re-carve
  // (never from `controlRecords`' own ORDINAL: an ordinal is the defect a handle's mark still has, see
  // `markFor(n)` above — inserting a control must not reshuffle every glyph after it). A control that
  // opens nothing in any state names no obstacle to pair with, so it gets no mark.
  for (const { control, record } of controlRecords) {
    const drivenIds = [...new Set(Object.values(control.opens).flat())].sort()
    if (drivenIds.length === 0) continue
    const mark = markFor(hashString(drivenIds.join("|")))
    for (const { gateKeyId } of record.positions) markByGateKey.set(gateKeyId, mark)
  }

  // From here the floor is read with the handles' gates already on it, so every pass that sizes a
  // chain, isolates a section or writes a gate room meets one gate rule rather than two.
  const config =
    handleGateKeyByAddress.size > 0
      ? withHandleGates(authoredConfig, addresses.of, handleGateKeyByAddress)
      : authoredConfig

  // Which chains carry a lever, by the positional key the sizing passes below have to hand. A lever
  // stands in a room of its own — it is not the k-th puzzle of the chain and takes no content slot —
  // so a chain holding one is carved a room longer.
  const leverAtPositional = new Set<string>()
  for (const [positional, address] of addresses.of) if (leverByAddress.has(address)) leverAtPositional.add(positional)
  if (leverByAddress.has(MAIN_SECTION_ADDRESS)) leverAtPositional.add(MAIN_SECTION_ADDRESS)
  const leverRooms = (positional: string): number => (leverAtPositional.has(positional) ? 1 : 0)

  // WHOSE GATE THIS IS DECIDES WHETHER ANYTHING STANDS IN IT. `openWaysOut` (useAssembledFloor) gives a
  // cell back its corridor only where NOTHING stands in it — a gate a family renders is opened by what
  // the player does in it — so a family on a lever's door would leave the lever unable ever to open it.
  // A switch's own doors carry none for the same reason (see closeWaysOut).
  const isHandleGate = (positional: string): boolean => {
    const address = addresses.of.get(positional)
    return address !== undefined && handleGateKeyByAddress.has(address)
  }

  // Every room a chain has to hold: its own content, its terminal room, its gate where it has one, and
  // the lever where one stands in it.
  const chainRooms = (section: SideSection | SubSection, positional: string): number =>
    section.pathPuzzles + 1 + (section.gate ? 1 : 0) + leverRooms(positional)

  // THE LEVER'S ROOM SAYS WHICH DOOR EACH POSITION OPENS, AND THE SAVE SAYS ONLY WHICH POSITION IT IS
  // IN (mechanismDoors.ts). Keeping the mapping on the floor is what lets a re-carve move a door
  // without a position kept from an earlier layout coming to fit one it was never thrown for. It takes
  // no `pathIndex`: it is not the k-th room of its chain, so a save names it by what fills it, the way
  // a section's chest or gate is named (cellSlot.ts).
  const leverSpec = (positional: string) => ({
    roomType: "encounter" as const,
    family: HANDLE_FAMILY,
    tags: [HANDLE_FAMILY],
    mechanism: leverByAddress.get(addresses.of.get(positional) ?? positional)!,
    // The handle's own authored address — the same name `leverByAddress` is keyed by — carried onto
    // the cell so `cellSlot.ts` names every mechanism's room by its authored identity uniformly,
    // rather than by family alone (see RoomCell.mechanismId).
    mechanismId: addresses.of.get(positional) ?? positional,
  })

  const treasureChest = resolveEncounter("treasure-chest", "treasure-chest")
  const fezShop = resolveEncounter("fez-shop", "fez-shop")
  const keyGate = resolveEncounter("key-gate", "key-gate")

  // How many junctions this floor reserves for something to stand in, and how wide each has to be.
  // Widest demand first, so a wide one is never left with only a narrow junction to take.
  const forkDemands = (config.forks ?? [])
    .flatMap(f => Array.from({ length: f.count }, () => f.exits))
    .sort((a, b) => b - a)

  // A SWITCH'S ROOM HAS TO STAY OPEN. It opens one of its ways out and leaves the others shut, and keys
  // accumulate — so a player who spent the choice on a side branch pays for the main path onward with a
  // walk back to the switch, not with the run. A family whose room closes behind the player has no walk
  // back to offer, and leaves them at a door they can never open. Asked here rather than re-carved: no
  // seed changes which family was authored.
  if (config.switches) {
    const switchFamily = resolveEncounter(config.switches.encounter, "puzzle")
    if (!switchFamily.reEnterable)
      return { success: false, reasons: [{ type: "switchFamilyNotReEnterable", family: switchFamily.familyId }] }
    // More switches than there are junctions held for them is a contradiction between the two
    // statements, which no seed can settle — so it is answered before a single wall is carved.
    if (config.switches.min > forkDemands.length)
      return {
        success: false,
        reasons: [{ type: "switchesExceedForks", min: config.switches.min, forks: forkDemands.length }],
      }
  }

  // Hidden sections are included in maze generation (tagged hidden:true on cells) but masked by
  // useAssembledFloor — so they are carved, but they are not asked to host a key.
  const sideSections: SideSection[] = owesAKeyHost(config.sideSections.filter(s => !s.hidden))
    ? [...config.sideSections, GROWN_KEY_HOST]
    : config.sideSections
  const { gatedIdxs: gatedFloorKeyIdxs, ungatedIdxs } = keyHostIdxs(sideSections)

  // The auto-injection above guarantees a free host whenever one's needed — this is a
  // structural safety net, not an expected path: if a floor-key gate still has nowhere to
  // put its key, that's an unsolvable floor, not a per-seed maze fluke, so it fails
  // immediately rather than burning every retry attempt on something a different seed can't fix.
  if (gatedFloorKeyIdxs.length > 0 && ungatedIdxs.length === 0) {
    return { success: false, reasons: [{ type: "noUngatedSectionForKey" }] }
  }

  // A TOPOLOGY GATE AT A CHAIN'S OWN MOUTH AND A SECTION'S OWN `gate` BOTH CLAIM `cells[0]` — checked
  // here because which side section a chain matches to (offRouteChains groups off-route regions in
  // declaration order, the Nth chain to the Nth authored side section) and which obstacle stands on a
  // chain's mouth connection are both fixed by the config alone, never by the seed: a mouth obstacle's
  // seam is always the chain's first hosted region (`regionOfStep` always seats the first-declared
  // region from the front), so it always resolves to `cellIndex === 0`, the same cell a floor-key or
  // tomb-key gate always claims. Refused by name rather than made to work by shifting one vocabulary
  // around the other — a side section that hosts an off-route chain and ALSO authors its own gate is
  // asking two authoring surfaces to run the same cell, and the two must stay genuinely independent
  // rather than merely non-colliding by luck.
  if (regionLayout) {
    const mouthGateCollisions = offRouteChains(regionLayout).flatMap((chain, i) => {
      if (i >= config.sideSections.length || !config.sideSections[i].gate) return []
      // A ONE-WAY NEVER COLLIDES HERE: it mints no gate room and claims no cell of its own, so only a
      // GATE at the mouth is the collision this check exists for.
      const mouthObstacle = (authoredConfig.obstacles ?? [])
        .filter(o => o.kind === "gate")
        .find(o => {
          const [a, b] = o.at.between
          return (a === chain.mouth && b === chain.regions[0]) || (b === chain.mouth && a === chain.regions[0])
        })
      return mouthObstacle ? [{ address: `s${i}`, obstacleId: mouthObstacle.id }] : []
    })
    if (mouthGateCollisions.length > 0) {
      return {
        success: false,
        reasons: mouthGateCollisions.map(({ address, obstacleId }) => ({
          type: "chainGateCollidesWithSectionGate" as const,
          address,
          obstacleId,
        })),
      }
    }
  }

  // A GATE OR A CONTROL ROOM IS NOT SIZED IN HERE — deliberately. Both are owned by the topology mod
  // (FloorConfig.obstacles/controls) and dropped along with it when that mod is off, so a term for
  // either in the path's minimum length would make the maze walk a different distance with the mod on
  // than with it off: the whole floor would re-carve, not just lose a mod's furniture. A gate or
  // control room instead occupies a node the path already has — the same one content would otherwise
  // use (see `placedContent`'s forward-shift and `controlNotSeated`/`obstacleSeamNotCarved` below) —
  // so toggling the mod off is identical BY CONSTRUCTION: the maze never sees it existed
  // (docs/game-design/regions-and-containers.md, "the identical walls carve with every connection
  // open").

  // Minimum node count for the main path alone (entrance, its own content, goal, exit) —
  // kept separate from `minCells` below (which folds in every side-section's cost too) so
  // `packing`'s path-length target scales with what the *main path itself* needs, not with
  // how much unrelated side-section content happens to branch off it elsewhere.
  const mainPathCells =
    1 /* entrance */ + config.pathPuzzles + 1 /* goal */ + 1 /* exit/stairhead */ + leverRooms(MAIN_SECTION_ADDRESS)

  // Minimum node count needed (real path nodes only — the connector cell between two
  // adjacent nodes lives at a separate, non-node grid position, see NODE_STEP above).
  const minCells =
    mainPathCells +
    sideSections.reduce((sum, sec, idx) => {
      const secCells = chainRooms(sec, `s${idx}`)
      const subCells = (sec.sideSections ?? []).reduce(
        (s2, sub, subIdx) => s2 + chainRooms(sub, `s${idx}.${subIdx}`),
        0
      )
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
  const distanceFor = (p: number) => Math.max(1, Math.round(mainPathCells * (1 + 5 * p)))
  // The authored wish is where the retry STARTS, not what it is held to: see the widening in the loop.
  let packing = config.packing ?? DEFAULT_PACKING
  let targetDistance = distanceFor(packing)

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
    sideSections.reduce((sum, sec, idx) => {
      const secCells = paddedChainLength(chainRooms(sec, `s${idx}`))
      const subCells = (sec.sideSections ?? []).reduce(
        (s2, sub, subIdx) => s2 + paddedChainLength(chainRooms(sub, `s${idx}.${subIdx}`)),
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
  let startingN = deriveN(minCells)
  let N = startingN

  const nid = (r: number, c: number) => `${siteId}-${r}-${c}`

  // Attempts 0..RECOVERY_ATTEMPT-1 are FROZEN. A pyramid interior is persistent and revisitable, its
  // stored exploredSections keyed to its layout, so re-sizing a floor that already assembles would
  // silently invalidate progress on it.
  //
  // Only a floor that has exhausted the budget — one nobody can enter, so there is no progress to
  // protect — enters recovery. Each attempt then sizes the grid to what the carve needs (`carvedCells`)
  // while winding `chainPacking` from `packing` down to 0, so the last attempt is the most permissive
  // shape this config can take. That is what makes the phase converge rather than reroll the same
  // too-tight puzzle.

  // The closest any attempt came to the junctions `forks` asks for, so the failure can name the
  // shortfall rather than blaming the maze.
  let forkShortfall: { exits: number; count: number; carved: number } | undefined
  // The first drop an attempt could not find room for, kept from the first attempt that came up short,
  // so a floor no attempt ever satisfies says which drop it failed on rather than blaming the maze.
  let oneWayShortfall: { from: string; to: string } | undefined
  // The first attempt's declared regions the main path never reached at all, kept from the first
  // attempt that came up short — `mainPath.length` grows with packing across attempts (see
  // `distanceFor`), so an attempt that cannot seat every region today may not be the attempt that
  // decides the floor, and only the budget's end may call that.
  let unseatedRegions: string[] | undefined
  // The first attempt's obstacles whose seam the path did not produce, kept the same way and for the
  // same reason: the path lengthens across the attempt budget, so what one attempt cannot seat a
  // later one may.
  let gateSeamMissing: string[] | undefined
  // The first attempt's controls no node stood in their region at all — main path or chain, whichever
  // hosts it — kept the same way and for the same reason: `mainPath.length` and a chain's own length
  // both grow across the attempt budget.
  let controlNotSeated: string[] | undefined
  // The first attempt's controls whose only candidate node already held a puzzle with no room to move
  // it, kept the same way — see the seating searches below (main path and chain alike).
  let controlPuzzleUndisplaceable: string[] | undefined
  // The first attempt's rooms standing where their region's appetite refuses them, kept the same way.
  let regionMismatch: { region: string; kind: ContentKind }[] | undefined
  // Labeled so a gate reserved deep inside a chain's own content loop (below) can retry the WHOLE
  // attempt the same way every other shortfall here does, rather than only skipping the rest of one
  // chain's own content.
  attempt: for (let attempt = 0; attempt < ASSEMBLY_ATTEMPTS; attempt++) {
    if (attempt >= RECOVERY_ATTEMPT) {
      // Recovery asks for the roomiest wish outright. Winding the CHAINS down is its lever, and on a
      // floor already carved as tight as it goes there is nothing left to wind: without this, a tight
      // floor spends the whole phase re-rolling the same starved shape.
      if (packing < PACKING_CEILING) {
        packing = PACKING_CEILING
        targetDistance = distanceFor(packing)
      }
      const steps = Math.max(1, ASSEMBLY_ATTEMPTS - RECOVERY_ATTEMPT - 1)
      chainPacking = (packing * (steps - (attempt - RECOVERY_ATTEMPT))) / steps
      N = Math.max(startingN, deriveN(carvedCells()))
    } else if (attempt > 0 && attempt % ATTEMPTS_PER_RUNG === 0) {
      // Growing the grid cannot rescue a floor starved by its own packing: the main path is carved to
      // `targetDistance` however much room surrounds it, so branches that have nowhere to hang still
      // have nowhere to hang. Widening the wish is the lever that moves, and the grid follows it
      // through `deriveN` — up to the ceiling, past which the grid is the lever again.
      if (attempt % ATTEMPTS_PER_WIDEN === 0 && packing < PACKING_CEILING) {
        packing = Math.min(packing * PACKING_WIDEN, PACKING_CEILING)
        targetDistance = distanceFor(packing)
        chainPacking = packing
        startingN = Math.max(N, deriveN(minCells))
        N = startingN
      } else N += 2
    }

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

    // WHICH REGION EACH CELL STANDS IN, where the floor authors one — absent everywhere on a floor
    // that does not, so the shipped world (no floor authors a regionLayout) carves unchanged. A
    // main-path cell takes its region from its step along the route; a chain hosting no off-route
    // component takes the region of the cell it grows from; a chain matched to one (below) takes that
    // component's own regions instead. Computed ahead of content placement: the gate cells below have
    // to be known before content claims a node.
    const route = regionLayout ? regionRoute(regionLayout) : []
    const stepRegion = regionLayout ? regionOfStep(route, mainPath.length) : []
    // A ROUTE LONGER THAN THE PATH SEATS NOTHING AT ITS FAR END — `regionOfStep` deals what there is
    // rather than refusing (it has no floor in front of it; only a carve knows how many steps the main
    // path has). Checked against the route's own regions only: a region the route never threads at all
    // is not this cause's business (a side path seats those, below) and must not retry a longer main
    // path forever waiting for a route it is never on.
    const onRouteSet = new Set(route)
    const unseated = regionLayout
      ? regionLayout.regions.map(r => r.name).filter(name => onRouteSet.has(name) && !stepRegion.includes(name))
      : []
    if (unseated.length > 0) {
      if (!unseatedRegions) unseatedRegions = unseated
      continue
    }
    // A REGION THE ROUTE NEVER THREADS SEATS ON A SIDE PATH INSTEAD — matched to a top-level side
    // section deterministically by CONFIG order (offRouteChains groups off-route regions in
    // declaration order, and the Nth chain takes the Nth authored side section), never by which cell
    // the carve happens to attach a branch near: `sectionOrder` below only shuffles WHERE a branch
    // attaches, and a layout must group the same way regardless. More chains than the floor authors
    // side sections for leaves the excess unmatched here; that shows up as a genuinely unseated region
    // once the carve is finished (below), not as a fault raised on the config alone, because a wider
    // retry can still grow the floor a side section it did not have room for at attempt 0.
    const sideChains = regionLayout ? offRouteChains(regionLayout) : []
    const chainRegionsBySectionIdx = new Map<number, SideChain>()
    sideChains.forEach((chain, i) => {
      if (i < config.sideSections.length) chainRegionsBySectionIdx.set(i, chain)
    })
    // WHERE ONE REGION STOPS AND THE NEXT BEGINS. The route threads the regions in order, so a
    // connection on it is the seam between two consecutive stretches and the first cell of the far
    // stretch is the one the player has to walk into — which is where the bars belong. The lookup
    // itself is `seamIndexFor` (obstacles.ts): a pure question about `stepRegion` that is tested on
    // its own.
    //
    // ONLY A MAIN-PATH OBSTACLE ANSWERS HERE — one whose two regions are both on the route, so
    // `stepRegion` (known this early, before a single side-path cell exists) is the right question to
    // ask it. An obstacle touching an off-route region seats on the CHAIN it belongs to instead, which
    // exists only once that chain's own cells are carved (below, alongside `cellRegion`) —
    // `topologyFaults` has already proven every obstacle seats SOMEWHERE, so failing this test only
    // ever means "ask the other question," never a genuine fault.
    //
    // GATES ONLY: a one-way obstacle seats through its own, entirely different search (below, "ONE-WAY
    // DROPS") — its two regions need not touch at all, so neither `stepRegion`'s seam nor a chain's
    // own seam is the question to ask it.
    const gateObstacles = (authoredConfig.obstacles ?? []).filter(o => o.kind === "gate")
    const onRouteObstacle = (o: Obstacle) => onRouteSet.has(o.at.between[0]) && onRouteSet.has(o.at.between[1])
    const mainPathObstacles = gateObstacles.filter(onRouteObstacle)
    const offRouteObstacles = gateObstacles.filter(o => !onRouteObstacle(o))
    // A CONTROL STANDING IN AN OFF-ROUTE REGION splits the same way: `stepRegion` never names its
    // region, so the main-path search below (which asks only `stepRegion`) would find it no candidate
    // ever, attempt after attempt, before a single side-path cell exists. Held out here and asked
    // again once its own chain's cells are carved (alongside that chain's own content, further down) —
    // the identical reasoning `mainPathObstacles`/`offRouteObstacles` splits on just above.
    const mainPathControls = controlRecords.filter(({ control }) => onRouteSet.has(control.in))
    const offRouteControls = controlRecords.filter(({ control }) => !onRouteSet.has(control.in))
    const gateIndexByObstacle = new Map<string, number>()
    for (const obstacle of mainPathObstacles) {
      const seam = seamIndexFor(stepRegion, obstacle.at.between)
      if (seam !== undefined) gateIndexByObstacle.set(obstacle.id, seam)
    }
    // A seam the carve did not produce. `regionOfStep` (regions.ts) lays every floor's route out as a
    // gap-free concatenation — a region is either fully seated or, when the path is too short, absent
    // together with every region after it on the route (caught by `unseatedRegions` above, which
    // always `continue`s first) — so with today's carve, a route-adjacent obstacle's two regions are
    // never "both seated but not adjacent": `seamIndexFor` cannot actually return `undefined` here for
    // a genuinely main-path obstacle. Retried rather than refused for the same reason `unseatedRegions`
    // is: `mainPath.length` GROWS across the attempt budget.
    if (gateIndexByObstacle.size < mainPathObstacles.length) {
      if (!gateSeamMissing)
        gateSeamMissing = mainPathObstacles.filter(o => !gateIndexByObstacle.has(o.id)).map(o => o.id)
      continue
    }
    const gateIndices = new Set(gateIndexByObstacle.values())
    // EVERY MAIN-PATH SEAM, GATED OR NOT — read off `stepRegion` alone, which `regionLayout` (core,
    // never dropped by `dropUnownedAuthoring`) fixes the moment `mainPath` does. `gateIndices` above
    // answers "where does an AUTHORED gate stand", which is exactly what must NOT decide content
    // pacing or candidate membership below: the topology mod owns which of these seams carries a
    // gate, but not how many seams the layout has or where they fall, so a reservation keyed off
    // `gateIndices` shrinks and grows with the mod while one keyed off `stepRegion` cannot — the same
    // physical stretch is reserved whether the mod that might gate it is even in the build.
    const regionSeamIndices = new Set<number>()
    for (let step = 1; step < stepRegion.length; step++)
      if (stepRegion[step] !== stepRegion[step - 1]) regionSeamIndices.add(step)
    // WHERE AN OFF-ROUTE OBSTACLE'S OWN SEAM LANDS — filled in once each matched chain's own cells
    // exist (alongside `cellRegion`, below): `{ idx, cellIndex }` names which chain (its top-level
    // `chains` index) and which of that chain's own cells the seam is, mirroring `gateIndexByObstacle`
    // one level down.
    const chainGateIndexByObstacle = new Map<string, { idx: number; cellIndex: number }>()

    // Exit placed at the main path's end, forced to degree-1 below so no corridor passes
    // through it. Content nodes (puzzles/chests + the goal) are spread evenly across the whole main
    // path instead of packed against the entrance — packing them up front left a long
    // bare corridor behind the goal with nothing to do and nowhere to branch. Spreading
    // keeps something to find along the whole walk, and puts the goal last (closest to
    // the exit) so there's no unused tail behind it either.
    const leverOnMain = leverRooms(MAIN_SECTION_ADDRESS) === 1
    // NOT GROWN FOR A CONTROL. A control's room is carved out of a node this count already reserves
    // for the floor's own content — see the control-seeking search below — rather than an extra one
    // added here: the maze must carve the same way whether the topology mod that owns `controls` is
    // registered or not, and a term for it here would size the path (and so the seeded walk's target
    // distance) differently between the two.
    const contentCount = config.pathPuzzles + 1 /* goal */ + leverRooms(MAIN_SECTION_ADDRESS)
    if (mainPath.length < contentCount + 2) continue // need entrance + content + a distinct exit

    const contentIndices = spreadContentIndices(contentCount, 1, mainPath.length)
    // A GATE ROOM AND A PUZZLE CANNOT BOTH STAND IN ONE CELL, and it is the content that moves: a
    // seam is where the regions actually change, while content is spread for rhythm and one node
    // either way is the kind of thing the carve already decides. Forward to the next free node, so
    // one layout always places the same way. `spreadContentIndices` deals in mainPath-array indices
    // (one real node apart — see NODE_STEP's own contrast with the grid lattice), the same space
    // `regionSeamIndices` is built in, so the step here is 1, not 2.
    //
    // `regionSeamIndices`, NOT `gateIndices` — every seam forwards content past it, gated or not, so
    // `goalIndex` below lands on the identical node whether or not the topology mod (and so any
    // obstacle) is in the build. Skipping only actual gate cells would let `goalIndex` drift outward
    // exactly by however many gates fall before it, which is mod-owned by construction: two builds
    // that agree on `regionLayout` but disagree on `obstacles` would then disagree on where the main
    // zone ends (see `mainZoneCandidates` below), which is the identity bug this line exists to avoid.
    const placedContent: number[] = []
    for (const wanted of contentIndices) {
      let index = wanted
      while (index < mainPath.length - 1 && (regionSeamIndices.has(index) || placedContent.includes(index))) index += 1
      if (index >= mainPath.length - 1) break
      placedContent.push(index)
    }
    // The path had no free node left for every piece of content. Retried rather than refused: the
    // path lengthens across the attempt budget.
    if (placedContent.length < contentCount) continue

    const goalIndex = placedContent[placedContent.length - 1]
    // A lever the main path holds takes the first content node: it opens what lies further on, so the
    // walk has to reach it before the doors it owns are worth reaching.
    const leverIndex = leverOnMain ? placedContent[0] : -1

    // EACH PUZZLE'S AUTHORED ORDINAL — 0-based, in path order — ASSIGNED ONCE, HERE, before a control
    // gets any chance to move one of these nodes. `k` is this ordinal's home from here on: it indexes
    // `config.rewards[k]`/`config.encountersByIndex[k]` below and is handed to `resolveKeyRequirements`
    // as `pathIndex`, and the room built from it carries `pathIndex: k` onward into its own save address
    // (`p${k}`, cellSlot.ts) — the key loot, solve state and explored-cell tracking all file under. A
    // puzzle keeps its ordinal wherever its physical node ends up: the control-seating search below MOVES
    // an entry of this map when it displaces a puzzle's node, and never rebuilds the map from array
    // position afterward — rebuilding from position is exactly what would renumber every puzzle after the
    // one a control displaced, sliding each one's reward, encounter override and save slot onto a
    // different room even though nothing about THAT room's own content changed.
    const puzzleRole = new Map<number, number>()
    placedContent.slice(leverOnMain ? 1 : 0, -1).forEach((idx, k) => puzzleRole.set(idx, k))

    // A CONTROL STANDS IN A REGION, so its room is A NODE OF THAT STRETCH — any main-path node, not only
    // a content-designated one, because content is spread for rhythm and is not guaranteed to put a node
    // in every region (a short early region can go unspread-into entirely — measured), while `unseated`
    // above already guarantees every declared region at least ONE step. Searching the whole path rather
    // than the narrower content set is what makes a control seatable on the SAME attempt core's own
    // content already succeeds on, whether or not the topology mod that owns it is even registered — the
    // mod must not cost this floor an extra retry the mod-off build never has to pay
    // (docs/game-design/regions-and-containers.md's toggle-off gate).
    //
    // ONLY `mainPathControls` IS SOUGHT HERE — a control hosted by an off-route region is sought within
    // its own chain instead, below, the same split `mainPathObstacles`/`offRouteObstacles` makes above.
    //
    // A FREE NODE IS PREFERRED OVER A CONTENT ONE: `placedContent` is the puzzles this floor already
    // authored, each already holding its own AUTHORED ORDINAL in `puzzleRole` above. Seating a control
    // directly on one of those nodes would either carve the puzzle out from under it with nothing
    // reported, or — filtering it back out downstream instead — renumber every puzzle after it, sliding
    // each one's reward, encounter override and save slot onto a different room. Both are the "decide
    // quietly" the governing rule of this whole area forbids. So a content node is only taken once the
    // region's free nodes are exhausted, and taking one DISPLACES the puzzle it held forward to the next
    // free node — moving its `puzzleRole` entry to the new node rather than dropping or renumbering it,
    // so the puzzle keeps its ordinal wherever it ends up — using the same forward-shift `placedContent`'s
    // own build above uses. Never past the goal — content only ever stands before it (the pacing
    // `spreadContentIndices` was chosen for), so the shift's ceiling is `goalIndex`, not the path's end.
    //
    // Excludes the entrance (index 0, a portal room) and the exit (the last index, forced to degree-1
    // below), and `leverIndex` alongside the goal: that node already carries the main-path HANDLE's room
    // (a different mechanism from a different authoring vocabulary), and the room-spec write-up below
    // tests `mi === leverIndex` first — a control landing there would compile successfully and then be
    // silently dropped from the grid, a door nothing ever reports as unseated.
    const controlIndexById = new Map<string, number>()
    const takenByControl = new Set<number>()
    // A control that reached the content-fallback search at all, whether or not it found room to
    // displace what it found there — read below to tell "no candidate at all" apart from "a candidate
    // stood, but nothing had room for the puzzle it held".
    const sawContentCandidate = new Set<string>()
    for (const { control } of mainPathControls) {
      const inRegion = (mi: number) =>
        stepRegion[mi] === control.in &&
        !takenByControl.has(mi) &&
        mi !== goalIndex &&
        mi !== leverIndex &&
        !gateIndices.has(mi)

      let index: number | undefined
      for (let mi = 1; mi < mainPath.length - 1; mi++) {
        if (inRegion(mi) && !placedContent.includes(mi)) {
          index = mi
          break
        }
      }

      if (index === undefined) {
        for (let mi = 1; mi < mainPath.length - 1; mi++) {
          if (!inRegion(mi) || !placedContent.includes(mi)) continue
          sawContentCandidate.add(control.id)
          let shifted = mi + 1
          while (
            shifted < goalIndex &&
            (gateIndices.has(shifted) || placedContent.includes(shifted) || takenByControl.has(shifted))
          )
            shifted += 1
          if (shifted >= goalIndex) continue // nowhere to move this one — try the region's next content node
          placedContent[placedContent.indexOf(mi)] = shifted
          // The puzzle's ORDINAL moves with it, never recomputed from where it lands: `mi` was one
          // of `puzzleRole`'s own keys (every non-lever, non-goal member of `placedContent` is), so this
          // is a move, not an insert — the same puzzle now answers at `shifted` under the same `k`.
          puzzleRole.set(shifted, puzzleRole.get(mi)!)
          puzzleRole.delete(mi)
          index = mi
          break
        }
      }

      if (index === undefined) continue
      controlIndexById.set(control.id, index)
      takenByControl.add(index)
    }
    // Two different shortfalls, reported apart because they call for different fixes. A control this
    // attempt gave NO candidate node to at all — unreachable once `unseated` above has passed for a
    // route-adjacent connection (same reasoning `gateSeamMissing`'s own comment gives) — is
    // `controlNotSeated`, and a wider path (packing widens at 8/16/24) is what rescues it. A control
    // whose only candidate already held a puzzle with nowhere to move it is `controlPuzzleUndisplaceable`
    // instead: a wider path helps this one too (more room past the candidate to shift into), so it is
    // retried the same way, just named for what actually went wrong. Both retried rather than refused,
    // for the reason slice 4 measured: `mainPath.length` GROWS across the attempt budget.
    if (controlIndexById.size < mainPathControls.length) {
      const stillUnseated = mainPathControls.filter(({ control }) => !controlIndexById.has(control.id))
      const bare = stillUnseated.filter(({ control }) => !sawContentCandidate.has(control.id))
      const displaceable = stillUnseated.filter(({ control }) => sawContentCandidate.has(control.id))
      if (bare.length > 0 && !controlNotSeated) controlNotSeated = bare.map(({ control }) => control.id)
      if (displaceable.length > 0 && !controlPuzzleUndisplaceable)
        controlPuzzleUndisplaceable = displaceable.map(({ control }) => control.id)
      continue
    }
    const controlAtIndex = new Map(
      controlRecords.map(entry => [controlIndexById.get(entry.control.id)!, entry] as const)
    )

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

    const branchCandidates: Array<[number, number]> = []
    // Cells within the actual puzzle-bearing stretch of the main path (before the goal),
    // in path order — kept separate so fork placement can prefer interleaving with main-path
    // puzzles over the unused corridor tail beyond the goal (see bucketing below).
    //
    // A SEAM'S OWN CELL IS EXCLUDED HERE TOO, alongside the goal's — not because a chain could not
    // grow from a gate room (a junction that already holds a main-path room keeps that room, same as a
    // puzzle or the goal, see the fork-fallback below), but because `regionSeamIndices` is what shifts
    // CONTENT forward past it (`placedContent`'s loop above), moving `goalIndex` outward by the width
    // of however many seams fell in content's way — so the same set has to be excluded here too, or the
    // two would disagree about which cells this stretch actually holds.
    //
    // `regionSeamIndices`, NOT `gateIndices` — READ OFF `regionLayout` (core), NEVER OFF `obstacles`
    // (the mod's). This is BY CONSTRUCTION, not by compensation: `regionLayout` is never dropped by
    // `dropUnownedAuthoring`, so `stepRegion` and therefore `regionSeamIndices` are the identical set
    // whether or not the topology mod is even in the build. Scoring draws one `rand()` per candidate
    // below (`scoreCandidates`), and `mainZoneCandidates` is later sliced by contiguous range
    // (`mainZoneSlices`) — so it is not enough for the two builds to exclude the same COUNT of cells,
    // as `gateIndices` alone did (mod on excludes exactly the gated seams; mod off excludes none, but
    // `goalIndex` shrunk to match — same count leaving the loop, different physical cells inside it,
    // which is exactly what let seed-dependent `rand()` draws diverge after the sweep in
    // `toggleOff.spec.ts` measured 24 of 50 seeds disagreeing on a two-obstacle floor). Keying off
    // `regionLayout` instead means the mod's OWN OBSTACLE LIST never reaches this loop at all: there is
    // no count to keep equal, because there is nothing left for the mod to perturb.
    const mainZoneCandidates: Array<[number, number]> = []
    for (let pi = 0; pi < mainPath.length - 1; pi++) {
      const [pr, pc] = mainPath[pi]
      if (rawFreeNeighbors(pr, pc).length === 0) continue
      branchCandidates.push([pr, pc])
      if (pi < goalIndex && !regionSeamIndices.has(pi)) mainZoneCandidates.push([pr, pc])
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
                !passages.has(pkey(pcr, pcc, nr, nc))
            ),
            rand
          )
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
          return { cells, attachedAt: [pcr, pcc] }
        }
      }
      return null
    }

    // Bundle side sections onto shared branch points ("hubs") instead of every section
    // scattering to its own private fork — a floor with many side sections reads as a
    // few significant crossroads rooms rather than many forgettable single junctions.
    // Group size scales with how many sections there are; low counts stay ungrouped
    // (today's behavior, one fork per section).
    const hubGroupSize = sideSections.length >= 5 ? 3 : sideSections.length >= 2 ? 2 : 1
    const sectionOrder = shuffle(
      sideSections.map((_, i) => i),
      rand
    )
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

    outer: for (const [groupIdx, group] of hubGroups.entries()) {
      let hubCell: [number, number] | null = null
      const ownSlice = mainZoneSlices[sliceOrder[groupIdx]]

      for (const si of group) {
        // Try the shared hub first (if this group already has one), then this group's own
        // stretch of the puzzle zone, then any other main-zone spot, then the full corridor
        // (including the tail) as a last resort. Every one of them may be carved into: see
        // rawFreeNeighbors above for why that has to work for the first branch off a spot too,
        // not only subsequent ones.
        const candidateSources: Array<[number, number]> = hubCell
          ? [hubCell, ...ownSlice, ...shuffledMainZoneCandidates, ...shuffledCandidates]
          : [...ownSlice, ...shuffledMainZoneCandidates, ...shuffledCandidates]
        const needed = paddedChainLength(chainRooms(sideSections[si], `s${si}`))
        const attached = attachChain(candidateSources, needed, true)

        if (attached === null) {
          failed = true
          break outer
        }
        sectionGroups.push({ sectionIdx: si, ...attached })
        if (!hubCell) hubCell = attached.attachedAt
      }
    }

    // ── Sub-sections: branch from cells of parent sections ─────────────────
    const subChains: Chain[] = []

    for (const group of sectionGroups) {
      if (failed) break
      const parentSection = sideSections[group.sectionIdx]
      if (!parentSection.sideSections?.length) continue
      const parentDoors = doorsShutting(parentSection, `s${group.sectionIdx}`, [])

      const subSects: SubSection[] = owesAKeyHost(parentSection.sideSections.filter(s => !s.hidden))
        ? [...parentSection.sideSections, GROWN_KEY_HOST]
        : parentSection.sideSections
      const { gatedIdxs: subGatedIdxs, ungatedIdxs: subUngatedIdxs } = keyHostIdxs(subSects)

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
      const subBranchCandidates = shuffle(
        group.cells
          .slice(0, -1)
          .filter(
            ([pr, pc]) =>
              neighbors(pr, pc).some(([ar, ac]) => !usedCells.has(`${ar},${ac}`)) ||
              (attempt >= RECOVERY_ATTEMPT && hasCarveableNeighbor(pr, pc))
          ),
        rand
      )

      const placedSubs: Array<{
        idx: number
        cells: Array<[number, number]>
        attachedAt: [number, number]
      }> = []

      for (let si = 0; si < subSects.length; si++) {
        const subNeeded = paddedChainLength(chainRooms(subSects[si], `s${group.sectionIdx}.${si}`))
        // Carving out of the parent chain is kept to recovery, where the frozen attempts are past
        // and a layout that fits at all is worth a cycle. It is what unstuck that phase: by the time
        // sub-sections are placed, earlier chains have boxed the parent in, and one needing a single
        // free cell would fail the whole attempt with plenty of grid still empty one wall away.
        const attached = attachChain(subBranchCandidates, subNeeded, attempt >= RECOVERY_ATTEMPT)
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
        const keyId = nid(er, ec)
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
    const chain = [...shuffle(gatedTreasureIdxs, rand), ...shuffle(gatedStaircaseIdxs, rand)]

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

    // EVERY CARVED PATH OFF THE MAIN WALK, at both levels, in the order the passes below read them:
    // the paths off the main path first, then the paths off those. What each of them was authored as
    // and what the carve gave it, so nothing downstream asks which level it came from.
    const chains: Chain[] = [
      ...sectionGroups.map((group): Chain => {
        const section = sideSections[group.sectionIdx]
        const positional = `s${group.sectionIdx}`
        // An authored keyId is used verbatim; only an unauthored gate looks up the id the
        // key-host chain above assigned it.
        const authoredKeyId = section.gate?.type === "floor-key" ? section.gate.keyId : undefined
        return {
          section,
          cells: group.cells,
          attachedAt: group.attachedAt,
          positional,
          idx: group.sectionIdx,
          doors: doorsShutting(section, positional, []),
          hidden: Boolean(section.hidden),
          keyNodeId: authoredKeyId ?? keyNodeIdMap.get(group.sectionIdx),
          keyHostColors: chainKeyColorMap.get(group.sectionIdx) ?? [],
        }
      }),
      ...subChains,
    ]

    // Build room cell specs: posKey -> room properties (sectionHash injected separately)
    type RoomSpec = Omit<RoomCell, "type" | "dirs" | "state" | "sectionHash" | "legacySectionHash" | "hidden">
    const roomSpecs = new Map<string, RoomSpec>()
    // A CONTROL'S ROOM, wherever it stands — the main path or a chain, both write the identical
    // shape. The control's own authored id is carried onto the cell for the same reason a handle's
    // room carries its own address (see RoomCell.mechanismId): one uniform rule, not a
    // control-only exception.
    const controlRoomSpec = (control: Control, record: MechanismRecord): RoomSpec => ({
      roomType: "encounter",
      family: resolveEncounter(control.encounter, HANDLE_FAMILY).familyId,
      tags: [HANDLE_FAMILY],
      mechanism: record,
      mechanismId: control.id,
    })
    const cellSectionHash = new Map<string, string>()
    /**
     * WHICH AUTHORED SECTION each cell belongs to — `main`, `s0`, `s0.1`. What the author steers, and
     * so what a save files the cell under: where the builder hangs a sidepath along the main walk, and
     * how much it holds, are both free to change without the sidepath becoming a different place.
     * Addressed exactly as boardIndex.ts addresses chains, because it is the same thing.
     */
    const cellSectionAddress = new Map<string, string>()
    /**
     * WHERE A CELL SITS ALONG ITS SECTION'S WALK — how far in it is, not which cell it is.
     *
     * This is a property of the carve, not of the authoring: the walk's length is `targetDistance`'s
     * choice, so re-carving a floor renumbers everything past the first divergence. A save must not
     * name a cell by it (it names rooms by their authored slot — see cellIdentity.ts). What it is good
     * for is ORDER, which survives: it puts a section's cells in the sequence the player walks them, so
     * the fog can be restored as far as the furthest room they reached.
     */
    const cellOrdinal = new Map<string, string>()
    const cellLegacySectionHash = new Map<string, string>()
    const hiddenCellPositions = new Set<string>()
    // Which section's authored dressing pools a footprint room should draw from — what stands on its
    // floor and what hangs on its wall, both keyed on the cell so a claimed footprint keeps its own
    // section's pools.
    type DressingPools = { props?: DecorationKind[]; wall?: WallDecorationKind[] }
    const cellDressing = new Map<string, DressingPools>()

    const posKey = (r: number, c: number) => `${r},${c}`

    // ── Gate isolation ──────────────────────────────────────────────────────────
    // `passages` spans the entire node lattice, so two used cells that happen to be tree-adjacent read
    // as a real door even though no chain walked that edge. Harmless for plain content; for gated
    // content it is a bypass, since a gate is a section's only legitimate entrance. Traps get the same
    // treatment — a stray door steps past the trap cell for free.
    //
    // `intendedEdgeKeys` holds the edges each chain actually walked; `gatedCellKeys` every cell behind a
    // gate or trap, sub-sections included. A door is allowed if it is intended, or if neither endpoint
    // is gated.
    const gatedCellKeys = new Set<string>()
    // WHICH DOORS MUST BE EARNED TO STAND ON A CELL, not merely whether any must. A one-way drop may
    // run inside what a door shuts off, or out of it, but never into ground shut by a door the cell it
    // falls from does not already stand behind: being past one door earns nothing toward another.
    //
    // One notion covering every door on the floor: the authored gates and traps, written here in the
    // same three places as `gatedCellKeys` by the positional ids `s0`/`s0.1` addresses already use,
    // and the doors a reserved junction's switch mints, added once the carve is settled below.
    const doorsToEnter = new Map<string, Set<string>>()
    const needsDoor = (cellKey: string, door: string) =>
      doorsToEnter.set(cellKey, (doorsToEnter.get(cellKey) ?? new Set()).add(door))
    /** The doors between the way in and a cell — empty for ground the player reaches unimpeded. */
    const standsBehind = (cellKey: string): ReadonlySet<string> => doorsToEnter.get(cellKey) ?? new Set()

    // A SECOND, STRUCTURAL NOTION OF "BEHIND" — populated below (alongside `gatedCellKeys`, once
    // `cellRegion` is settled) from EVERY connection `regionLayout` declares, gated or not, never
    // from `gateObstacles`. `gatedCellKeys`/`doorsToEnter` above answer "has the player earned a REAL
    // key" (oneWay's own check, further down, has to ask exactly that — a drop landing behind an
    // ungated seam has earned nothing and must not trip it). This one answers "do two regions meet
    // ONLY here" — a question `regionLayout` alone can settle, so a stray tree edge that would bridge
    // two regions elsewhere is refused whether or not the topology mod ever gates that seam. Kept
    // apart rather than folded into `doorsToEnter` for that reason: merging them would make an
    // UNGATED seam look, to the oneWay check, like a real door nothing has been earned toward.
    const seamCellKeys = new Set<string>()
    const seamDoorsToEnter = new Map<string, Set<string>>()
    const needsSeamDoor = (cellKey: string, door: string) =>
      seamDoorsToEnter.set(cellKey, (seamDoorsToEnter.get(cellKey) ?? new Set()).add(door))
    const standsBehindSeam = (cellKey: string): ReadonlySet<string> => seamDoorsToEnter.get(cellKey) ?? new Set()
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
    // chain stands behind its own door AND every ancestor's, each written only where it exists:
    // reaching it means going through the parent either way, so a chain with no gate of its own is no
    // further in than its parent is.
    //
    // A chain's doors are named once (`doorsShutting`) because the section hash records exactly
    // whether there are any, so hash and layout cannot drift apart: a floor forgets a run's progress
    // only when its corridors really changed.
    //
    // Every consecutive main-path edge is already `intended` above, so isolating the main path only
    // blocks *extra* leftover edges that would merge a shortcut around a puzzle room.
    const mainIsolated = Boolean(config.sealed)

    if (mainIsolated) {
      for (const [r, c] of mainPath) {
        gatedCellKeys.add(posKey(r, c))
        needsDoor(posKey(r, c), MAIN_SECTION_ADDRESS)
      }
    }
    for (const chain of chains) {
      markChain(chain.attachedAt, chain.cells)
      if (chain.doors.length === 0) continue
      for (const [r, c] of chain.cells) {
        gatedCellKeys.add(posKey(r, c))
        for (const door of chain.doors) needsDoor(posKey(r, c), door)
      }
    }
    const edgeAllowed = (r: number, c: number, nr: number, nc: number): boolean => {
      if (!passages.has(pkey(r, c, nr, nc))) return false
      if (intendedEdgeKeys.has(pkey(r, c, nr, nc))) return true
      const hereKey = posKey(r, c)
      const thereKey = posKey(nr, nc)
      const gateClear =
        (!gatedCellKeys.has(hereKey) && !gatedCellKeys.has(thereKey)) ||
        crossesNoDoor(standsBehind(hereKey), standsBehind(thereKey))
      if (!gateClear) return false
      // STRUCTURAL check, asked whether or not the topology mod gates anything here (see
      // `seamCellKeys` above) — so a stray edge that would bridge two regions gets refused the
      // identical way whether or not an obstacle happens to stand at their one real seam.
      return (
        (!seamCellKeys.has(hereKey) && !seamCellKeys.has(thereKey)) ||
        crossesNoDoor(standsBehindSeam(hereKey), standsBehindSeam(thereKey))
      )
    }

    // Which tier each cell's own section was authored at, so a passage into a pocket of another
    // difficulty is BUILT of that difficulty (docs/game-design/spritesheet-renderer-prep.md — the
    // material is the rank whose tomb this is). Rooms carry it already; corridors did not.
    const cellDifficulty = new Map<string, Difficulty>()
    const mainSectionHash = computeMainSectionHash(config, mainIsolated)
    const legacyMainSectionHash = computeLegacyMainSectionHash(config)
    mainPath.forEach(([r, c], step) => cellOrdinal.set(posKey(r, c), String(step)))
    mainPath.forEach(([r, c]) => cellSectionAddress.set(posKey(r, c), MAIN_SECTION_ADDRESS))
    for (const [r, c] of mainPath) {
      cellSectionHash.set(posKey(r, c), mainSectionHash)
      cellLegacySectionHash.set(posKey(r, c), legacyMainSectionHash)
      cellDressing.set(posKey(r, c), { props: config.decorations, wall: config.wallDecorations })
      cellDifficulty.set(posKey(r, c), config.difficulty)
    }
    const cellRegion = new Map<string, string>()
    mainPath.forEach(([r, c], step) => {
      const region = stepRegion[step]
      if (region !== undefined) cellRegion.set(posKey(r, c), region)
    })
    for (const { section, cells, positional, idx, parentIdx, doors, hidden, attachedAt } of chains) {
      const sHash = computeSideSectionHash(section, idx, doors.length > 0, config, parentIdx)
      const legacyHash = computeLegacySideSectionHash(section, idx, parentIdx)
      const pools: DressingPools = { props: section.decorations, wall: section.wallDecorations }
      const address = addresses.of.get(positional) ?? positional
      cells.forEach(([r, c], step) => cellOrdinal.set(posKey(r, c), String(step)))
      cells.forEach(([r, c]) => cellSectionAddress.set(posKey(r, c), address))
      // A top-level chain matched to an off-route component (chainRegionsBySectionIdx, above) seats
      // that component's OWN regions across its cells — nearest the mouth first — the same way
      // `regionOfStep` deals the main route across the main path; re-using it here is what keeps a
      // chain's region always in the order its component declared, regardless of how many cells the
      // carve gave it. Every other chain keeps today's behaviour: it belongs to the region it grows
      // from, whole.
      const chainRecord = parentIdx === undefined ? chainRegionsBySectionIdx.get(idx) : undefined
      const hostedRegions = chainRecord?.regions
      if (hostedRegions) {
        const perCell = regionOfStep(hostedRegions, cells.length)
        cells.forEach(([r, c], step) => {
          const region = perCell[step]
          if (region !== undefined) cellRegion.set(posKey(r, c), region)
        })
        // AN OFF-ROUTE OBSTACLE SEATS ON THIS CHAIN'S OWN STEP LIST the identical way a main-path one
        // seats on `stepRegion` above — the same `seamIndexFor`, asked of `perCell` instead — prefixed
        // with the chain's own mouth (the on-route region a step of `perCell` never itself carries, a
        // cell being main path or side path but never both) so a gate at the mouth's own boundary asks
        // the same question as one further in. `cellIndex` is one less than the step `seamIndexFor`
        // answers, since the mouth is a virtual step ahead of `cells[0]`.
        const extendedStepRegion = [chainRecord!.mouth, ...perCell]
        for (const obstacle of offRouteObstacles) {
          if (chainGateIndexByObstacle.has(obstacle.id)) continue
          const seam = seamIndexFor(extendedStepRegion, obstacle.at.between)
          if (seam !== undefined) chainGateIndexByObstacle.set(obstacle.id, { idx, cellIndex: seam - 1 })
        }
      } else {
        const grownFrom = cellRegion.get(posKey(attachedAt[0], attachedAt[1]))
        if (grownFrom !== undefined) for (const [r, c] of cells) cellRegion.set(posKey(r, c), grownFrom)
      }
      for (const [r, c] of cells) {
        cellSectionHash.set(posKey(r, c), sHash)
        cellLegacySectionHash.set(posKey(r, c), legacyHash)
        cellDressing.set(posKey(r, c), pools)
        cellDifficulty.set(posKey(r, c), section.difficulty)
        if (hidden) hiddenCellPositions.add(posKey(r, c))
      }
    }

    // A DECLARED REGION NO CELL EVER TOOK, checked once `cellRegion` is fully settled — the only point
    // a side chain's own length is known, so this is the one region check that cannot run before the
    // carve (docs/game-design/regions-and-containers.md, "one refusal necessarily runs after the
    // carve"). Two ways here: a side chain shorter than the component matched to it, so `regionOfStep`
    // seated the near end and left the rest off (same shortfall the main path's `unseated` check above
    // catches for the route, one carve later); or more off-route components than the floor authors
    // top-level side sections for, so `chainRegionsBySectionIdx` never matched one at all. Retried
    // rather than refused outright: a later attempt may grow the floor a longer or extra side path.
    if (regionLayout) {
      const seated = new Set(cellRegion.values())
      const stillUnseated = regionLayout.regions.map(r => r.name).filter(name => !seated.has(name))
      if (stillUnseated.length > 0) {
        if (!unseatedRegions) unseatedRegions = stillUnseated
        continue
      }
    }

    // AN OFF-ROUTE OBSTACLE'S OWN SEAM, checked here for the same reason the region check just above
    // is: a chain's own cells, and so its seam, exist only once the carve produces them. Retried the
    // same way `gateSeamMissing` is above — a region the chain never got to seat (caught by
    // `unseatedRegions` first, on an earlier attempt of its own) is one cause; a genuinely un-carved
    // seam within an otherwise-seated chain, this task's own reason for existing, is the other.
    if (chainGateIndexByObstacle.size < offRouteObstacles.length) {
      if (!gateSeamMissing)
        gateSeamMissing = offRouteObstacles.filter(o => !chainGateIndexByObstacle.has(o.id)).map(o => o.id)
      continue
    }
    // A GATE AT A CHAIN'S OWN LAST CELL WOULD STAND WHERE THE END ROOM MUST — every chain reserves
    // that cell unconditionally (below), the same way the main path's own last index is reserved for
    // the exit and excluded from every dynamic placement (`gateIndices`, content, controls all stop
    // one short of it). Retried rather than refused: a wider chain, which `chainPacking` grows across
    // the attempt budget the same way `packing` grows the main path, may leave room past it.
    const chainGateCrowdsEnd = [...chainGateIndexByObstacle.values()].some(
      ({ idx, cellIndex }) =>
        cellIndex === (chains.find(c => c.parentIdx === undefined && c.idx === idx)?.cells.length ?? 0) - 1
    )
    if (chainGateCrowdsEnd) continue

    // A CELL IN A GATED REGION STANDS BEHIND EVERY OBSTACLE BOUNDING IT, written into the same map
    // the authored gates and traps use — so a one-way falling into a gated region, a stray tree edge
    // beside one and the fog are all answered by one notion of "what must be earned to stand here".
    // Read once `cellRegion` is fully settled (main path AND chains, a chain inheriting its host's
    // region above), so a chain grown inside a gated region is gated with it. GATES only: a one-way's
    // `between` is typically not even a real connection of the layout, so asking `doorsToEnterRegion`
    // to remove it would at best be a no-op and at worst — where a drop's ends happen to coincide with
    // a real connection — misread a shortcut as a door nothing on the floor actually bars.
    const regionDoors = regionLayout ? doorsToEnterRegion(regionLayout, gateObstacles) : undefined
    if (regionDoors)
      for (const [cellKey, region] of cellRegion) {
        for (const id of regionDoors.get(region) ?? []) {
          gatedCellKeys.add(cellKey)
          needsDoor(cellKey, gateKeyOf(id))
        }
      }
    // THE STRUCTURAL TWIN OF THE MARKING ABOVE — every connection `regionLayout` declares stands in
    // for an obstacle here, gated or not, so `edgeAllowed`'s bypass check (above) reserves the same
    // stray edges whether or not the topology mod is in the build. `id` is a seam's own name, never
    // an authored obstacle's — it never reaches `gateKeyOf` or a room's `requiredKeyId`, only
    // `standsBehindSeam`'s set-equality check.
    const asSeamObstacle = ([a, b]: readonly [string, string]): Obstacle => ({
      id: `seam:${a}::${b}`,
      kind: "gate",
      at: { on: "connection", between: [a, b] },
    })
    const regionSeamDoors = regionLayout
      ? doorsToEnterRegion(regionLayout, regionLayout.connections.map(asSeamObstacle))
      : undefined
    if (regionSeamDoors)
      for (const [cellKey, region] of cellRegion) {
        for (const id of regionSeamDoors.get(region) ?? []) {
          seamCellKeys.add(cellKey)
          needsSeamDoor(cellKey, id)
        }
      }

    // Collect branch junction cells (become fork nodes)
    const forkPositions = new Set(sectionGroups.map(g => posKey(g.attachedAt[0], g.attachedAt[1])))
    // A fork always sits ON the main path (attachedAt is always a mainPath cell — see the
    // candidateSources above), so this is how a fork tells its two main-path neighbours from
    // everything else it opens onto. The INDEX, not mere membership: `passages` spans the whole
    // lattice, so two main-path cells far apart along the walk can be tree-adjacent through an edge
    // no chain walked (see "Gate isolation" below), and plain membership would read that stray door
    // as the path continuing.
    const mainPathIndexByKey = new Map(mainPath.map(([r, c], i) => [posKey(r, c), i]))

    // What lies one node away, read off the NEIGHBOUR's own kind rather than inferred from this cell.
    const exitKindOf = (cellKey: string, neighborKey: string): "main" | "side" | "ward" | "fork" => {
      if (forkPositions.has(neighborKey)) return "fork"
      if (roomSpecs.get(neighborKey)?.gateVariant === "tomb-key") return "ward"
      const mi = mainPathIndexByKey.get(cellKey)
      const neighborMi = mainPathIndexByKey.get(neighborKey)
      return mi !== undefined && neighborMi !== undefined && Math.abs(mi - neighborMi) === 1 ? "main" : "side"
    }

    // Every way out of one node — the passages it actually has, to the node two cells away (NODE_STEP
    // above).
    const nodeExitsOf = (cellKey: string) => {
      const [r, c] = cellKey.split(",").map(Number)
      const out: { dir: Direction; neighborKey: string }[] = []
      for (const [dr, dc, d] of CONNECTOR_DIRS) {
        const nr = r + dr,
          nc = c + dc
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue
        if (!usedCells.has(`${nr},${nc}`) || !edgeAllowed(r, c, nr, nc)) continue
        out.push({ dir: d, neighborKey: posKey(nr, nc) })
      }
      return out
    }

    // Main path nodes — spread across the full path per contentIndices/goalIndex above;
    // everything else along mainPath is left unassigned and falls through to plain corridor.
    // The goal-room fallback here is defensive only: every real config sets mainEndReward
    // explicitly (buildSite.ts). An unset one falls back to the same grant-nothing placeholder
    // every other unset reward slot uses.
    for (let mi = 0; mi < mainPath.length; mi++) {
      const [r, c] = mainPath[mi]
      if (mi === 0) {
        if (config.entrance) {
          const stairId = typeof config.entrance === "object" ? config.entrance.stairId : stairOnThisFloor("entrance")
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
      } else if (gateIndices.has(mi)) {
        const [obstacleId] = [...gateIndexByObstacle].find(([, index]) => index === mi)!
        roomSpecs.set(posKey(r, c), {
          roomType: "encounter",
          family: keyGate.familyId,
          tags: keyGate.tags,
          requiredKeyId: gateKeyOf(obstacleId),
        })
      } else if (mi === leverIndex) {
        roomSpecs.set(posKey(r, c), leverSpec(MAIN_SECTION_ADDRESS))
      } else if (controlAtIndex.has(mi)) {
        const { control, record } = controlAtIndex.get(mi)!
        roomSpecs.set(posKey(r, c), controlRoomSpec(control, record))
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
          ...(config.condition !== undefined ? { condition: config.condition } : {}),
          ...(config.patron !== undefined ? { patron: config.patron } : {}),
          ...(config.role !== undefined ? { role: config.role } : {}),
          ...(requiredKeyIds?.length ? { requiredKeyIds } : {}),
          ...(reward ? { reward } : {}),
        })
      }
    }

    // Corridor cells that are branch junctions become fork nodes too. A junction that already holds a
    // main-path room stays that room: the carve is free to hang a side section off the entrance, off a
    // puzzle or off the goal chest, and none of those is a place the player chooses a way out from.
    for (const pk of forkPositions) {
      if (!roomSpecs.has(pk)) roomSpecs.set(pk, { roomType: "fork" })
    }

    // Exit / stairhead
    if (config.exitOrStaircase === "exit") {
      roomSpecs.set(posKey(exR, exC), { roomType: "portal" })
    } else {
      const stairId =
        typeof config.exitOrStaircase === "object" ? config.exitOrStaircase.stairId : stairOnThisFloor("main")
      roomSpecs.set(posKey(exR, exC), { roomType: "portal", stairId })
    }

    // AN OFF-ROUTE CONTROL'S OWN SEATING, found chain by chain below as each one's own content is
    // placed — a control's region may sit on any chain, so this is bookkeeping shared across every
    // iteration of the loop, checked complete only once every chain has had its turn.
    const chainControlSeated = new Set<string>()
    const sawChainContentCandidate = new Set<string>()

    // CHAIN NODES: the gate at the head where one guards the way in, a lever behind it where one
    // stands there, the chain's own content spread through whatever room the carve gave it, and its
    // end room. One body for a path off the main walk and a path off one of those — the two differ
    // only in what the chain record already carries.
    for (const { section, cells, positional, idx, parentIdx, keyNodeId, keyHostColors } of chains) {
      const isFloorKeyGate = section.gate?.type === "floor-key"
      const isTombKeyGate = section.gate?.type === "tomb-key"
      // An authored keyId is used verbatim; only an unauthored gate looks up the id the
      // key-host chain above assigned it.
      const authoredKeyId = isFloorKeyGate ? (section.gate as { keyId?: string }).keyId : undefined

      // AN OFF-ROUTE OBSTACLE'S GATE ROOM — this chain's own cell indices from `chainGateIndexByObstacle`
      // (filled once, above, alongside `cellRegion`), written the identical way a main-path gate's is
      // (`gateKeyOf`/`keyGate`, below): furniture the topology mod stands on a connection, wired to
      // whichever control opens it. A different authoring vocabulary from the floor-key/tomb-key gate
      // below, standing at a different node — UNLESS this chain's own mouth is where an obstacle
      // seats, which always resolves to this same `cells[0]` the floor-key/tomb-key block claims; that
      // combination is refused by name before a single wall is carved
      // (`chainGateCollidesWithSectionGate`, above the attempt loop), so writing both here never has to
      // decide which one wins.
      //
      // `parentIdx === undefined` is checked alongside `idx`, not just `idx` alone: `chainGateIndexByObstacle`
      // only ever keys by a TOP-LEVEL chain's own `idx` (populated only where `hostedRegions` is,
      // which itself requires `parentIdx === undefined`, above) — but a sub-chain's `idx` numbers its
      // position among its OWN parent's sub-sections, starting from 0 the same as a top-level chain's
      // does, so `idx` alone can coincide between a top-level chain and an unrelated sub-chain.
      const chainGateIndices = new Set<number>()
      if (parentIdx === undefined) {
        for (const [obstacleId, loc] of chainGateIndexByObstacle) {
          if (loc.idx !== idx) continue
          chainGateIndices.add(loc.cellIndex)
          const [gr, gc] = cells[loc.cellIndex]
          roomSpecs.set(posKey(gr, gc), {
            roomType: "encounter",
            family: keyGate.familyId,
            tags: keyGate.tags,
            requiredKeyId: gateKeyOf(obstacleId),
          })
        }
      }
      let contentStart = 0

      // Gate node occupies cells[0] for gated chains
      if (isFloorKeyGate && keyNodeId) {
        const [gr, gc] = cells[0]
        const floorKeyGate = section.gate as { type: "floor-key"; color?: KeyColor }
        roomSpecs.set(posKey(gr, gc), {
          roomType: "encounter",
          // A lever's door wears the bars and holds nothing to enter or tap — see `isHandleGate`.
          ...(isHandleGate(positional) ? {} : { family: keyGate.familyId }),
          tags: keyGate.tags,
          requiredKeyId: keyNodeId,
          gateVariant: "floor-key",
          // The colour is the sign saying which CHEST on this floor holds the key. An authored key is
          // minted by a room instead and grows no chest, so defaulting one here would put the door in the
          // HUD key ring (src/game/floorKeys.ts) pointing at a chest that does not exist. An author who
          // names a colour anyway still gets it.
          ...(floorKeyGate.color
            ? { keyColor: floorKeyGate.color }
            : authoredKeyId
              ? {}
              : { keyColor: "blue" as const }),
          ...(authoredKeyId ? { keyIsAuthored: true } : {}),
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

      // A TOPOLOGY GATE AT OR AHEAD OF `contentStart` CLAIMS THAT CELL TOO — advanced past exactly
      // like a main-path gate advances `placedContent` above: the room there is the gate's, not
      // content's, whichever authoring vocabulary put it there. Never past `cells.length - 1`, the
      // chain's own end room, reserved unconditionally below (`chainGateCrowdsEnd` already refused an
      // attempt where a gate would have landed there).
      while (chainGateIndices.has(contentStart) && contentStart < cells.length - 1) contentStart += 1

      // A lever stands at the head of its chain, past whatever gate guards the way in: the player
      // reaches it before the content, and throwing it is a walk back out rather than a room solved
      // deeper in. A gate leaving no room ahead of it at all is the same shortfall the puzzle spread
      // below retries for, asked one node earlier. Its own index is kept (`leverIndexInChain`) so the
      // control search below can exclude it the same way the main path's own search excludes
      // `leverIndex`.
      let leverIndexInChain = -1
      if (leverRooms(positional) === 1) {
        if (contentStart >= cells.length - 1) continue attempt
        leverIndexInChain = contentStart
        const [lr, lc] = cells[contentStart]
        roomSpecs.set(posKey(lr, lc), leverSpec(positional))
        contentStart += 1
        while (chainGateIndices.has(contentStart) && contentStart < cells.length - 1) contentStart += 1
      }

      // Intermediate nodes (puzzles/traps) — spread across whatever room `paddedChainLength` gave
      // this chain (see spreadContentIndices), same technique as the main path, instead of
      // assumed-consecutive from contentStart (which only ever held when a chain was exactly its
      // bare content length). Indices map through `contentIndices`, so a multi-puzzle chain indexes
      // its own content rather than past it.
      //
      // A GATE CELL AND A PUZZLE CANNOT BOTH STAND IN ONE CELL EITHER, same rule and same technique
      // as the main path's own `placedContent`: forward to the next free node, so one layout always
      // places the same way. Runs out of room only where a gate leaves fewer free cells than this
      // chain's own `pathPuzzles` asks for, in which case this attempt retries the same way a
      // main-path shortfall does — a wider chain (`chainPacking`) may fit both.
      const rawContentIndices = spreadContentIndices(section.pathPuzzles, contentStart, cells.length)
      const contentIndices: number[] = []
      for (const wanted of rawContentIndices) {
        let index = wanted
        while (index < cells.length - 1 && (chainGateIndices.has(index) || contentIndices.includes(index))) index += 1
        if (index >= cells.length - 1) break
        contentIndices.push(index)
      }
      if (contentIndices.length < section.pathPuzzles) continue attempt

      // A CONTROL HOSTED BY THIS CHAIN'S OWN REGION(S) — the identical search the main path's own runs
      // above (a free node preferred; only once none is free does it take a puzzle's node, displacing
      // that puzzle onward rather than refusing quietly), asked of this chain's own cells instead. A
      // chain's own puzzle ordinal IS its position in `contentIndices` (`pi`, below the write loop) —
      // displacing here only ever moves which CELL a position points at, never the position itself, so
      // this needs no ordinal-preserving map of its own the way the main path's `puzzleRole` does.
      const chainRegionAt = (i: number) => cellRegion.get(posKey(cells[i][0], cells[i][1]))
      const takenByChainControl = new Set<number>()
      for (const { control, record } of offRouteControls) {
        if (chainControlSeated.has(control.id)) continue
        const inThisChain = (i: number) =>
          i < cells.length - 1 &&
          chainRegionAt(i) === control.in &&
          !chainGateIndices.has(i) &&
          i !== leverIndexInChain &&
          !takenByChainControl.has(i)

        let seatIndex: number | undefined
        for (let i = 0; i < cells.length - 1; i++) {
          if (inThisChain(i) && !contentIndices.includes(i)) {
            seatIndex = i
            break
          }
        }
        if (seatIndex === undefined) {
          for (let k = 0; k < contentIndices.length; k++) {
            const i = contentIndices[k]
            if (!inThisChain(i)) continue
            sawChainContentCandidate.add(control.id)
            // `takenByChainControl` excluded here too, not just from the free-node search above: a
            // second control's displacement destination must not land on a node a first control this
            // same chain already seated — the same exclusion the main path's own displacement search
            // makes against its own `takenByControl`.
            let shifted = i + 1
            while (
              shifted < cells.length - 1 &&
              (chainGateIndices.has(shifted) || contentIndices.includes(shifted) || takenByChainControl.has(shifted))
            )
              shifted += 1
            if (shifted >= cells.length - 1) continue // nowhere to move this one — try the chain's next content node
            contentIndices[k] = shifted
            seatIndex = i
            break
          }
        }
        if (seatIndex === undefined) continue // this chain hosts none of this control's region — try the next chain
        chainControlSeated.add(control.id)
        takenByChainControl.add(seatIndex)
        roomSpecs.set(posKey(cells[seatIndex][0], cells[seatIndex][1]), controlRoomSpec(control, record))
      }

      for (let pi = 0; pi < section.pathPuzzles; pi++) {
        const [r, c] = cells[contentIndices[pi]]
        const reward = section.rewards?.[pi]
        const override = section.encountersByIndex?.[pi]
        const family =
          override !== undefined ? resolveEncounter(override, "puzzle") : resolveEncounter(section.encounter, "puzzle")
        const requiredKeyIds = resolveKeyRequirements(family.familyId, {
          ...floorRef,
          pathIndex: pi,
          encounterArgs: section.encounterArgs,
        })
        const boardIndex = resolveBoardIndex?.(family.familyId, { section: positional, pathIndex: pi })
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
      if (keyHostColors.length > 0) {
        roomSpecs.set(posKey(er, ec), {
          roomType: "encounter",
          family: treasureChest.familyId,
          tags: treasureChest.tags,
          reward: { type: "tombKey", keyId: nid(er, ec) },
          ...(keyHostColors.length === 1 ? { keyColor: keyHostColors[0] } : {}),
          ...(keyHostColors.length > 1 ? { keyColors: keyHostColors } : {}),
        })
      } else if (section.end === "staircase" || typeof section.end === "object") {
        const stairId = typeof section.end === "object" ? section.end.stairId : stairOnThisFloor(positional)
        roomSpecs.set(posKey(er, ec), { roomType: "portal", stairId })
      } else {
        // A shop is a chain whose resolved encounter is fez-shop (a pathPuzzles:0 node — no chain of
        // its own, so `encounter` describes this end node). It renders its `rewards[]` as buyable
        // stock; a plain end renders its single endReward. Shop-off → encounter didn't resolve to
        // fez-shop → falls back to a treasure chest here.
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

    // Two shortfalls, reported under the SAME names the main-path search above uses — a control that
    // matched no chain node at all is `controlNotSeated`, one whose only candidate already held a
    // puzzle with nowhere to move it is `controlPuzzleUndisplaceable` — kept apart the identical way,
    // for the identical reason: a wider chain (`chainPacking`) rescues both, so both retry rather than
    // refuse. Checked once every chain has had its turn, since a control's own region may be seated on
    // any one of them.
    if (chainControlSeated.size < offRouteControls.length) {
      const stillUnseated = offRouteControls.filter(({ control }) => !chainControlSeated.has(control.id))
      const bare = stillUnseated.filter(({ control }) => !sawChainContentCandidate.has(control.id))
      const displaceable = stillUnseated.filter(({ control }) => sawChainContentCandidate.has(control.id))
      if (bare.length > 0 && !controlNotSeated) controlNotSeated = bare.map(({ control }) => control.id)
      if (displaceable.length > 0 && !controlPuzzleUndisplaceable)
        controlPuzzleUndisplaceable = displaceable.map(({ control }) => control.id)
      continue
    }

    // WHICH WAYS OUT A JUNCTION HAS FREE. Of the main path, only the way ONWARD: closing the way back
    // would shut the player in with the junction. And of the rest, only the ways out that nothing
    // already stands beyond — which is one rule and covers the two the floor cannot have. A ward's own
    // door already claims that boundary, and a second door on one boundary is two doors in one
    // doorway; a junction beyond a way out is one open space, and a gate would draw a wall through the
    // middle of it. Both of those are rooms by the time this runs, and so is a side path's own gate and
    // any room the carve hung right beside the junction. What is left — the main path onward and the
    // side paths off this junction — is what may be closed.
    //
    // Nor a way out into a HIDDEN section: a gate the player can see is a statement that something is
    // there, and a hidden section is the statement that nothing is until they find otherwise. Refused
    // here, so the spoiler never exists rather than being swept up afterwards.
    const freeWaysOut = (pk: string) => {
      const onward = (mainPathIndexByKey.get(pk) ?? -1) + 1
      return nodeExitsOf(pk).filter(({ neighborKey }) => {
        const neighborMi = mainPathIndexByKey.get(neighborKey)
        if (neighborMi !== undefined && neighborMi !== onward) return false
        if (hiddenCellPositions.has(neighborKey)) return false
        return !roomSpecs.has(neighborKey)
      })
    }

    // WHICH JUNCTIONS THIS CARVE HOLDS FOR `forks`, in the order anything will fill them. Read off the
    // carve and the rooms already on it, never off `switches` — which is what makes this attempt kept
    // or rejected for the same reason whether or not a mod is here to fill them.
    //
    // The narrowest junction that still answers each demand, widest demand first, so a wide demand is
    // never left with a junction too narrow for it. Two reserved junctions never share a way out: one
    // boundary closed twice is two doors in one doorway.
    const reservedForks: string[] = []
    const claimedWaysOut = new Set<string>()
    for (const exits of forkDemands) {
      const pick = [...forkPositions]
        .filter(pk => !reservedForks.includes(pk) && roomSpecs.get(pk)?.roomType === "fork")
        .map(pk => ({ pk, ways: freeWaysOut(pk).filter(({ neighborKey }) => !claimedWaysOut.has(neighborKey)) }))
        .filter(({ ways }) => ways.length >= exits)
        .sort((a, b) => a.ways.length - b.ways.length)[0]
      if (pick === undefined) {
        const carved = [...forkPositions].filter(
          pk => roomSpecs.get(pk)?.roomType === "fork" && freeWaysOut(pk).length >= exits
        ).length
        const count = forkDemands.filter(demand => demand >= exits).length
        if (!forkShortfall || carved > forkShortfall.carved) forkShortfall = { exits, count, carved }
        break
      }
      reservedForks.push(pick.pk)
      for (const { neighborKey } of pick.ways) claimedWaysOut.add(neighborKey)
    }
    // A junction short is an authored feature this carve cannot hold, so take another carve.
    if (reservedForks.length < forkDemands.length) continue

    // HOW MANY OF THE RESERVED JUNCTIONS END UP WITH A SWITCH IN THEM, which is also how many of them
    // keep the doors closed below. Settled here because a drop may not land behind a door one of them
    // is going to mint.
    const switchesPlaced = config.switches ? Math.min(config.switches.max, reservedForks.length) : 0

    // A SWITCH'S OWN DOORS ARE DOORS, and nothing authored them: `closeWaysOut` mints one per free way
    // out once the carve is settled. Which ground each shuts off is settled here, so the drop rule
    // below refuses a landing the player would otherwise reach without ever solving the board.
    // Nothing but the drop rule reads them, so a floor authoring no drop is spared the walk.
    const entranceKey = posKey(entR, entC)
    // A ONE-WAY OBSTACLE (kind "oneWay") IS THE REGION-ADDRESSED FORM OF THE SAME DEMAND
    // `config.oneWays` authors by section address — same carve, same shortfall, only the label it
    // resolves `from`/`to` against differs (see the unified `oneWayDemands` below).
    const oneWayObstacles = (authoredConfig.obstacles ?? []).filter(o => o.kind === "oneWay")
    for (let n = 0; ((config.oneWays ?? []).length > 0 || oneWayObstacles.length > 0) && n < switchesPlaced; n++)
      for (const { neighborKey } of freeWaysOut(reservedForks[n])) {
        // Behind a door means every way in passes through it — so it is what the way in stops reaching
        // once that one node is shut. The drops being placed below are not ways in: a drop that let
        // another drop past a door would be the same bypass one step removed.
        const reached = new Set<string>([entranceKey])
        const queue = [entranceKey]
        for (let at = 0; at < queue.length; at++)
          for (const { neighborKey: onward } of nodeExitsOf(queue[at])) {
            if (onward === neighborKey || reached.has(onward)) continue
            reached.add(onward)
            queue.push(onward)
          }
        for (const cellKey of usedCells) if (!reached.has(cellKey)) needsDoor(cellKey, `door ${neighborKey}`)
      }

    // ONE-WAY DROPS. Each authored passage needs a node of `from` and a node of `to` exactly two cells
    // apart on one axis (NODE_STEP above), with the cell between them not already an edge some chain
    // walked — a pair the maze happened to place next to each other without ever meaning to join them.
    // Picked here, off the same node set the grid below is built from, and sorted by position so the
    // same seed always drops the same pair. A demand with no such pair is this carve's own shortfall,
    // not the authoring's: another seed may still place it, so the attempt is re-carved rather than
    // refused.
    //
    // TWO AUTHORING SURFACES, ONE CARVE: `config.oneWays` names two section addresses,
    // `oneWayObstacles` (kind "oneWay") names two regions — `doubleBack`'s own drops join the far end
    // of one side chain to another, which `config.oneWays`' section addresses cannot reach at all
    // (regions-and-containers.md). Both resolve to the identical question, "which cells carry this
    // label", just answered off a different map, so one demand list carries both and the search below
    // runs once regardless of which vocabulary asked.
    const exitKey = posKey(exR, exC)
    const oneWayEdges: { from: string; to: string; dir: Direction }[] = []
    let oneWayShort: { from: string; to: string } | undefined
    const bySectionAddress = (address: string) => (key: string) => cellSectionAddress.get(key) === address
    const byRegion = (region: string) => (key: string) => cellRegion.get(key) === region
    const oneWayDemands = [
      ...(config.oneWays ?? []).map(w => ({
        from: w.from,
        to: w.to,
        matchesFrom: bySectionAddress(w.from),
        matchesTo: bySectionAddress(w.to),
      })),
      ...oneWayObstacles.map(o => ({
        from: o.at.between[0],
        to: o.at.between[1],
        matchesFrom: byRegion(o.at.between[0]),
        matchesTo: byRegion(o.at.between[1]),
      })),
    ]
    // ONE CONNECTOR CARRIES ONE DROP. Two drops landing on the same pair of cells would write one
    // connector twice and leave a passage the author asked for gone with nothing reported, so the
    // second takes the next cell pair — or, with none left, is this carve's shortfall like any other.
    const takenConnectors = new Set<string>()
    for (const demand of oneWayDemands) {
      const candidates: { from: string; to: string; dir: Direction }[] = []
      for (const fromKey of usedCells) {
        if (!demand.matchesFrom(fromKey)) continue
        // The exit was forced to a true dead end just above (every passage off it dropped but the one
        // to its predecessor) precisely so nothing reads as continuing past it. A drop hanging off it
        // would add exactly the direction that was deleted to guarantee that.
        if (fromKey === exitKey) continue
        const fromDoors = standsBehind(fromKey)
        const [r, c] = fromKey.split(",").map(Number)
        for (const [dr, dc, d] of CONNECTOR_DIRS) {
          const nr = r + dr,
            nc = c + dc
          if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue
          const toKey = posKey(nr, nc)
          if (toKey === exitKey) continue
          if (!demand.matchesTo(toKey)) continue
          // A DROP MAY RUN INSIDE WHAT A DOOR SHUTS OFF, OR OUT OF IT, NEVER INTO GROUND SHUT BY A
          // DOOR THE PLAYER HAS NOT EARNED BY STANDING WHERE THEY FALL FROM. A switch's doors count
          // here exactly as an authored gate's do: both are asked of one map (`doorsToEnter`).
          if ([...standsBehind(toKey)].some(door => !fromDoors.has(door))) continue
          // A hidden section is the statement that nothing is there until the player finds otherwise,
          // and the runtime empties its cells — so a visible drop into one leaves the source pointing
          // at a stub, which is the spoiler `freeWaysOut` refuses for a gate. Out of one stays legal.
          if (hiddenCellPositions.has(toKey)) continue
          // A drop goes where the maze never joined two cells — never across a boundary the gate
          // isolation deliberately suppressed, which is a way around a locked door wearing a drop's
          // clothes.
          if (passages.has(pkey(r, c, nr, nc))) continue
          if (takenConnectors.has(pkey(r, c, nr, nc))) continue
          candidates.push({ from: fromKey, to: toKey, dir: d })
        }
      }
      candidates.sort((a, b) => {
        const [ar, ac] = a.from.split(",").map(Number)
        const [br, bc] = b.from.split(",").map(Number)
        const [atr, atc] = a.to.split(",").map(Number)
        const [btr, btc] = b.to.split(",").map(Number)
        return ar - br || ac - bc || atr - btr || atc - btc
      })
      const picked = candidates[0]
      if (!picked) {
        oneWayShort = { from: demand.from, to: demand.to }
        break
      }
      const [pfr, pfc] = picked.from.split(",").map(Number)
      const [ptr, ptc] = picked.to.split(",").map(Number)
      takenConnectors.add(pkey(pfr, pfc, ptr, ptc))
      oneWayEdges.push(picked)
    }
    if (oneWayShort) {
      if (!oneWayShortfall) oneWayShortfall = oneWayShort
      continue
    }

    // Build 2D grid
    const cells2D: GridCell[][] = Array.from({ length: N }, () =>
      Array.from({ length: N }, (): GridCell => ({ type: "empty" }))
    )

    // Fill used cells with corridor or room
    for (const cellKey of usedCells) {
      const [r, c] = cellKey.split(",").map(Number)
      const spec = roomSpecs.get(cellKey)
      // Compute dirs from passages — nodes are two cells apart (see NODE_STEP above). A fork
      // also names what each of its own dirs leads to (RoomCell.exits) — main path continuing,
      // an attached side section, that side's own tomb-key gate ("ward"), or straight into
      // another fork. A switch adds the key it closed a way out on, once the carve is settled.
      const dirs = new Set<Direction>()
      const exits: RoomCell["exits"] = spec?.roomType === "fork" ? [] : undefined
      for (const [dr, dc, d] of CONNECTOR_DIRS) {
        const nr = r + dr,
          nc = c + dc
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && usedCells.has(`${nr},${nc}`) && edgeAllowed(r, c, nr, nc)) {
          dirs.add(d)
          if (exits) exits.push({ dir: d, kind: exitKindOf(cellKey, posKey(nr, nc)) })
        }
      }

      const sectionHash = cellSectionHash.get(cellKey) ?? mainSectionHash
      const sectionAddress = cellSectionAddress.get(cellKey) ?? MAIN_SECTION_ADDRESS
      const legacySectionHash = cellLegacySectionHash.get(cellKey) ?? legacyMainSectionHash
      const hidden = hiddenCellPositions.has(cellKey) || undefined
      // Unlike sectionAddress there is no default: a floor that authors no regionLayout leaves every
      // cell's region absent, which is what keeps a floor with no layout carving unchanged.
      const region = cellRegion.get(cellKey)
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
          sectionAddress,
          sectionHash,
          legacySectionHash,
          ...(cellOrdinal.get(cellKey) ? { ordinal: cellOrdinal.get(cellKey) } : {}),
          ...(hidden ? { hidden } : {}),
          ...(region !== undefined ? { region } : {}),
          ...spec,
          ...(exits ? { exits } : {}),
        }
        cells2D[r][c] = roomCell
      } else {
        const cellTier = cellDifficulty.get(posKey(r, c))
        const corridorCell: CorridorCell = {
          type: "corridor",
          dirs,
          state: "fogged",
          sectionAddress,
          sectionHash,
          legacySectionHash,
          ...(cellOrdinal.get(cellKey) ? { ordinal: cellOrdinal.get(cellKey) } : {}),
          ...(cellTier ? { difficulty: cellTier } : {}),
          ...(hidden ? { hidden } : {}),
          ...(region !== undefined ? { region } : {}),
        }
        cells2D[r][c] = corridorCell
      }
    }

    // THE PLAIN 1-WIDE CORRIDOR CELL PHYSICALLY BETWEEN TWO NODES (see NODE_STEP above), built the one
    // way wherever one is built — a two-way passage and a drop alike — so a future CorridorCell field
    // cannot go missing from one of them. `owner` is the node the connector answers to: its section,
    // its hash and its tier, which for a drop is the node it falls FROM.
    //
    // A connector inherits `hidden` only when both ends do, so a hidden section's own internal
    // corridors stay hidden together with it, while the single corridor linking a hidden section to its
    // (visible) attachment point stays visible — same as a normal doorway would.
    // `drop` marks the one caller (the WRITE THE CHOSEN DROPS pass below) whose two ends belong to
    // DIFFERENT sections — everywhere else, `owner` and `other` are two steps of the same chain, so the
    // bare sorted pair already names them uniquely within that chain's address. A drop's `other` is a
    // step of the LANDING section instead, filed under the FROM section's address (see the comment on
    // `sectionAddress` above) — so the bare pair is not an identity there, it is a coincidence: "upper"
    // step 1 dropping onto "lower" step 0 sorts to the same "0|1" as upper's own ordinary connector
    // between its steps 0 and 1. Qualifying `other` with the section it actually belongs to is what an
    // ordinal needs to survive a re-carve AND stay unique — the pair alone cannot name a drop's
    // connector, because its two ends were never steps of one chain to begin with.
    const connectorBetween = (owner: string, other: string, dirs: Set<Direction>, drop = false): CorridorCell => {
      const ownerOrdinal = cellOrdinal.get(owner)
      const otherOrdinal = cellOrdinal.get(other)
      const otherLabel =
        drop && otherOrdinal !== undefined
          ? `${cellSectionAddress.get(other) ?? MAIN_SECTION_ADDRESS}:${otherOrdinal}`
          : otherOrdinal
      const tier = cellDifficulty.get(owner)
      return {
        type: "corridor",
        dirs,
        state: "fogged",
        sectionAddress: cellSectionAddress.get(owner) ?? MAIN_SECTION_ADDRESS,
        sectionHash: cellSectionHash.get(owner) ?? mainSectionHash,
        legacySectionHash: cellLegacySectionHash.get(owner) ?? legacyMainSectionHash,
        // A CONNECTOR IS NAMED BY THE TWO CELLS IT JOINS. An ordinary one sorts the pair so it does not
        // matter which end the edge was walked from; a drop's is directional already (`owner` is always
        // the FROM node, never the other way round), and its far end is qualified as above.
        ...(ownerOrdinal && otherLabel
          ? { ordinal: drop ? `${ownerOrdinal}|${otherLabel}` : [ownerOrdinal, otherLabel].sort().join("|") }
          : {}),
        ...(tier ? { difficulty: tier } : {}),
        ...(hiddenCellPositions.has(owner) && hiddenCellPositions.has(other) ? { hidden: true } : {}),
        // Same rule as sectionAddress just above: a connector answers to its owner node, region
        // included, and absent everywhere a floor authors no regionLayout.
        ...(cellRegion.get(owner) !== undefined ? { region: cellRegion.get(owner) } : {}),
      }
    }

    // Materialize the connector for every real edge between two used nodes. Each edge is only
    // processed once (from its lower-keyed endpoint) since it's symmetric.
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
        cells2D[mr][mc] = connectorBetween(cellKey, neighborKey, new Set([d, OPPOSITE[d]]))
      }
    }

    // WRITE THE CHOSEN DROPS. The from-node gains the direction toward the connector; the connector
    // gains ONLY that same direction; the to-node gains nothing. That asymmetry is the whole feature —
    // the connector carrying no direction back is what stops a player standing in it from climbing back
    // up, and the to-node carrying no direction down into it is what stops them entering from below.
    for (const edge of oneWayEdges) {
      const [fr, fc] = edge.from.split(",").map(Number)
      const [tr, tc] = edge.to.split(",").map(Number)
      const mr = (fr + tr) / 2,
        mc = (fc + tc) / 2
      const fromCell = cells2D[fr][fc]
      if (fromCell.type === "empty")
        throw new Error(`[siteAssembler] one-way from ${edge.from} landed on an uncarved cell`)
      cells2D[fr][fc] = { ...fromCell, dirs: new Set([...fromCell.dirs, edge.dir]) }
      cells2D[mr][mc] = connectorBetween(edge.from, edge.to, new Set([edge.dir]), true)
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
    const pickDressing = <T>(pool: T[] | undefined, pk: string, salt: string): T | undefined =>
      pool?.length ? pool[hashString(`${siteId}:${salt}:${pk}`) % pool.length] : undefined

    /**
     * A room serves one purpose: what hangs on its wall agrees with what stands in it, so a player can
     * say "this is the storeroom", "this is where they prayed".
     *
     * **The prop leads** — it is the room's statement and the wall item follows. Narrowing both pools by
     * a shared purpose instead lets the thin wall catalogue decide which props exist at all: the
     * merchant hangs only a goods niche and a tally board, which would delete his statue, shrine, basin,
     * hanging and brazier from the rank.
     *
     * Where the wall pool has nothing to say about the prop's purpose it draws freely. Forcing it to
     * speak for a universal prop takes floors where one wall item fills three quarters of the rooms from
     * 19 to 27 of 97, and a floor repeating one furnished corner reads worse than one with plain rooms.
     */
    const wallSuiting = (pool: WallDecorationKind[], prop: DecorationKind | undefined) => {
      const purposes = prop ? rolesOfProp(prop) : undefined
      if (!purposes?.length) return pool
      const fits = pool.filter(k => rolesOfWallItem(k)?.some(role => purposes.includes(role)))
      // NARROW ONLY WHERE THERE IS A CHOICE. Four purposes have exactly one wall item to their name
      // (logistics a niche, judgement a mask, scribe a tally board, sky a star shaft) and three have
      // none at all, so narrowing to a single survivor does not make a room agree with itself — it
      // makes every room of that purpose hang the identical thing. Measured: it took the floors where
      // one wall item fills three quarters of the rooms from 17 to 31 of 97. Agreement is worth having
      // only while it still leaves something to vary; below that the whole pool is the better answer,
      // and the fix is more wall items rather than a stricter rule here (`yarn art-census`).
      return fits.length >= 2 ? fits : pool
    }

    const dressedPositions = [...new Set([...forkPositions, ...endpointPositions])]

    /**
     * A dedicated floor shows its god at least once — a guaranteed count, not a raised probability.
     *
     * Weighting the five patron kinds in the pool does not work: the share is tiny (the nobleman rank
     * holds eight statue rooms, since only forks and dead ends dress at all), so tripling it moves one
     * statue to two while costing `master/niche` forty-five rooms and inventing four unpainted pairings
     * — art debt from 137 rooms owed to 215. A floor is the right unit and a count the right instrument.
     *
     * The god takes **the biggest** eligible room, ranked by the floor it draws (`canClaimVoid`: the free
     * part of its own 3x3), hash breaking ties only. A dedication the player walks past in a cupboard
     * while the hall next door holds jars is not a dedication. Size earns its keep twice — the biggest
     * room is likeliest to have the two spare cells `companionProps` needs for a second statue, and a
     * pair flanking a wall reads as a shrine where one in a corner reads as furniture.
     *
     * Only rooms whose own pool can carry a patron are eligible.
     */
    const patronRooms = new Set<string>()
    if (config.patron !== undefined && PATRON_PER_FLOOR > 0) {
      // The grid as it stands, so rooms can be ranked by the floor they will DRAW. `footprintSize` is
      // the renderer's own claim rule, kept in the domain precisely so both sides answer this the same.
      const claimGrid: FloorGrid = {
        cells: cells2D,
        rows: N,
        cols: N,
        entrancePos: [entR, entC],
        exitPos: [exR, exC],
        siteId,
        staircases: {},
      }
      const rowCol = (pk: string): [number, number] => {
        const [r, c] = pk.split(",").map(Number)
        return [r, c]
      }
      const isFork = (pk: string): boolean => {
        const [r, c] = rowCol(pk)
        const cell = cells2D[r][c]
        return cell.type === "room" && cell.roomType === "fork"
      }
      const eligible = dressedPositions
        .filter(pk => (cellDressing.get(pk)?.props ?? []).some(k => PATRON_KINDS.has(k)))
        // NOT THE ENTRANCE, and not the stair down. A portal is a doorway the player passes through
        // twice, and its footprint is mostly the margin outside the grid — a pair of statues there reads
        // as a porch rather than as the room the tomb was dug for. The god takes a CHAMBER.
        .filter(pk => {
          const [r, c] = rowCol(pk)
          const cell = cells2D[r][c]
          return cell.type === "room" && cell.roomType !== "portal"
        })
        .sort(
          (a, b) =>
            // A FORK FIRST, and only then the biggest. A junction is a hub — the player arrives at it,
            // chooses, and comes back to it — where a dead end is somewhere they visit once and leave.
            // A god belongs in the room his tomb is organised around, so size decides only among rooms
            // of the same standing.
            Number(isFork(b)) - Number(isFork(a)) ||
            footprintSize(claimGrid, ...rowCol(b)) - footprintSize(claimGrid, ...rowCol(a)) ||
            hashString(`${siteId}:patronPick:${a}`) - hashString(`${siteId}:patronPick:${b}`) ||
            a.localeCompare(b)
        )
      for (const pk of eligible.slice(0, PATRON_PER_FLOOR)) patronRooms.add(pk)
    }

    for (const pk of dressedPositions) {
      const pools = cellDressing.get(pk)
      // In a guaranteed room the pool is narrowed to what a god can appear on, and the same hash then
      // chooses among those — so which god-bearing kind it is still varies from room to room.
      //
      // A STATUE FIRST, where the pool has one. The five patron kinds are not equal at this job: a
      // statue IS the god standing in the room, where a shrine is a cabinet that might hold him and a
      // mask is a thing on a wall. The god's own room takes the figure and leaves the rest to the rooms
      // around it — and because `companionProps` pairs whatever this room draws, choosing the statue is
      // also what puts TWO of them in the biggest chamber on the floor.
      const patronProps = pools?.props?.filter(k => PATRON_KINDS.has(k))
      const godProps = patronProps?.includes("statue") ? (["statue"] as DecorationKind[]) : patronProps
      const propPool = patronRooms.has(pk) ? godProps : pools?.props
      const picked = pickDressing(propPool, pk, "decoration")
      // NO HOLE BESIDE A WAY DOWN. A `pit` is a shaft cut in the floor and a staircase is a way to the
      // floor below, so the two say the same thing in the same room and only one of them is real — the
      // player can take the stair and cannot take the pit. Re-picked rather than filtered out of the
      // pool: dropping a kind would change the pool's LENGTH and with it every stairhead's furniture,
      // where this moves the seven rooms that actually collided.
      const [pr, pc] = pk.split(",").map(Number)
      const pitCell = cells2D[pr][pc]
      const besideStair = pitCell.type === "room" && pitCell.roomType === "portal" && pitCell.stairId !== undefined
      const decoration =
        picked === "pit" && besideStair
          ? pickDressing(
              propPool?.filter(k => k !== "pit"),
              pk,
              "decoration:not-a-pit"
            )
          : picked
      // THE GOD'S ROOM TAKES A GOD'S WALL ITEM TOO, where its pool has one. Prop and wall both being
      // patron kinds is also the SIGNAL the renderer reads to find this room — it needs no new field on
      // the cell, and a room dressed that way is the god's by construction rather than by a flag.
      const patronWall = patronRooms.has(pk) ? pools?.wall?.filter(k => PATRON_KINDS.has(k)) : undefined
      // Its own salt, so a rank whose two pools are the same length does not pair the same stela with
      // the same jar rack in every room that draws them.
      const wallDecoration = pickDressing(
        patronWall?.length ? patronWall : pools?.wall ? wallSuiting(pools.wall, decoration) : undefined,
        pk,
        "wallDecoration"
      )
      if (!decoration && !wallDecoration) continue
      const [r, c] = pk.split(",").map(Number)
      const owner = cells2D[r][c]
      if (owner.type === "room") {
        cells2D[r][c] = {
          ...owner,
          ...(decoration ? { decoration } : {}),
          ...(wallDecoration ? { wallDecoration } : {}),
          // Written down rather than inferred from the pairing — see RoomCell.patronRoom.
          ...(patronRooms.has(pk) && decoration ? { patronRoom: true } : {}),
        }
      }
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
      ...(config.theme !== undefined ? { theme: config.theme } : {}),
      ...(config.condition !== undefined ? { condition: config.condition } : {}),
      ...(config.patron !== undefined ? { patron: config.patron } : {}),
      rows: N,
      cols: N,
      entrancePos: [entR, entC],
      exitPos: [exR, exC],
      siteId,
      staircases,
    }

    // Two rooms of one section that a save cannot tell apart is a data-loss bug, not a layout one —
    // the same reason section addresses are checked before anything is carved. So it fails the floor
    // outright instead of re-carving: the collision is in the AUTHORING (two rooms of a section named
    // by the same family, no chain position between them), and every seed produces it.
    const duplicateSlot = (): string | undefined => {
      const slotsSeen = new Set<string>()
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const slot = cellSlot(grid, r, c)
          if (!slot) continue
          const cell = cells2D[r][c]
          const section = (cell.type !== "empty" && cell.sectionAddress) || MAIN_SECTION_ADDRESS
          const named = `${section}/${slot}`
          if (slotsSeen.has(named)) return named
          slotsSeen.add(named)
        }
      }
      return undefined
    }

    const bareDuplicate = duplicateSlot()
    if (bareDuplicate) return { success: false, reasons: [{ type: "duplicateCellSlot", slot: bareDuplicate }] }

    // A GATE IS NAMED BY WHERE THE FLOOR WAS AUTHORED AND THE BRANCH IT STANDS AT, NEVER BY WHERE THE
    // COMPASS POINTS OR WHICH CELL THE CARVE CHOSE. A key a player holds outlives the layout it was
    // minted on, and the failure that costs is not the key that stops fitting: it is one kept from an
    // earlier layout still fitting after a re-carve has swung that branch round to another quarter,
    // opening a door nothing was solved for. An authoring address cannot move under a re-carve. The
    // main path onward answers to MAIN_SECTION_ADDRESS, which no side path can be given (see
    // sectionAddresses); whatever needs the compass reads it off `exits[].dir`.
    const stemFor = (n: number) =>
      `switch:${floorRef.journeyId}#${floorRef.levelIndex ?? 0}#${floorRef.floorIndex}#${n}`

    // Closes one reserved junction's ways out — the corridor cell each leads to becomes the door, and
    // the junction reports the key it now wants on that exit. Returns what it overwrote, so a junction
    // nothing ends up standing in can be opened again.
    const closeWaysOut = (n: number, pk: string): Map<string, GridCell> => {
      const overwritten = new Map<string, GridCell>()
      const [sr, sc] = pk.split(",").map(Number)
      const junction = cells2D[sr][sc]
      if (junction.type !== "room") throw new Error(`[siteAssembler] reserved fork ${pk} is not a room`)
      overwritten.set(pk, junction)
      const gateKeyByDir = new Map<Direction, string>()
      for (const { dir, neighborKey } of freeWaysOut(pk)) {
        const gateKeyId = `${stemFor(n)}:${cellSectionAddress.get(neighborKey) ?? MAIN_SECTION_ADDRESS}`
        gateKeyByDir.set(dir, gateKeyId)
        const [gr, gc] = neighborKey.split(",").map(Number)
        const wayOut = cells2D[gr][gc]
        // A free way out leads to a node no room spec claimed, which the fill above wrote as corridor.
        if (wayOut.type !== "corridor") throw new Error(`[siteAssembler] way out ${neighborKey} is not a corridor`)
        overwritten.set(neighborKey, wayOut)
        cells2D[gr][gc] = {
          ...wayOut,
          type: "room",
          roomType: "encounter",
          // THE WAY IS SHUT, AND THAT IS THE WHOLE OF IT. A cell is drawn as a gate by its tags and
          // read as locked by the key it wants, neither of which asks for a family — so this door
          // wears a ward gate's bars and holds nothing to enter or tap. The switch is what opens it,
          // and a door the player opens by tapping is a door the switch does not control.
          tags: keyGate.tags,
          // NO KEY EVER SATISFIES THIS ONE, and nothing mints one. On a switch's door the id NAMES THE
          // WAY OUT — which branch of which fork this is — so the board standing in the fork can say
          // which way it left open (`useAssembledFloor`'s openWaysOut) and the rest stay shut. It keeps
          // the field the ward gates use because everything that reads a door reads it there.
          requiredKeyId: gateKeyId,
          gateVariant: "floor-key",
          // Minted by whatever stands in the switch, so this floor grows no chest holding it and the
          // door wears no colour pointing at one (see the floor-key gate written per section above).
          keyIsAuthored: true,
        }
      }
      cells2D[sr][sc] = {
        ...junction,
        exits: junction.exits?.map(exit => {
          const gateKeyId = gateKeyByDir.get(exit.dir)
          return gateKeyId ? { ...exit, gateKeyId } : exit
        }),
        // The same doors, said once more in the form a mechanism is asked for: a state per way out, and
        // rest before it is solved. A solved board can be put back to rest — the player walks in, turns
        // a mirror off every shrine and leaves — and that shuts every way out of the fork, so the walk
        // is handed that move and has to prove the floor survives it.
        mechanism: {
          states: [MECHANISM_AT_REST, ...gateKeyByDir.values()],
          initial: MECHANISM_AT_REST,
          returnsToInitial: true,
          positions: [...gateKeyByDir.values()].map(gateKeyId => ({ state: gateKeyId, gateKeyId })),
        },
      }
      return overwritten
    }

    // A CARVE HAS TO SURVIVE ITS RESERVED JUNCTIONS BEING CLOSED, AND SURVIVE THEM BEING OPEN. Closed
    // is where a floor shuts a section's own key away behind a door the player has not reached yet;
    // open is where a junction is left with nothing worth reaching down any branch. `forks` promises
    // junctions that answer both, so both are asked — and neither reads `switches`, which is what
    // makes this attempt kept or rejected for the same reason whether or not a mod is here to fill
    // them. The doors are then opened again wherever no switch stands: a door nothing mints the key
    // for is not a door.
    if (!validateSite(grid).valid) continue
    const opened = reservedForks.map((pk, n) => closeWaysOut(n, pk))
    const closedValid = validateSite(grid).valid
    for (let n = switchesPlaced; n < opened.length; n++)
      for (const [pk, cell] of opened[n]) {
        const [r, c] = pk.split(",").map(Number)
        cells2D[r][c] = cell
      }
    if (!closedValid) continue

    // A switch is a fork AND its encounter, not one or the other — the room keeps `roomType: "fork"`,
    // so its footprint, its exits and the junction geometry stay a fork's, and it gains the
    // encounter's own fields on top. It takes no `pathIndex`: it is not the k-th room of a chain, so a
    // save names it by what fills it the way a section's chest or gate is named (cellSlot.ts), and
    // `requiredKeyIds`, addressed by chain position, is none of its business.
    if (config.switches) {
      const family = resolveEncounter(config.switches.encounter, "puzzle")
      for (let n = 0; n < switchesPlaced; n++) {
        const [sr, sc] = reservedForks[n].split(",").map(Number)
        const junction = cells2D[sr][sc]
        if (junction.type !== "room") throw new Error(`[siteAssembler] reserved fork ${reservedForks[n]} is not a room`)
        cells2D[sr][sc] = {
          ...junction,
          family: family.familyId,
          tags: family.tags,
          // THE BOARD HAS TO STAND STILL WHILE THE JUNCTION MOVES. Having no chain position, a switch
          // gets no entry from the world's board dealer, and `generatePuzzle` then falls back to a seed
          // hashed from the cell's COORDINATE — which the next carve changes, under a save slot that
          // does not, so a half-solved switch would come back on a different board. Hashed from the
          // same authoring address its gates are named from instead.
          boardIndex: hashString(`${stemFor(n)}|${family.familyId}`),
          ...(config.encounterArgs !== undefined ? { encounterArgs: config.encounterArgs } : {}),
          difficulty: config.difficulty,
          ...(config.theme !== undefined ? { theme: config.theme } : {}),
          ...(config.condition !== undefined ? { condition: config.condition } : {}),
          ...(config.patron !== undefined ? { patron: config.patron } : {}),
          ...(config.role !== undefined ? { role: config.role } : {}),
        }
      }

      // A switch named the same as the chest of the section it stands in leaves two rooms answering to
      // one save entry — asked again because the name only exists once a family is in the junction.
      // A carve that satisfied `forks` is not re-rolled to hide it: the collision is in the authoring.
      const switchedDuplicate = duplicateSlot()
      if (switchedDuplicate)
        return { success: false, reasons: [{ type: "duplicateCellSlot", slot: switchedDuplicate }] }
    }

    // WHICH MECHANISM DRIVES WHICH DOOR IS ONLY READABLE IF BOTH ENDS SAY SO, so the mark goes on the
    // lever's or control's room AND on every gate it owns — one pair per mechanism, worn twice. Written
    // here, over the finished cells, because a gate room is carved by the ordinary gate pass and a
    // mechanism's room by the lever/control pass, and neither of them knows about the other.
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = cells2D[r][c]
        if (cell.type !== "room") continue
        // A mechanism is found by the keys its own positions carry, a door by the key it asks for. A
        // switch's mechanism and an authored gate's key are not in the map, so they stay unmarked.
        const key = cell.mechanism?.positions[0]?.gateKeyId ?? cell.requiredKeyId
        const mark = key === undefined ? undefined : markByGateKey.get(key)
        if (mark) cells2D[r][c] = { ...cell, mark }
      }
    }

    // WHAT A ROOM HOLDS AGAINST WHAT ITS REGION WILL TAKE. A puzzle node is a room the floor authored
    // as a puzzle (`pathIndex` is set only on the k-th room of a chain's own puzzles — never on a
    // mechanism, a gate or the goal/end chest, which have no chain position of their own). A chest
    // node is a room holding treasure — a `reward` payload, the `"treasure"` tag the goal/end chest
    // always carries even before a reward is authored onto it, or `stock`: a shop hands the player loot
    // just as a chest does, it just carries it as several slots rather than one. A mechanism room
    // (lever, switch, gate) is neither: the region never declares it, the mod that owns it points AT
    // the region instead (docs/game-design/regions-and-containers.md). Reported per region and kind
    // rather than per room — five puzzles standing in one region that promised nothing is one
    // disagreement between the floor and its layout, not five.
    if (regionLayout) {
      const appetiteOf = new Map(regionLayout.regions.map(r => [r.name, r.appetite]))
      const willNotTake = new Map<string, { region: string; kind: ContentKind }>()
      for (const row of cells2D)
        for (const cell of row) {
          if (cell.type !== "room" || cell.region === undefined) continue
          const appetite = appetiteOf.get(cell.region)
          if (appetite === undefined) continue
          const holds: ContentKind[] = []
          if (cell.roomType === "encounter" && cell.pathIndex !== undefined) holds.push("puzzle")
          if (cell.reward !== undefined || cell.stock !== undefined || cell.tags?.includes("treasure"))
            holds.push("reward")
          for (const kind of holds)
            if (!appetiteAccepts(appetite, kind))
              willNotTake.set(`${cell.region}|${kind}`, { region: cell.region, kind })
        }
      if (willNotTake.size > 0) {
        if (!regionMismatch) regionMismatch = [...willNotTake.values()]
        continue
      }
    }

    return { success: true, grid }
  }

  return {
    success: false,
    // The fork shortfall first where it ever applied: a floor no carve could give the junctions it
    // asks for is an authoring mistake, and "no layout" alone would send the reader after the maze.
    reasons: [
      ...(forkShortfall ? [{ type: "forksUnsatisfied", ...forkShortfall } as const] : []),
      ...(oneWayShortfall ? [{ type: "oneWayUnsatisfied", ...oneWayShortfall } as const] : []),
      ...(unseatedRegions ? [{ type: "regionNotSeated", regions: unseatedRegions } as const] : []),
      ...(gateSeamMissing ? [{ type: "obstacleSeamNotCarved" as const, ids: gateSeamMissing }] : []),
      ...(controlNotSeated ? [{ type: "controlNotSeated" as const, ids: controlNotSeated }] : []),
      ...(controlPuzzleUndisplaceable
        ? [{ type: "controlPuzzleUndisplaceable" as const, ids: controlPuzzleUndisplaceable }]
        : []),
      ...(regionMismatch
        ? regionMismatch.map(({ region, kind }) => ({ type: "regionWillNotTake" as const, region, kind }))
        : []),
      { type: "layoutNotFound" } as const,
    ],
  }
}
