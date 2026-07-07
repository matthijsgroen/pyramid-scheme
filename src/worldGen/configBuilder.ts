import type { ConsumableType, Difficulty, FloorConfig, SideSection, SiteConfig, Tier, TreasureReward } from "./types"
import {
  PYRAMID_JOURNEYS,
  TOMB_JOURNEYS,
  TOMB_SYMBOLS,
  HIEROGLYPH_REQUIRED,
  chestEveryFor,
  chestCountFor,
} from "./data"
import { TOMB_PERK_IDS, TIER_UNLOCK_PERK_ID } from "../data/treasurePerks"
import { tableauLevels } from "../data/tableaus"
import { resolvePyramidConstraintWithProvenance, describeScope } from "./constraintResolver"
import type { Provenance } from "./constraintResolver"
import { worldSpec, WORLD_TARGETS } from "./worldSpec"
import type {
  PyramidConstraint,
  FloorConstraint,
  RewardHint,
  RewardSpec,
  GateSpec,
  SideSectionConstraint,
  SideIntensity,
  KeyColor,
  PathEntry,
  PathPuzzlesRange,
} from "./dsl"
import { mulberry32 } from "../game/random"

// ── Ward tier progression ─────────────────────────────────────────────────────

const NEXT_TIER: Record<string, string | null> = {
  starter: "junior",
  junior: "expert",
  expert: "master",
  master: "wizard",
  wizard: null,
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

// ── Reward resolution ─────────────────────────────────────────────────────────

const hintToReward = (hint: RewardHint, tier: Tier): TreasureReward => {
  switch (hint) {
    case "mosaicPiece":
      return { type: "mosaicPiece" }
    case "mapPiece":
      return { type: "mapPiece", tombId: `${tier}_treasure_tomb` }
    case "hieroglyphs":
      return { type: "hieroglyphs" }
    case "hieroglyphFragment":
      return { type: "hieroglyphFragment", hieroglyphId: TOMB_SYMBOLS[tier][0] }
  }
}

// Translates a RewardSpec (string hint or structured object) to a TreasureReward
const specToReward = (spec: RewardSpec, tier: Tier): TreasureReward => {
  if (typeof spec === "string") return hintToReward(spec, tier)
  return spec as TreasureReward
}

// Translates a GateSpec to the runtime GateConfig form (undefined = no gate)
export const specToGate = (
  spec: GateSpec | undefined
): { type: "floor-key"; color?: string } | { type: "tomb-key"; wardKeyId: string } | undefined => {
  if (spec == null) return undefined
  if (typeof spec === "string") return spec === "floor-key" ? { type: "floor-key", color: "blue" } : undefined
  if (spec.type === "floor-key") return { type: "floor-key", color: spec.color ?? "blue" }
  const wardKeyId = TOMB_PERK_IDS[spec.tombId]?.[spec.index]
  if (!wardKeyId) return undefined
  return { type: "tomb-key", wardKeyId }
}

// ── Chest rewards ─────────────────────────────────────────────────────────────

const DEFAULT_CONSUMABLE_RATES = { bandage: 3, oil: 1, trapTool: 1 }

const buildChestRewards = (
  journeyId: string,
  slotOffset: number,
  pathPuzzles: number,
  rates: { bandage: number; oil: number; trapTool: number } = DEFAULT_CONSUMABLE_RATES
): TreasureReward[] => {
  const count = chestCountFor(pathPuzzles)
  const total = rates.bandage + rates.oil + rates.trapTool
  return Array.from({ length: count }, (_, i) => {
    const roll = hashStr(`${journeyId}:consumable:${slotOffset + i}`) % total
    const consumable: ConsumableType =
      roll < rates.bandage ? "bandage" : roll < rates.bandage + rates.oil ? "oil" : "trapTool"
    return { type: "consumable", consumable }
  })
}

// ── Mosaic path distribution ──────────────────────────────────────────────────

const INTENSITY_PATHS: Record<SideIntensity, number> = { none: 0, low: 1, medium: 2, dense: 4 }

// Simple deterministic hash for per-pyramid seeding of density ranges
const hashStr = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h >>> 0
}

// Returns the seeded path count for a density level (medium=2-3, dense=4-5, others fixed)
export const pathCountForDensity = (density: SideIntensity, journeyId: string, pyramidIndex: number): number => {
  if (density === "none") return 0
  if (density === "low") return 1
  const rand = mulberry32(hashStr(`${journeyId}:${pyramidIndex}`))
  if (density === "medium") return 2 + Math.floor(rand() * 2) // 2 or 3
  return 4 + Math.floor(rand() * 2) // 4 or 5
}

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

const ALL_KEY_COLORS: KeyColor[] = ["blue", "red", "green", "yellow", "purple"]
const DENSITY_FRACTION: Record<SideIntensity, number> = { none: 0, low: 0.33, medium: 0.5, dense: 1.0 }

const CONSUMABLE_THRESHOLDS = [5, 8] as const // <5 → bandage, <8 → oil, else → trapTool

const pathEndToReward = (end: string, tier: string, index = 0): TreasureReward | undefined => {
  if (end === "mosaic") return { type: "mosaicPiece" }
  if (end === "fragment") {
    return { type: "fragmentSlot" }
  }
  if (end === "consumable") {
    const roll = hashStr(`${tier}:consumable:${index}`) % 10
    const consumable =
      roll < CONSUMABLE_THRESHOLDS[0] ? "bandage" : roll < CONSUMABLE_THRESHOLDS[1] ? "oil" : "trapTool"
    return { type: "consumable", consumable }
  }
  return undefined // "treasure" = no specific endReward
}

const buildSideSections = (
  tier: string,
  difficulty: Difficulty,
  hasMapPieceBranch: boolean,
  hasWardGate: boolean,
  nextTier: string | null,
  constraintSections: SideSectionConstraint[] | undefined,
  mosaicPathCount: number,
  mainPathPuzzles: number,
  keyDensity?: SideIntensity,
  keyColors?: number,
  journeyId?: string,
  pyramidIndex?: number,
  declaredSidePaths?: PathEntry[],
  declaredHiddenPaths?: PathEntry[]
): SideSection[] => {
  const sections: SideSection[] = []

  if (hasMapPieceBranch) {
    const tombId = `${tier}_treasure_tomb`
    sections.push({ pathPuzzles: 0, difficulty, end: "treasure", endReward: { type: "mapPiece", tombId } })
  }

  if (hasWardGate && nextTier) {
    const wardKeyId = TIER_UNLOCK_PERK_ID[tier]
    if (wardKeyId) {
      sections.push({
        pathPuzzles: 0,
        difficulty,
        end: "treasure",
        gate: { type: "tomb-key", wardKeyId },
      })
    }
  }

  // DSL-specified additional sections (appended after hardcoded ones)
  for (const cs of constraintSections ?? []) {
    const gate = specToGate(cs.gate)
    const endReward = cs.endReward ? specToReward(cs.endReward, tier as Tier) : undefined
    const subSections = cs.sideSections?.map(sub => {
      const subGate = specToGate(sub.gate)
      const subEndReward = sub.endReward ? specToReward(sub.endReward, tier as Tier) : undefined
      return {
        pathPuzzles: typeof sub.pathPuzzles === "number" ? sub.pathPuzzles : 0,
        difficulty: sub.difficulty ?? difficulty,
        end: "treasure" as const,
        ...(subGate ? { gate: subGate } : {}),
        ...(subEndReward ? { endReward: subEndReward } : {}),
        ...(sub.decorations?.length ? { decorations: sub.decorations } : {}),
      }
    })
    const end =
      cs.end === "staircase" ? { stairId: `${journeyId}:side${sections.length}` } : ("treasure" as const)
    sections.push({
      pathPuzzles: typeof cs.pathPuzzles === "number" ? cs.pathPuzzles : 0,
      difficulty: cs.difficulty ?? difficulty,
      end,
      ...(gate ? { gate } : {}),
      ...(endReward ? { endReward } : {}),
      ...(subSections?.length ? { sideSections: subSections } : {}),
      ...(cs.decorations?.length ? { decorations: cs.decorations } : {}),
      ...(cs.hidden ? { hidden: true } : {}),
      ...(cs.trapped ? { trapped: true } : {}),
    })
  }

  // Auto/density mosaic side paths — apply key gating by density + color count
  const gatedCount = keyDensity ? Math.round(mosaicPathCount * DENSITY_FRACTION[keyDensity]) : 0
  const colorCount = Math.min(keyColors ?? 1, 5)
  const mosaicPP = Math.max(0, Math.round(mainPathPuzzles / 3))
  for (let j = 0; j < mosaicPathCount; j++) {
    const gate = j < gatedCount ? { type: "floor-key" as const, color: ALL_KEY_COLORS[j % colorCount] } : undefined
    sections.push({
      pathPuzzles: mosaicPP,
      difficulty,
      end: "treasure",
      endReward: { type: "mosaicPiece" },
      ...(gate ? { gate } : {}),
    })
  }

  // Declared sidePaths / hiddenPaths from DSL
  const jId = journeyId ?? ""
  const pIdx = pyramidIndex ?? 0
  let consumableIdx = 0
  for (const entry of declaredSidePaths ?? []) {
    const count = pathCountForDensity(entry.density, jId, pIdx)
    for (let j = 0; j < count; j++) {
      const endReward = pathEndToReward(entry.end, tier, consumableIdx++)
      sections.push({
        pathPuzzles: entry.pathPuzzles,
        difficulty,
        end: "treasure",
        ...(endReward ? { endReward } : {}),
        ...(entry.trapped ? { trapped: true } : {}),
      })
    }
  }
  for (const entry of declaredHiddenPaths ?? []) {
    const count = pathCountForDensity(entry.density, jId, pIdx)
    for (let j = 0; j < count; j++) {
      const endReward = pathEndToReward(entry.end, tier, consumableIdx++)
      sections.push({
        pathPuzzles: entry.pathPuzzles,
        difficulty,
        end: "treasure",
        hidden: true,
        ...(endReward ? { endReward } : {}),
        ...(entry.trapped ? { trapped: true } : {}),
      })
    }
  }

  return sections
}

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
          const floorSideSections = buildSideSections(
            tier,
            floorDiff,
            false,
            false,
            null,
            floorSections,
            0,
            floorPP,
            undefined,
            undefined,
            journeyId
          )
          const floorChests = buildChestRewards(journeyId, chestOffset, floorPP, constraint.consumableRates)
          chestOffset += chestCountFor(floorPP)
          const floorStraightness = fc.corridorStraightness ?? constraint.corridorStraightness
          const floorPacking = fc.packing ?? constraint.packing
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
      } else {
        const constraintSections = Array.isArray(constraint.sideSections) ? constraint.sideSections : undefined
        const mosaicPathCount = mosaicPaths.get(`${journeyId}:${i}`) ?? 0
        const sideSections = buildSideSections(
          tier,
          difficulty,
          hasMapPieceBranch,
          hasWardGate,
          nextTier,
          constraintSections,
          mosaicPathCount,
          pp,
          constraint.keyDensity,
          constraint.keyColors,
          journeyId,
          i,
          constraint.sidePaths,
          constraint.hiddenPaths
        )
        const chestRewards = buildChestRewards(journeyId, chestOffset, pp, constraint.consumableRates)
        chestOffset += chestCountFor(pp)
        const consumableDensity = constraint.consumableDensity
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
            ...(constraint.corridorStraightness !== undefined
              ? { corridorStraightness: constraint.corridorStraightness }
              : {}),
            ...(constraint.packing !== undefined ? { packing: constraint.packing } : {}),
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

    const resolveTombReward = (reward: string | undefined): TreasureReward | undefined => {
      if (reward === "tombTreasure") {
        const perkId = perkIds[perkIndex++]
        return perkId ? { type: "tombKey", keyId: perkId } : undefined
      }
      if (reward) return hintToReward(reward as RewardHint, tomb.tier as Tier)
      return undefined
    }

    const buildSideSections = (sections: SideSectionConstraint<"tombTreasure">[]): SideSection[] =>
      sections.map(s => ({
        pathPuzzles: typeof s.pathPuzzles === "number" ? s.pathPuzzles : 0,
        difficulty,
        end: "treasure" as const,
        ...(specToGate(s.gate) ? { gate: specToGate(s.gate) } : {}),
        ...(s.endReward !== undefined ? { endReward: resolveTombReward(s.endReward as string) } : {}),
        ...(Array.isArray(s.sideSections) && s.sideSections.length > 0
          ? { sideSections: buildSideSections(s.sideSections as SideSectionConstraint<"tombTreasure">[]) }
          : {}),
        ...(s.decorations?.length ? { decorations: s.decorations } : {}),
      }))

    const floors: SiteConfig = Array.from({ length: levelCount }, (_, i) => {
      const isLast = i === levelCount - 1
      const authored = authoredFloors?.[i]

      const mainEndReward: TreasureReward | undefined = authored
        ? resolveTombReward(authored.mainEndReward as string | undefined)
        : (() => {
            const perkId = perkIds[perkIndex++]
            return perkId ? { type: "tombKey" as const, keyId: perkId } : undefined
          })()

      const sideSections: SideSection[] =
        authored && Array.isArray(authored.sideSections)
          ? buildSideSections(authored.sideSections as SideSectionConstraint<"tombTreasure">[])
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
  const total = DEFAULT_CONSUMABLE_RATES.bandage + DEFAULT_CONSUMABLE_RATES.oil + DEFAULT_CONSUMABLE_RATES.trapTool
  let fallbackIdx = 0
  for (const slot of available) {
    if (!slot.isPlaceholder) continue
    const roll = hashStr(`${slot.journeyId}:fragment-fallback:${fallbackIdx++}`) % total
    const consumable: ConsumableType =
      roll < DEFAULT_CONSUMABLE_RATES.bandage
        ? "bandage"
        : roll < DEFAULT_CONSUMABLE_RATES.bandage + DEFAULT_CONSUMABLE_RATES.oil
          ? "oil"
          : "trapTool"
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
