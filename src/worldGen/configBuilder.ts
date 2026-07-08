import type { Difficulty, FloorConfig, SideSection, SiteConfig, Tier, TreasureReward } from "./types"
import {
  PYRAMID_JOURNEYS,
  TOMB_JOURNEYS,
  TOMB_SYMBOLS,
  HIEROGLYPH_REQUIRED,
  chestEveryFor,
  chestCountFor,
} from "./data"
import { TOMB_PERK_IDS, TREASURE_PERKS } from "../data/treasurePerks"
import { tableauLevels } from "../data/tableaus"
import { resolvePyramidConstraintWithProvenance, describeScope } from "./constraintResolver"
import type { Provenance } from "./constraintResolver"
import { worldSpec, WORLD_TARGETS } from "./worldSpec"
import { GLOBAL_DEFAULTS } from "./spec/global"
import type {
  PyramidConstraint,
  FloorConstraint,
  RewardHint,
  RewardSpec,
  SideSectionConstraint,
  SideIntensity,
  PathPuzzlesRange,
} from "./dsl"
import { mulberry32 } from "../game/random"
import { hashStr, hintToReward, rollConsumable, specToReward } from "./rewards"
import { buildSideSections, pathCountForDensity } from "./sideSections"

// ── Ward tier progression ─────────────────────────────────────────────────────

const NEXT_TIER: Record<string, string | null> = {
  starter: "junior",
  junior: "expert",
  expert: "master",
  master: "wizard",
  wizard: null,
}

// Ward-wing key indices for a tomb, skipping any slot reserved for a tier-unlock or
// location-key perk (those are spoken for elsewhere) — first `count` remaining indices.
const freeWardIndices = (tombId: string, count: number): number[] => {
  const perkIds = TOMB_PERK_IDS[tombId] ?? []
  const free: number[] = []
  for (let idx = 0; idx < perkIds.length && free.length < count; idx++) {
    const perk = TREASURE_PERKS[perkIds[idx]]
    if (perk?.type !== "tier-unlock" && perk?.type !== "location-key") free.push(idx)
  }
  return free
}

// Secondary tombs that need discovery — primary tomb ID → list of secondary tomb IDs.
// If a secondary tomb has no mapPiece/locationKey in any authored config, a locationKey
// is auto-injected as a side section on the primary tomb's last floor.
const SECONDARY_TOMBS: Record<string, string[]> = {
  expert_treasure_tomb: ["expert_treasure_tomb_b"],
  master_treasure_tomb: ["master_treasure_tomb_b"],
  wizard_treasure_tomb: ["wizard_treasure_tomb_b"],
  wizard_treasure_tomb_b: ["wizard_treasure_tomb_c"],
}

// ── Path puzzle scaling ───────────────────────────────────────────────────────

const isPathPuzzlesRange = (v: unknown): v is PathPuzzlesRange =>
  typeof v === "object" && v !== null && "start" in v && "end" in v

// Linear interpolation from range.start (pyramid 0) to range.end (the journey's last
// pyramid) — the only place puzzle counts vary across a journey without being spelled
// out one pyramid at a time. A bare number is never scaled; only an authored range is.
const interpolatePathPuzzles = (range: PathPuzzlesRange, i: number, total: number): number =>
  total <= 1 ? range.start : Math.round(range.start + (i / (total - 1)) * (range.end - range.start))

const resolvePathPuzzles = (value: number | PathPuzzlesRange, i: number, total: number): number =>
  isPathPuzzlesRange(value) ? interpolatePathPuzzles(value, i, total) : value

// ── Chest rewards ─────────────────────────────────────────────────────────────

const buildChestRewards = (
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

// ── Mosaic path distribution ──────────────────────────────────────────────────

const INTENSITY_PATHS: Record<SideIntensity, number> = { none: 0, low: 1, medium: 2, dense: 4 }

// Resolves the effective keyColors for a pyramid, honoring (in priority order):
// a literal keyColorsRange roll, a literal keyColors, then a sharedKeyChance roll — a hit
// resolves to 1 (one key, every gated door); a miss resolves to 5 (mostly-dedicated keys),
// since the buildSideSections default of "no keyColors set" already means 1 color and
// would make a miss indistinguishable from a hit.
const resolveKeyColors = (
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

const resolveCorridorStraightness = (constraint: PyramidConstraint, journeyId: string, pyramidIndex: number) =>
  resolveChanceValue(
    constraint.corridorStraightness,
    constraint.windyChance,
    constraint.windyStraightness ?? GLOBAL_DEFAULTS.windyStraightness,
    journeyId,
    pyramidIndex,
    "windy"
  )

const resolvePacking = (constraint: PyramidConstraint, journeyId: string, pyramidIndex: number) =>
  resolveChanceValue(
    constraint.packing,
    constraint.packingChance,
    constraint.packingWhenHit ?? GLOBAL_DEFAULTS.packingWhenHit,
    journeyId,
    pyramidIndex,
    "packing"
  )

const computeMosaicPaths = (plan: PyramidPlan[]): Map<string, number> => {
  let committed = 0
  for (const p of plan) {
    if (p.constraint.mainEndReward === "mosaicPiece") committed++
  }

  const explicitPaths = new Map<string, number>()
  const autoCandidates: PyramidPlan[] = []
  let explicitTotal = 0

  for (const p of plan) {
    const key = `${p.journeyId}:${p.pyramidIndex}`
    // Multi-floor pyramids with explicit floors[] are fully specified — exclude from auto-distribution
    if (p.constraint.floors?.length) {
      for (const floor of p.constraint.floors) {
        const floorSd = floor?.sideSections
        if (Array.isArray(floorSd)) committed += floorSd.filter(s => s.endReward === "mosaicPiece").length
      }
      explicitPaths.set(key, 0)
      continue
    }
    const sd = p.constraint.sideSections
    if (typeof sd === "string") {
      // SideIntensity → all side paths are mosaic, not an auto-candidate
      const count = INTENSITY_PATHS[sd as SideIntensity] ?? 0
      explicitPaths.set(key, count)
      explicitTotal += count
    } else if (typeof sd === "number") {
      explicitPaths.set(key, sd)
      explicitTotal += sd
    } else {
      // Array or undefined → auto-candidate; count explicitly specified mosaicPiece sections
      if (Array.isArray(sd)) {
        committed += sd.filter(s => s.endReward === "mosaicPiece").length
      }
      // Count mosaic paths from sidePaths/hiddenPaths declarations — those pyramids leave auto-pool.
      // mosaicPathCount is set to 0 so buildSideSections skips the auto-mosaic loop;
      // the declared hidden mosaics are built directly from constraints.
      const allDeclared = [...(p.constraint.sidePaths ?? []), ...(p.constraint.hiddenPaths ?? [])]
      const declaredMosaics = allDeclared.filter(e => e.end === "mosaic")
      if (declaredMosaics.length > 0) {
        const count = declaredMosaics.reduce(
          (sum, e) => sum + pathCountForDensity(e.density, p.journeyId, p.pyramidIndex),
          0
        )
        committed += count
        explicitPaths.set(key, 0) // buildSideSections handles these via declaredHiddenPaths
      } else {
        autoCandidates.push(p)
      }
    }
  }

  const remaining = WORLD_TARGETS.mosaicPieceRewards - committed - explicitTotal
  const result = new Map(explicitPaths)

  if (remaining > 0 && autoCandidates.length > 0) {
    const sorted = [...autoCandidates].sort((a, b) => b.pathPuzzles - a.pathPuzzles)
    for (let rem = remaining, i = 0; rem > 0; rem--, i++) {
      const p = sorted[i % sorted.length]
      const key = `${p.journeyId}:${p.pyramidIndex}`
      result.set(key, (result.get(key) ?? 0) + 1)
    }
  }

  return result
}

// ── Side sections ─────────────────────────────────────────────────────────────
// buildSideSections itself lives in ./sideSections — shared by pyramids and tombs.

// ── Phase 1: Build initial plan ───────────────────────────────────────────────

export type PyramidPlan = {
  journeyId: string
  tier: Tier
  pathPuzzles: number
  pyramidIndex: number
  levelCount: number
  constraint: PyramidConstraint
  provenance: Provenance
}

const buildPlan = (): PyramidPlan[] =>
  PYRAMID_JOURNEYS.flatMap(j =>
    Array.from({ length: j.levelCount }, (_, i) => {
      const { constraint, provenance } = resolvePyramidConstraintWithProvenance(
        worldSpec,
        j.id,
        j.tier as Tier,
        i,
        j.levelCount
      )
      // A bare number is always literal, no matter which scope authored it — a plain
      // pathPuzzles constraint never implicitly varies across a journey's pyramids. Only
      // an explicit PathPuzzlesRange spreads a count from its first to its last pyramid;
      // PathPuzzlesPreset strings aren't resolved anywhere yet, so fall back like unset.
      const pathPuzzlesValue: number | PathPuzzlesRange =
        typeof constraint.pathPuzzles === "number" || isPathPuzzlesRange(constraint.pathPuzzles)
          ? constraint.pathPuzzles
          : j.pathPuzzles
      return {
        journeyId: j.id,
        tier: j.tier as Tier,
        pyramidIndex: i,
        levelCount: j.levelCount,
        pathPuzzles: resolvePathPuzzles(pathPuzzlesValue, i, j.levelCount),
        constraint,
        provenance,
      }
    })
  )

// ── Phase 2: Assert chest capacity for fragment coverage ──────────────────────

const TOTAL_FRAGMENTS = Object.values(HIEROGLYPH_REQUIRED).reduce((sum, n) => sum + n, 0)

// Exported for testing. Throws if a pyramid with an explicit pathPuzzles constraint is too
// small; silently bumps unconstrained pyramids (those with no provenance on pathPuzzles).
export const assertChestCapacity = (plan: PyramidPlan[]): PyramidPlan[] => {
  const totalSlots = (p: PyramidPlan[]) => p.reduce((s, e) => s + chestCountFor(e.pathPuzzles), 0)
  if (totalSlots(plan) >= TOTAL_FRAGMENTS) return plan

  const mutable = plan.map(p => ({ ...p }))

  while (totalSlots(mutable) < TOTAL_FRAGMENTS) {
    // Bump the pyramid that gains the most chests per +1 PP (ties broken by lowest PP)
    mutable.sort(
      (a, b) =>
        chestCountFor(a.pathPuzzles + 1) -
          chestCountFor(a.pathPuzzles) -
          (chestCountFor(b.pathPuzzles + 1) - chestCountFor(b.pathPuzzles)) ||
        a.pathPuzzles - b.pathPuzzles ||
        // prefer unconstrained (no provenance) — keep explicit constraints at front, auto-correct at back
        (b.provenance.pathPuzzles ? 1 : 0) - (a.provenance.pathPuzzles ? 1 : 0)
    )
    const target = mutable[mutable.length - 1]
    if (target.provenance.pathPuzzles) {
      throw new Error(
        `[worldSpec] Not enough chest slots for all hieroglyph fragments.\n` +
          `  Pyramid journey='${target.journeyId}' index=${target.pyramidIndex + 1} has pathPuzzles=${target.pathPuzzles}\n` +
          `  explicitly set by ${describeScope(target.provenance.pathPuzzles)} — cannot auto-correct.\n` +
          `  Increase pathPuzzles in that rule or remove it to allow auto-correction.`
      )
    }
    target.pathPuzzles++
  }

  const expanded = mutable.filter((p, i) => p.pathPuzzles !== plan[i].pathPuzzles).length
  if (expanded > 0) console.log(`  ⚙ Auto-corrected: expanded ${expanded} unconstrained pyramid(s) for chest coverage`)
  return mutable
}

// ── Phase 4: Build SiteConfigs from plan ──────────────────────────────────────

const buildSiteConfigs = (plan: PyramidPlan[]): Record<string, SiteConfig[]> => {
  const configs: Record<string, SiteConfig[]> = {}
  const mosaicPaths = computeMosaicPaths(plan)

  // Group plan entries by journey
  const byJourney = new Map<string, PyramidPlan[]>()
  for (const p of plan) {
    const list = byJourney.get(p.journeyId) ?? []
    list.push(p)
    byJourney.set(p.journeyId, list)
  }

  for (const [journeyId, pyramids] of byJourney) {
    const { tier, levelCount } = pyramids[0]
    const nextTier = NEXT_TIER[tier] ?? null
    const mapPiecePyramid = Math.floor(levelCount / 2)

    const pyramidConfigs: SiteConfig[] = []
    let chestOffset = 0

    for (const p of pyramids) {
      const { pyramidIndex: i, pathPuzzles: pp, constraint } = p
      const difficulty: Difficulty = constraint.difficulty ?? "expert"

      const hasMapPieceBranch = i === mapPiecePyramid && tier !== "starter"
      const hasWardGate = i >= Math.ceil(levelCount / 2) && nextTier !== null

      const mainEndReward: TreasureReward = constraint.mainEndReward
        ? specToReward(constraint.mainEndReward, tier)
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
            resolveReward: spec => specToReward(spec, tier),
            journeyId,
            constraintSections: floorSections,
          })
          const floorChests = buildChestRewards(journeyId, chestOffset, floorPP, constraint.consumableRates)
          chestOffset += chestCountFor(floorPP)
          const floorStraightness = fc.corridorStraightness ?? resolveCorridorStraightness(constraint, journeyId, i)
          const floorPacking = fc.packing ?? resolvePacking(constraint, journeyId, i)
          floorConfigs.push({
            pathPuzzles: floorPP,
            chestEvery: chestEveryFor(floorPP),
            difficulty: floorDiff,
            end: "treasure",
            exitOrStaircase: "exit",
            sideSections: floorSideSections,
            ...(isLast ? { mainEndReward } : {}),
            ...(floorChests.length > 0 ? { chestRewards: floorChests } : {}),
            ...(fc.decorations?.length ? { decorations: fc.decorations } : {}),
            ...(floorStraightness !== undefined ? { corridorStraightness: floorStraightness } : {}),
            ...(floorPacking !== undefined ? { packing: floorPacking } : {}),
          } satisfies FloorConfig)
        }
        // Wire each floor's side-path stairhead to the entrance of the next floor.
        for (let fi = 0; fi < floorConfigs.length - 1; fi++) {
          const stairSection = floorConfigs[fi].sideSections.find(s => typeof s.end === "object")
          if (stairSection && typeof stairSection.end === "object") {
            floorConfigs[fi + 1].entrance = { stairId: stairSection.end.stairId }
          }
        }
        pyramidConfigs.push(floorConfigs)
      } else if (
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
            floorConfigs.push({
              pathPuzzles: pp,
              chestEvery: 0,
              difficulty,
              end: "treasure",
              exitOrStaircase: "exit",
              sideSections: [],
            })
            continue
          }
          const constraintSections = Array.isArray(constraint.sideSections) ? constraint.sideSections : undefined
          const mosaicPathCount = mosaicPaths.get(`${journeyId}:${i}`) ?? 0
          const sideSections = buildSideSections({
            tier,
            difficulty,
            resolveReward: spec => specToReward(spec, tier),
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
          const straightness = resolveCorridorStraightness(constraint, journeyId, i)
          const packing = resolvePacking(constraint, journeyId, i)
          floorConfigs.push({
            pathPuzzles: pp,
            chestEvery: chestEveryFor(pp),
            difficulty,
            end: "treasure",
            exitOrStaircase: "exit",
            sideSections,
            mainEndReward,
            chestRewards,
            ...(constraint.consumableDensity !== undefined ? { consumableDensity: constraint.consumableDensity } : {}),
            ...(straightness !== undefined ? { corridorStraightness: straightness } : {}),
            ...(packing !== undefined ? { packing } : {}),
          } satisfies FloorConfig)
        }

        // Wire main-floor stairheads sequentially (floor N's exit → floor N+1's entrance).
        for (let fi = 0; fi < floorConfigs.length - 1; fi++) {
          const stairId = `${journeyId}:p${i}:main${fi}`
          floorConfigs[fi].exitOrStaircase = { stairId }
          floorConfigs[fi + 1].entrance = { stairId }
        }

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
            floorConfigs.push({
              pathPuzzles: pp,
              chestEvery: chestEveryFor(pp),
              difficulty,
              end: "treasure",
              exitOrStaircase: "exit",
              entrance: { stairId: wingStairId },
              sideSections: [],
              mainEndReward: { type: "hieroglyphs" },
            })
          }
        }

        pyramidConfigs.push(floorConfigs)
      } else {
        const constraintSections = Array.isArray(constraint.sideSections) ? constraint.sideSections : undefined
        const mosaicPathCount = mosaicPaths.get(`${journeyId}:${i}`) ?? 0
        const sideSections = buildSideSections({
          tier,
          difficulty,
          resolveReward: spec => specToReward(spec, tier),
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
        const consumableDensity = constraint.consumableDensity
        const straightness = resolveCorridorStraightness(constraint, journeyId, i)
        const packing = resolvePacking(constraint, journeyId, i)
        pyramidConfigs.push([
          {
            pathPuzzles: pp,
            chestEvery: chestEveryFor(pp),
            difficulty,
            end: "treasure",
            exitOrStaircase: "exit",
            sideSections,
            mainEndReward,
            chestRewards,
            ...(consumableDensity !== undefined ? { consumableDensity } : {}),
            ...(straightness !== undefined ? { corridorStraightness: straightness } : {}),
            ...(packing !== undefined ? { packing } : {}),
          } satisfies FloorConfig,
        ])
      }
    }

    configs[journeyId] = pyramidConfigs
  }

  return configs
}

// ── Phase 5: Validate structural rewards ──────────────────────────────────────

const KNOWN_JOURNEY_IDS = new Set([...PYRAMID_JOURNEYS.map(j => j.id), ...TOMB_JOURNEYS.map(j => j.id)])

const validateRewardCounts = (configs: Record<string, SiteConfig[]>): void => {
  let mapPieces = 0
  let mosaicPieces = 0
  const unknownTombIds: string[] = []

  const checkReward = (r: TreasureReward | undefined) => {
    if (!r) return
    if (r.type === "mapPiece") {
      mapPieces++
      if (!KNOWN_JOURNEY_IDS.has(r.tombId)) unknownTombIds.push(r.tombId)
    }
    if (r.type === "mosaicPiece") mosaicPieces++
  }

  for (const [siteId, siteConfigs] of Object.entries(configs)) {
    for (const floors of siteConfigs) {
      for (let fi = 0; fi < floors.length; fi++) {
        const floor = floors[fi]
        const isLast = fi === floors.length - 1
        if (isLast && floor.exitOrStaircase !== "exit")
          throw new Error(
            `[worldSpec] Site "${siteId}" last floor has exitOrStaircase="${floor.exitOrStaircase}", expected "exit"`
          )
        checkReward(floor.mainEndReward)
        for (const r of floor.chestRewards ?? []) checkReward(r)
        for (const s of floor.sideSections) {
          checkReward(s.endReward)
          for (const sub of s.sideSections ?? []) checkReward(sub.endReward)
        }
      }
    }
  }

  if (unknownTombIds.length > 0)
    throw new Error(
      `[worldSpec] mapPiece rewards reference unknown journey IDs: ${[...new Set(unknownTombIds)].join(", ")}`
    )
  if (mapPieces !== WORLD_TARGETS.mapPieceRewards)
    throw new Error(`[worldSpec] Expected ${WORLD_TARGETS.mapPieceRewards} map pieces, got ${mapPieces}`)
  if (mosaicPieces !== WORLD_TARGETS.mosaicPieceRewards)
    throw new Error(`[worldSpec] Expected ${WORLD_TARGETS.mosaicPieceRewards} mosaic pieces, got ${mosaicPieces}`)
}

// ── Tomb configs ──────────────────────────────────────────────────────────────

const buildTombConfigs = (): Record<string, SiteConfig[]> => {
  const configs: Record<string, SiteConfig[]> = {}
  for (const tomb of TOMB_JOURNEYS) {
    // ponytail: pyramidIndex=0,levelCount=1 so tier-pyramid selectors like "last"/"first" always match
    const { constraint } = resolvePyramidConstraintWithProvenance(worldSpec, tomb.id, tomb.tier as Tier, 0, 1)
    const difficulty: Difficulty = constraint.difficulty ?? "starter"
    const puzzleFamily = (constraint.puzzleFamily ?? "tableau") as "sumplete" | "tableau"

    const perkIds = TOMB_PERK_IDS[tomb.id] ?? []

    // Starter tombs have no crocodile puzzle (compareAmount=0 in old system)
    const hasCroc = tomb.tier !== "starter"

    const levelCount = constraint.levelCount ?? tomb.levelCount
    const authoredFloors = constraint.floors as FloorConstraint<"tombTreasure">[] | undefined
    let perkIndex = 0

    const resolveTombReward = (reward: RewardSpec | "tombTreasure" | undefined): TreasureReward | undefined => {
      if (reward === "tombTreasure") {
        const perkId = perkIds[perkIndex++]
        return perkId ? { type: "tombKey", keyId: perkId } : undefined
      }
      if (reward) return hintToReward(reward as RewardHint, tomb.tier as Tier)
      return undefined
    }

    const floors: SiteConfig = Array.from({ length: levelCount }, (_, i) => {
      const isLast = i === levelCount - 1
      const authored = authoredFloors?.[i]

      const mainEndReward: TreasureReward | undefined = authored
        ? resolveTombReward(authored.mainEndReward)
        : (() => {
            const perkId = perkIds[perkIndex++]
            return perkId ? { type: "tombKey" as const, keyId: perkId } : undefined
          })()

      const sideSections: SideSection[] =
        authored && Array.isArray(authored.sideSections)
          ? buildSideSections({
              tier: tomb.tier,
              difficulty,
              resolveReward: resolveTombReward,
              journeyId: tomb.id,
              constraintSections: authored.sideSections as SideSectionConstraint<"tombTreasure">[],
            })
          : []

      const straightness = authored?.corridorStraightness ?? constraint.corridorStraightness
      const packing = authored?.packing ?? constraint.packing

      return {
        pathPuzzles: isLast && hasCroc ? 2 : 1,
        chestEvery: 0,
        difficulty,
        end: "treasure" as const,
        exitOrStaircase: isLast ? ("exit" as const) : { stairId: `${tomb.id}:floor${i}` },
        ...(i > 0 ? { entrance: { stairId: `${tomb.id}:floor${i - 1}` } } : {}),
        sideSections,
        puzzleFamily,
        ...(isLast && hasCroc ? { lastMainPuzzleFamily: "crocodile" as const } : {}),
        ...(mainEndReward ? { mainEndReward } : {}),
        ...(authored?.decorations?.length ? { decorations: authored.decorations } : {}),
        ...(straightness !== undefined ? { corridorStraightness: straightness } : {}),
        ...(packing !== undefined ? { packing } : {}),
      }
    })

    configs[tomb.id] = [floors]
  }
  return configs
}

// ── Phase 7: Validate discovery graph ────────────────────────────────────────

// Collect all tombIds that have a mapPiece reward in any config OTHER than their own site
const collectDiscoveredBy = (configs: Record<string, SiteConfig[]>): Map<string, Set<string>> => {
  const discovered = new Map<string, Set<string>>()
  for (const [siteId, siteConfigs] of Object.entries(configs)) {
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        const checkReward = (r: TreasureReward | undefined) => {
          if (r?.type !== "mapPiece" || r.tombId === siteId) return
          const set = discovered.get(r.tombId) ?? new Set()
          set.add(siteId)
          discovered.set(r.tombId, set)
        }
        checkReward(floor.mainEndReward)
        for (const s of floor.sideSections) {
          checkReward(s.endReward)
          for (const sub of s.sideSections ?? []) checkReward(sub.endReward)
        }
        for (const r of floor.chestRewards ?? []) checkReward(r)
      }
    }
  }
  return discovered
}

// Validate that every secondary tomb has a mapPiece reward reachable before it's needed.
// Throws with a clear message listing any unreachable secondary tombs (missing or circular).
const validateDiscovery = (allConfigs: Record<string, SiteConfig[]>): void => {
  const allSecondary = new Set(Object.values(SECONDARY_TOMBS).flat())
  const discoveredBy = collectDiscoveredBy(allConfigs)

  // BFS: start from non-secondary sites (auto-discovered), expand when mapPiece host is reachable
  const reachable = new Set(Object.keys(allConfigs).filter(id => !allSecondary.has(id)))
  let changed = true
  while (changed) {
    changed = false
    for (const secId of allSecondary) {
      if (reachable.has(secId)) continue
      const hosts = discoveredBy.get(secId)
      if (hosts && [...hosts].some(h => reachable.has(h))) {
        reachable.add(secId)
        changed = true
      }
    }
  }

  const unreachable = [...allSecondary].filter(id => !reachable.has(id))
  if (unreachable.length > 0) {
    throw new Error(
      `[worldSpec] Unsolvable discovery graph — these secondary tombs are unreachable:\n` +
        unreachable.map(id => `  - ${id} (no mapPiece found in a reachable site)`).join("\n")
    )
  }
}

// ── Phase 9f: Fragment assignment ────────────────────────────────────────────

const TIERS: Tier[] = ["starter", "junior", "expert", "master", "wizard"]

export type SlotRef = {
  journeyId: string
  tier: Tier
  journeyOrderIndex: number
  wardKeys: string[]
  isPlaceholder: boolean
  assign: (r: TreasureReward) => void
}

export type HieroglyphPlacementInfo = {
  hieroglyphId: string
  tier: Tier
  preferredWardKeys: string[]
  required: number
}

export const collectSlots = (allConfigs: Record<string, SiteConfig[]>): SlotRef[] => {
  const slots: SlotRef[] = []

  for (const [journeyId, siteConfigs] of Object.entries(allConfigs)) {
    const journey = PYRAMID_JOURNEYS.find(j => j.id === journeyId)
    if (!journey) continue

    const tier = journey.tier as Tier
    const journeyOrderIndex = PYRAMID_JOURNEYS.indexOf(journey)

    const addSlot = (wardKeys: string[], isPlaceholder: boolean, assign: (r: TreasureReward) => void) =>
      slots.push({ journeyId, tier, journeyOrderIndex, wardKeys, isPlaceholder, assign })

    for (const floors of siteConfigs) {
      for (const floor of floors) {
        if (floor.mainEndReward?.type === "fragmentSlot") {
          const f = floor
          addSlot([], true, r => {
            f.mainEndReward = r
          })
        }
        for (const section of floor.sideSections) {
          const sWardKeys = section.gate?.type === "tomb-key" ? [section.gate.wardKeyId] : []
          if (section.endReward?.type === "fragmentSlot") {
            const s = section
            addSlot(sWardKeys, true, r => {
              s.endReward = r
            })
          } else if (section.gate?.type === "tomb-key" && !section.endReward) {
            const s = section
            addSlot(sWardKeys, false, r => {
              s.endReward = r
            })
          }
          for (const sub of section.sideSections ?? []) {
            const subWardKeys = [...sWardKeys, ...(sub.gate?.type === "tomb-key" ? [sub.gate.wardKeyId] : [])]
            if (sub.endReward?.type === "fragmentSlot") {
              const ss = sub
              addSlot(subWardKeys, true, r => {
                ss.endReward = r
              })
            } else if (sub.gate?.type === "tomb-key" && !sub.endReward) {
              const ss = sub
              addSlot(subWardKeys, false, r => {
                ss.endReward = r
              })
            }
          }
        }
      }
    }
  }

  return slots
}

export const buildPlacementInfos = (): HieroglyphPlacementInfo[] => {
  const infos: HieroglyphPlacementInfo[] = []
  const seen = new Set<string>()

  for (const tier of TIERS) {
    const tombId = `${tier}_treasure_tomb`
    const tombPerkIds = TOMB_PERK_IDS[tombId] ?? []

    for (const hieroglyphId of TOMB_SYMBOLS[tier as Tier]) {
      if (seen.has(hieroglyphId)) continue
      seen.add(hieroglyphId)

      const firstRunNumber = tableauLevels
        .filter(t => t.tombJourneyId === tombId && t.inventoryIds.includes(hieroglyphId))
        .reduce((min, t) => Math.min(min, t.runNumber), Infinity)

      const runNumber = isFinite(firstRunNumber) ? firstRunNumber : 1
      // Ward keys earned after completing runs 1..(runNumber-1) gate the preferred slots.
      // run 1 → no wards needed; run 2 → tombPerkIds[0]; run 3 → tombPerkIds[0..1]; etc.
      const preferredWardKeys = tombPerkIds.slice(0, runNumber - 1)

      infos.push({
        hieroglyphId,
        tier: tier as Tier,
        preferredWardKeys,
        required: HIEROGLYPH_REQUIRED[hieroglyphId] ?? 2,
      })
    }
  }

  return infos
}

const assignFragments = (allConfigs: Record<string, SiteConfig[]>): void => {
  const slots = collectSlots(allConfigs)
  const infos = buildPlacementInfos()
  const available = [...slots]

  const placedInJourney = new Map<string, Set<string>>()
  for (const j of PYRAMID_JOURNEYS) placedInJourney.set(j.id, new Set())

  let totalPlaced = 0

  for (const info of infos) {
    const needed = info.required
    let placed = 0

    // Pools in priority order:
    // 0 — tier-matching slots behind preferred ward keys (run 2+ fragments go here first)
    // 1 — tier-matching open slots (no ward)
    // 2 — any remaining slots (cross-tier fallback)
    const pools = [
      available.filter(
        s =>
          s.tier === info.tier &&
          info.preferredWardKeys.length > 0 &&
          s.wardKeys.some(k => info.preferredWardKeys.includes(k))
      ),
      available.filter(s => s.tier === info.tier && s.wardKeys.length === 0),
      available.filter(s => s.tier !== info.tier),
    ]

    for (const pool of pools) {
      if (placed >= needed) break

      // First pass: respect 1-per-journey
      for (const slot of [...pool]) {
        if (placed >= needed) break
        const idx = available.indexOf(slot)
        if (idx === -1) continue
        if (placedInJourney.get(slot.journeyId)?.has(info.hieroglyphId)) continue
        slot.assign({ type: "hieroglyphFragment", hieroglyphId: info.hieroglyphId })
        placedInJourney.get(slot.journeyId)!.add(info.hieroglyphId)
        available.splice(idx, 1)
        placed++
      }

      if (placed >= needed) break

      // Second pass: relax 1-per-journey if pool exhausted
      for (const slot of [...pool]) {
        if (placed >= needed) break
        const idx = available.indexOf(slot)
        if (idx === -1) continue
        slot.assign({ type: "hieroglyphFragment", hieroglyphId: info.hieroglyphId })
        available.splice(idx, 1)
        placed++
      }
    }

    totalPlaced += placed
    if (placed < needed) {
      console.warn(`  ⚠ ${info.hieroglyphId} (${info.tier}): placed ${placed}/${needed} — not enough fragment slots`)
    }
  }

  // Fill remaining placeholder slots with consumables
  const rates = GLOBAL_DEFAULTS.consumableRates
  let fallbackIdx = 0
  for (const slot of available) {
    if (!slot.isPlaceholder) continue
    const consumable = rollConsumable(`${slot.journeyId}:fragment-fallback:${fallbackIdx++}`, rates)
    slot.assign({ type: "consumable", consumable })
  }

  console.log(`  ✓ Fragment assignment: ${totalPlaced} fragments placed`)
}

// ── Main entry point ──────────────────────────────────────────────────────────

export const buildConfigs = (): Record<string, SiteConfig[]> => {
  // Phase 1: Resolve constraints + compute per-pyramid path puzzle counts
  const plan = buildPlan()

  // Phase 2: Build SiteConfigs for pyramids (fragmentSlot sentinels in place)
  const pyramidConfigs = buildSiteConfigs(plan)

  // Phase 3: Build tomb site configs
  const tombConfigs = buildTombConfigs()

  // Phase 4: Assign hieroglyph fragments to fragmentSlot positions; fill remainder with consumables
  const allConfigs = { ...pyramidConfigs, ...tombConfigs }
  assignFragments(allConfigs)

  // Phase 5+7: Validate all configs together — reward counts, staircase guardrail,
  // tomb ID references, and discovery graph solvability
  validateRewardCounts(allConfigs)
  validateDiscovery(allConfigs)

  return allConfigs
}
