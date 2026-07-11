import type { Difficulty, FloorConfig, SideSection, Tier, TreasureReward } from "./types"
import { TOMB_PERK_IDS, TREASURE_PERKS } from "../data/treasurePerks"
import { GLOBAL_DEFAULTS } from "./spec/global"
import { mulberry32 } from "../game/random"
import { hashStr } from "./rewards"
import { assignPuzzleRewards } from "./puzzleRewards"
import { buildSideSections, type ResolveReward } from "./sideSections"
import type { FloorConstraint, PyramidConstraint, RewardSpec } from "./dsl"

// ── Per-pyramid randomized resolution ─────────────────────────────────────────

// Resolves the effective keyColors for a pyramid, honoring (in priority order):
// a literal keyColorsRange roll, a literal keyColors, then a sharedKeyChance roll — a hit
// resolves to 1 (one key, every gated door); a miss resolves to 5 (mostly-dedicated keys),
// since the buildSideSections default of "no keyColors set" already means 1 color and
// would make a miss indistinguishable from a hit.
export const resolveKeyColors = (
  constraint: PyramidConstraint,
  journeyId: string,
  pyramidIndex: number
): number | undefined => {
  const rand = mulberry32(hashStr(`${journeyId}:${pyramidIndex}:keyColors`))
  if (constraint.keyColorsRange) {
    const { min, max } = constraint.keyColorsRange
    return min + Math.floor(rand() * (max - min + 1))
  }
  if (constraint.keyColors !== undefined) return constraint.keyColors
  if (constraint.sharedKeyChance !== undefined) return rand() < constraint.sharedKeyChance ? 1 : 5
  return undefined
}

// Resolves an authored literal, or a chance-rolled "hit" value, or undefined (builder default).
const resolveChanceValue = (
  literal: number | undefined,
  chance: number | undefined,
  hitValue: number,
  journeyId: string,
  pyramidIndex: number,
  tag: string
): number | undefined => {
  if (literal !== undefined) return literal
  if (chance === undefined) return undefined
  const rand = mulberry32(hashStr(`${journeyId}:${pyramidIndex}:${tag}`))
  return rand() < chance ? hitValue : undefined
}

export const resolveCorridorStraightness = (constraint: PyramidConstraint, journeyId: string, pyramidIndex: number) =>
  resolveChanceValue(
    constraint.corridorStraightness,
    constraint.windyChance,
    constraint.windyStraightness ?? GLOBAL_DEFAULTS.windyStraightness,
    journeyId,
    pyramidIndex,
    "windy"
  )

export const resolvePacking = (constraint: PyramidConstraint, journeyId: string, pyramidIndex: number) =>
  resolveChanceValue(
    constraint.packing,
    constraint.packingChance,
    constraint.packingWhenHit ?? GLOBAL_DEFAULTS.packingWhenHit,
    journeyId,
    pyramidIndex,
    "packing"
  )

export const resolveSealed = (constraint: PyramidConstraint): boolean | undefined => constraint.sealed

// Ward-wing key indices for a tomb, skipping any slot reserved for a tier-unlock or
// location-key perk (those are spoken for elsewhere) — first `count` remaining indices.
export const freeWardIndices = (tombId: string, count: number): number[] => {
  const perkIds = TOMB_PERK_IDS[tombId] ?? []
  const free: number[] = []
  for (let idx = 0; idx < perkIds.length && free.length < count; idx++) {
    const perk = TREASURE_PERKS[perkIds[idx]]
    if (perk?.type !== "tier-unlock" && perk?.type !== "location-key") free.push(idx)
  }
  return free
}

// ── Floor construction ────────────────────────────────────────────────────────

export type BuildFloorOptions = {
  pathPuzzles: number
  difficulty: Difficulty
  sideSections: SideSection[]
  exitOrStaircase?: FloorConfig["exitOrStaircase"]
  entrance?: FloorConfig["entrance"]
  mainEndReward?: TreasureReward
  encounter?: FloorConfig["encounter"]
  lastMainPuzzleFamily?: FloorConfig["lastMainPuzzleFamily"]
  corridorStraightness?: number
  packing?: number
  sealed?: boolean
  encounterArgs?: unknown
}

// The common FloorConfig skeleton shared by every pyramid and tomb floor — defaults to a
// plain exiting floor with no rewards; callers layer on what their site actually has.
export const buildFloor = (opts: BuildFloorOptions): FloorConfig => ({
  pathPuzzles: opts.pathPuzzles,
  difficulty: opts.difficulty,
  end: "treasure",
  exitOrStaircase: opts.exitOrStaircase ?? "exit",
  sideSections: opts.sideSections,
  ...(opts.entrance ? { entrance: opts.entrance } : {}),
  ...(opts.mainEndReward ? { mainEndReward: opts.mainEndReward } : {}),
  ...(opts.encounter ? { encounter: opts.encounter } : {}),
  ...(opts.lastMainPuzzleFamily ? { lastMainPuzzleFamily: opts.lastMainPuzzleFamily } : {}),
  ...(opts.corridorStraightness !== undefined ? { corridorStraightness: opts.corridorStraightness } : {}),
  ...(opts.packing !== undefined ? { packing: opts.packing } : {}),
  ...(opts.sealed ? { sealed: true } : {}),
  ...(opts.encounterArgs !== undefined ? { encounterArgs: opts.encounterArgs } : {}),
})

// Sequentially links floors[fi] → floors[fi+1] via a stairhead: floor fi's exitOrStaircase
// and floor fi+1's entrance both become { stairId: stairId(fi) }. Used for main-path chains
// (pyramid auto-multi-floor) — never touches the last floor's exit.
export const wireStaircases = (floors: FloorConfig[], stairId: (index: number) => string): void => {
  for (let fi = 0; fi < floors.length - 1; fi++) {
    const id = stairId(fi)
    floors[fi].exitOrStaircase = { stairId: id }
    floors[fi + 1].entrance = { stairId: id }
  }
}

// Wires floors[fi+1].entrance to whichever of floors[fi]'s own side sections ends in a
// stairhead — the shared floor-to-floor chaining mechanism for authored multi-floor sites,
// whether the shortcut is ward-gated by an external key (a pyramid's authored floors[]) or
// self-gated by the floor's own treasure (a tomb's shortcut — pyramid-interior-design.md
// §8, "the treasure IS the key"). Both are just a side section whose `end` is a stairhead.
export const wireSideSectionStaircases = (floors: FloorConfig[]): void => {
  for (let fi = 0; fi < floors.length - 1; fi++) {
    const stairSection = floors[fi].sideSections.find(s => typeof s.end === "object")
    if (stairSection && typeof stairSection.end === "object") {
      floors[fi + 1].entrance = { stairId: stairSection.end.stairId }
    }
  }
}

// ── Pyramid site construction ─────────────────────────────────────────────────

export type BuildSiteContext<TExtra extends string = never> = {
  journeyId: string
  tier: Tier
  pyramidIndex: number
  levelCount: number
  pathPuzzles: number
  constraint: PyramidConstraint
  difficulty: Difficulty
  hasMapPieceBranch: boolean
  hasWardGate: boolean
  nextTier: string | null
  mosaicPathCount: number
  resolveReward: ResolveReward<TExtra>
  resolveMainEndReward: (spec: RewardSpec) => TreasureReward
}

// Builds one site's floors (the 3 floor-shape branches: authored floors[], auto multi-floor
// mainFloors+wardWings, or a single floor), then assigns puzzle-solve rewards across the
// whole result (must run after ward wings/paths are appended, so their puzzles are eligible
// too — see the auto multi-floor branch below). Used for both pyramids (authored floors[]
// is the exception) and tombs (authored floors[] is the only shape they ever use, one entry
// per treasure) — a tomb is structurally the same as a pyramid interior
// (pyramid-interior-design.md §8), just always taking this one branch.
export const buildSite = <TExtra extends string = never>(ctx: BuildSiteContext<TExtra>): { floors: FloorConfig[] } => {
  const { journeyId, tier, pyramidIndex: i, levelCount, pathPuzzles: pp, constraint, difficulty, resolveReward } = ctx
  const { hasMapPieceBranch, hasWardGate, nextTier, mosaicPathCount, resolveMainEndReward } = ctx
  const rates = constraint.consumableRates ?? GLOBAL_DEFAULTS.consumableRates

  const mainEndReward: TreasureReward = constraint.mainEndReward
    ? resolveMainEndReward(constraint.mainEndReward)
    : { type: "fragmentSlot" }

  if (constraint.floors?.length) {
    // Multi-floor: build one FloorConfig per floors[] entry. Cast to the caller's own
    // TExtra reward vocabulary (e.g. a tomb's TombRewardHint) — resolveReward below
    // already understands it.
    const floors = constraint.floors as (FloorConstraint<TExtra> | null)[]
    const floorConfigs: FloorConfig[] = []
    for (let fi = 0; fi < floors.length; fi++) {
      const fc = floors[fi] ?? {}
      const floorPP = typeof fc.pathPuzzles === "number" ? fc.pathPuzzles : pp
      const floorDiff: Difficulty = fc.difficulty ?? difficulty
      const isLast = fi === floors.length - 1
      const floorSections = Array.isArray(fc.sideSections) ? fc.sideSections : undefined
      const floorSideSections = buildSideSections({
        tier,
        difficulty: floorDiff,
        resolveReward,
        // Per-floor-scoped, so each floor's auto-generated stairhead ids (e.g. a
        // "staircase"-ending side section) are globally unique across the whole site —
        // a plain site-level journeyId would let two floors' sections collide on the same
        // id, and the cross-floor teleport lookup (SiteMapScreen.tsx) would find whichever
        // floor happens to come first instead of the intended one.
        journeyId: `${journeyId}:${i}:floor${fi}`,
        constraintSections: floorSections,
      })
      const floorStraightness = fc.corridorStraightness ?? resolveCorridorStraightness(constraint, journeyId, i)
      const floorPacking = fc.packing ?? resolvePacking(constraint, journeyId, i)
      const floorSealed = fc.sealed ?? resolveSealed(constraint)
      // A floor's own reward can gate its own further shortcut (a tomb's self-referential
      // "treasure IS the key") — resolved per floor, falling back to the site-level reward
      // on the last floor only when this floor didn't declare its own.
      const floorMainEndReward =
        fc.mainEndReward !== undefined ? resolveReward(fc.mainEndReward) : isLast ? mainEndReward : undefined
      floorConfigs.push(
        buildFloor({
          pathPuzzles: floorPP,
          difficulty: floorDiff,
          sideSections: floorSideSections,
          mainEndReward: floorMainEndReward,
          encounter: fc.encounter,
          lastMainPuzzleFamily: fc.lastMainPuzzleFamily,
          corridorStraightness: floorStraightness,
          packing: floorPacking,
          sealed: floorSealed,
          encounterArgs: fc.encounterArgs,
        })
      )
    }
    wireSideSectionStaircases(floorConfigs)
    assignPuzzleRewards(`${journeyId}:${i}`, floorConfigs, rates)
    return { floors: floorConfigs }
  }

  if (
    (constraint.mainFloors ?? GLOBAL_DEFAULTS.mainFloors) > 1 ||
    (constraint.wardWings ?? GLOBAL_DEFAULTS.wardWings) > 0 ||
    (constraint.wardPaths ?? GLOBAL_DEFAULTS.wardPaths) > 0
  ) {
    // Auto multi-floor: `mainFloors` plain main-path floors (only the last one carries the
    // pyramid's usual side content), then ward return-content off that last main floor —
    // `wardWings` bonus floors and `wardPaths` single gated sections, each behind its own
    // ward-key gate from this tier's own tomb.
    const mainFloors = constraint.mainFloors ?? GLOBAL_DEFAULTS.mainFloors
    const wardWings = constraint.wardWings ?? GLOBAL_DEFAULTS.wardWings
    const wardPaths = constraint.wardPaths ?? GLOBAL_DEFAULTS.wardPaths
    const floorConfigs: FloorConfig[] = []

    for (let fi = 0; fi < mainFloors; fi++) {
      if (fi < mainFloors - 1) {
        // Non-last main floor (wizard's mainFloors:2 today): give it a real mainEndReward
        // (routed through the same fragmentSlot/assignFragments budget pipeline as every
        // other unset reward) instead of leaving it unset — an unset mainEndReward falls
        // back to a free, uncounted mosaicPiece at assembly time (siteAssembler.ts), which
        // this fixes.
        floorConfigs.push(
          buildFloor({ pathPuzzles: pp, difficulty, sideSections: [], mainEndReward: { type: "fragmentSlot" } })
        )
        continue
      }
      const constraintSections = Array.isArray(constraint.sideSections) ? constraint.sideSections : undefined
      const sideSections = buildSideSections({
        tier,
        difficulty,
        resolveReward,
        journeyId,
        constraintSections,
        hasMapPieceBranch,
        hasWardGate,
        nextTier,
        mosaicPathCount,
        mainPathPuzzles: pp,
        keyDensity: constraint.keyDensity,
        keyColors: resolveKeyColors(constraint, journeyId, i),
        pyramidIndex: i,
        declaredSidePaths: constraint.sidePaths,
        declaredHiddenPaths: constraint.hiddenPaths,
      })
      floorConfigs.push(
        buildFloor({
          pathPuzzles: pp,
          difficulty,
          sideSections,
          mainEndReward,
          corridorStraightness: resolveCorridorStraightness(constraint, journeyId, i),
          packing: resolvePacking(constraint, journeyId, i),
          sealed: resolveSealed(constraint),
        })
      )
    }

    // Wire main-floor stairheads sequentially (floor N's exit → floor N+1's entrance).
    wireStaircases(floorConfigs, fi => `${journeyId}:p${i}:main${fi}`)

    if (wardWings > 0 || wardPaths > 0) {
      const tombId = `${tier}_treasure_tomb`
      // One shared pool of free ward-key indices: wings take the first `wardWings`, paths the rest.
      const wardIndices = freeWardIndices(tombId, wardWings + wardPaths)
      const wingIndices = wardIndices.slice(0, wardWings)
      const pathIndices = wardIndices.slice(wardWings, wardWings + wardPaths)
      const lastMain = floorConfigs[floorConfigs.length - 1]

      // Ward wings: a whole ward-gated bonus floor, reached via a staircase side section.
      for (let w = 0; w < wingIndices.length; w++) {
        const wingStairId = `${journeyId}:p${i}:wing${w}`
        lastMain.sideSections = [
          ...lastMain.sideSections,
          {
            pathPuzzles: 1,
            difficulty,
            end: { stairId: wingStairId },
            gate: { type: "tomb-key", wardKeyId: TOMB_PERK_IDS[tombId][wingIndices[w]] },
          },
        ]
        floorConfigs.push(
          buildFloor({
            pathPuzzles: pp,
            difficulty,
            sideSections: [],
            entrance: { stairId: wingStairId },
            mainEndReward: { type: "fragmentSlot" },
          })
        )
      }

      // Ward paths: a single tomb-key gated side section with one fragment reward — cheaper
      // return-content than a whole wing. With wardPathTrapped, the earlier-half pyramids trap
      // their ward paths so the return trip costs consumables (raising their value).
      const trapWardPath = (constraint.wardPathTrapped ?? false) && i < Math.ceil(levelCount / 2)
      lastMain.sideSections = [
        ...lastMain.sideSections,
        ...pathIndices.map(idx => ({
          pathPuzzles: 1,
          difficulty,
          end: "treasure" as const,
          endReward: { type: "fragmentSlot" as const },
          gate: { type: "tomb-key" as const, wardKeyId: TOMB_PERK_IDS[tombId][idx] },
          ...(trapWardPath ? { encounter: "trap" } : {}),
        })),
      ]
    }

    assignPuzzleRewards(`${journeyId}:${i}`, floorConfigs, rates)
    return { floors: floorConfigs }
  }

  const constraintSections = Array.isArray(constraint.sideSections) ? constraint.sideSections : undefined
  const sideSections = buildSideSections({
    tier,
    difficulty,
    resolveReward,
    journeyId,
    constraintSections,
    hasMapPieceBranch,
    hasWardGate,
    nextTier,
    mosaicPathCount,
    mainPathPuzzles: pp,
    keyDensity: constraint.keyDensity,
    keyColors: resolveKeyColors(constraint, journeyId, i),
    pyramidIndex: i,
    declaredSidePaths: constraint.sidePaths,
    declaredHiddenPaths: constraint.hiddenPaths,
  })
  const floor = buildFloor({
    pathPuzzles: pp,
    difficulty,
    sideSections,
    mainEndReward,
    corridorStraightness: resolveCorridorStraightness(constraint, journeyId, i),
    packing: resolvePacking(constraint, journeyId, i),
    sealed: resolveSealed(constraint),
  })

  assignPuzzleRewards(`${journeyId}:${i}`, [floor], rates)
  return { floors: [floor] }
}
