import type { Difficulty, FloorConfig, SideSection, Tier, TreasureReward } from "./types"
import { TOMB_PERK_IDS, TREASURE_PERKS } from "../data/treasurePerks"
import { chestEveryFor, chestCountFor } from "./data"
import { GLOBAL_DEFAULTS } from "./spec/global"
import { mulberry32 } from "../game/random"
import { hashStr, rollConsumable } from "./rewards"
import { buildSideSections, type ResolveReward } from "./sideSections"
import type { PyramidConstraint, RewardSpec } from "./dsl"

// ── Chest rewards ─────────────────────────────────────────────────────────────

export const buildChestRewards = (
  journeyId: string,
  slotOffset: number,
  pathPuzzles: number,
  rates: { bandage: number; oil: number; trapTool: number } = GLOBAL_DEFAULTS.consumableRates
): TreasureReward[] => {
  const count = chestCountFor(pathPuzzles)
  return Array.from({ length: count }, (_, i) => ({
    type: "consumable" as const,
    consumable: rollConsumable(`${journeyId}:consumable:${slotOffset + i}`, rates),
  }))
}

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
  chestEvery: number
  difficulty: Difficulty
  sideSections: SideSection[]
  exitOrStaircase?: FloorConfig["exitOrStaircase"]
  entrance?: FloorConfig["entrance"]
  mainEndReward?: TreasureReward
  chestRewards?: TreasureReward[]
  puzzleFamily?: FloorConfig["puzzleFamily"]
  lastMainPuzzleFamily?: FloorConfig["lastMainPuzzleFamily"]
  consumableDensity?: number
  corridorStraightness?: number
  packing?: number
}

// The common FloorConfig skeleton shared by every pyramid and tomb floor — defaults to a
// plain exiting floor with no rewards; callers layer on what their site actually has.
export const buildFloor = (opts: BuildFloorOptions): FloorConfig => ({
  pathPuzzles: opts.pathPuzzles,
  chestEvery: opts.chestEvery,
  difficulty: opts.difficulty,
  end: "treasure",
  exitOrStaircase: opts.exitOrStaircase ?? "exit",
  sideSections: opts.sideSections,
  ...(opts.entrance ? { entrance: opts.entrance } : {}),
  ...(opts.mainEndReward ? { mainEndReward: opts.mainEndReward } : {}),
  ...(opts.chestRewards?.length ? { chestRewards: opts.chestRewards } : {}),
  ...(opts.puzzleFamily ? { puzzleFamily: opts.puzzleFamily } : {}),
  ...(opts.lastMainPuzzleFamily ? { lastMainPuzzleFamily: opts.lastMainPuzzleFamily } : {}),
  ...(opts.consumableDensity !== undefined ? { consumableDensity: opts.consumableDensity } : {}),
  ...(opts.corridorStraightness !== undefined ? { corridorStraightness: opts.corridorStraightness } : {}),
  ...(opts.packing !== undefined ? { packing: opts.packing } : {}),
})

// Sequentially links floors[fi] → floors[fi+1] via a stairhead: floor fi's exitOrStaircase
// and floor fi+1's entrance both become { stairId: stairId(fi) }. Used for main-path chains
// (pyramid auto-multi-floor, tomb floor-to-floor) — never touches the last floor's exit.
export const wireStaircases = (floors: FloorConfig[], stairId: (index: number) => string): void => {
  for (let fi = 0; fi < floors.length - 1; fi++) {
    const id = stairId(fi)
    floors[fi].exitOrStaircase = { stairId: id }
    floors[fi + 1].entrance = { stairId: id }
  }
}

// ── Pyramid site construction ─────────────────────────────────────────────────

export type BuildSiteContext = {
  journeyId: string
  tier: Tier
  pyramidIndex: number
  pathPuzzles: number
  constraint: PyramidConstraint
  difficulty: Difficulty
  hasMapPieceBranch: boolean
  hasWardGate: boolean
  nextTier: string | null
  mosaicPathCount: number
  chestOffset: number
  resolveReward: ResolveReward
  resolveMainEndReward: (spec: RewardSpec) => TreasureReward
}

// Builds one pyramid's floors (the 3 floor-shape branches: authored floors[], auto
// multi-floor mainFloors+wardWings, or a single floor) and the chest-slot offset consumed.
export const buildSite = (ctx: BuildSiteContext): { floors: FloorConfig[]; chestOffset: number } => {
  const { journeyId, tier, pyramidIndex: i, pathPuzzles: pp, constraint, difficulty, resolveReward } = ctx
  const { hasMapPieceBranch, hasWardGate, nextTier, mosaicPathCount, resolveMainEndReward } = ctx
  let chestOffset = ctx.chestOffset

  const mainEndReward: TreasureReward = constraint.mainEndReward
    ? resolveMainEndReward(constraint.mainEndReward)
    : { type: "fragmentSlot" }

  if (constraint.floors?.length) {
    // Multi-floor: build one FloorConfig per floors[] entry
    const floorConfigs: FloorConfig[] = []
    for (let fi = 0; fi < constraint.floors.length; fi++) {
      const fc = constraint.floors[fi] ?? {}
      const floorPP = typeof fc.pathPuzzles === "number" ? fc.pathPuzzles : pp
      const floorDiff: Difficulty = fc.difficulty ?? difficulty
      const isLast = fi === constraint.floors.length - 1
      const floorSections = Array.isArray(fc.sideSections) ? fc.sideSections : undefined
      const floorSideSections = buildSideSections({
        tier,
        difficulty: floorDiff,
        resolveReward,
        journeyId,
        constraintSections: floorSections,
      })
      const floorChests = buildChestRewards(journeyId, chestOffset, floorPP, constraint.consumableRates)
      chestOffset += chestCountFor(floorPP)
      const floorStraightness = fc.corridorStraightness ?? resolveCorridorStraightness(constraint, journeyId, i)
      const floorPacking = fc.packing ?? resolvePacking(constraint, journeyId, i)
      floorConfigs.push(
        buildFloor({
          pathPuzzles: floorPP,
          chestEvery: chestEveryFor(floorPP),
          difficulty: floorDiff,
          sideSections: floorSideSections,
          mainEndReward: isLast ? mainEndReward : undefined,
          chestRewards: floorChests,
          corridorStraightness: floorStraightness,
          packing: floorPacking,
        })
      )
    }
    // Wire each floor's side-path stairhead to the entrance of the next floor.
    for (let fi = 0; fi < floorConfigs.length - 1; fi++) {
      const stairSection = floorConfigs[fi].sideSections.find(s => typeof s.end === "object")
      if (stairSection && typeof stairSection.end === "object") {
        floorConfigs[fi + 1].entrance = { stairId: stairSection.end.stairId }
      }
    }
    return { floors: floorConfigs, chestOffset }
  }

  if (
    (constraint.mainFloors ?? GLOBAL_DEFAULTS.mainFloors) > 1 ||
    (constraint.wardWings ?? GLOBAL_DEFAULTS.wardWings) > 0
  ) {
    // Auto multi-floor: `mainFloors` plain main-path floors (only the last one carries
    // the pyramid's usual side content), then `wardWings` bonus floors branching off
    // that last main floor, each behind its own ward-key gate from this tier's own tomb.
    const mainFloors = constraint.mainFloors ?? GLOBAL_DEFAULTS.mainFloors
    const wardWings = constraint.wardWings ?? GLOBAL_DEFAULTS.wardWings
    const floorConfigs: FloorConfig[] = []

    for (let fi = 0; fi < mainFloors; fi++) {
      if (fi < mainFloors - 1) {
        floorConfigs.push(buildFloor({ pathPuzzles: pp, chestEvery: 0, difficulty, sideSections: [] }))
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
      const chestRewards = buildChestRewards(journeyId, chestOffset, pp, constraint.consumableRates)
      chestOffset += chestCountFor(pp)
      floorConfigs.push(
        buildFloor({
          pathPuzzles: pp,
          chestEvery: chestEveryFor(pp),
          difficulty,
          sideSections,
          mainEndReward,
          chestRewards,
          consumableDensity: constraint.consumableDensity,
          corridorStraightness: resolveCorridorStraightness(constraint, journeyId, i),
          packing: resolvePacking(constraint, journeyId, i),
        })
      )
    }

    // Wire main-floor stairheads sequentially (floor N's exit → floor N+1's entrance).
    wireStaircases(floorConfigs, fi => `${journeyId}:p${i}:main${fi}`)

    if (wardWings > 0) {
      const tombId = `${tier}_treasure_tomb`
      const wingIndices = freeWardIndices(tombId, wardWings)
      const lastMain = floorConfigs[floorConfigs.length - 1]
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
            chestEvery: chestEveryFor(pp),
            difficulty,
            sideSections: [],
            entrance: { stairId: wingStairId },
            mainEndReward: { type: "hieroglyphs" },
          })
        )
      }
    }

    return { floors: floorConfigs, chestOffset }
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
  const chestRewards = buildChestRewards(journeyId, chestOffset, pp, constraint.consumableRates)
  chestOffset += chestCountFor(pp)
  const floor = buildFloor({
    pathPuzzles: pp,
    chestEvery: chestEveryFor(pp),
    difficulty,
    sideSections,
    mainEndReward,
    chestRewards,
    consumableDensity: constraint.consumableDensity,
    corridorStraightness: resolveCorridorStraightness(constraint, journeyId, i),
    packing: resolvePacking(constraint, journeyId, i),
  })

  return { floors: [floor], chestOffset }
}
