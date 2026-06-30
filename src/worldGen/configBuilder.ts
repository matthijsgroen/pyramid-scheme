import type { Difficulty, FloorConfig, SideSection, SiteConfig, Tier, TreasureReward, ChestSlotPlan } from "./types"
import {
  PYRAMID_JOURNEYS,
  TOMB_JOURNEYS,
  TOMB_SYMBOLS,
  HIEROGLYPH_REQUIRED,
  chestEveryFor,
  chestCountFor,
} from "./data"
import { tableauLevels } from "../data/tableaus"
import { computeFragmentAssignments } from "./fragmentAssigner"
import { resolvePyramidConstraintWithProvenance, describeScope } from "./constraintResolver"
import type { Provenance } from "./constraintResolver"
import { worldSpec, WORLD_TARGETS } from "./worldSpec"
import type {
  PyramidConstraint,
  RewardHint,
  RewardSpec,
  GateSpec,
  SideSectionConstraint,
  SideIntensity,
  KeyColor,
  PathEntry,
} from "./dsl"
import { mulberry32 } from "../game/random"
import type { Assignment } from "./types"

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

// Ward key required by back-half pyramids of each tier (key comes from prev tier's tomb)
const PREV_TIER: Partial<Record<string, string>> = {
  junior: "starter",
  expert: "junior",
  master: "expert",
  wizard: "master",
}

// ── Path puzzle scaling ───────────────────────────────────────────────────────

const scalePP = (basePP: number, i: number, total: number): number => {
  if (total <= 1) return basePP
  const t = i / (total - 1)
  return Math.max(1, Math.round(basePP - 1 + t * 2))
}

// ── Reward resolution ─────────────────────────────────────────────────────────

const hintToReward = (hint: RewardHint, tier: Tier): TreasureReward => {
  switch (hint) {
    case "mosaicPiece":
      return { type: "mosaicPiece" }
    case "mapPiece":
      return { type: "mapPiece", tombId: `${tier}_treasure_tomb` }
    case "hieroglyphs":
      return { type: "hieroglyphs" }
    case "tombKey":
      return { type: "tombKey", keyId: `${tier}_ward` }
    case "hieroglyphFragment":
      return { type: "hieroglyphFragment", hieroglyphId: TOMB_SYMBOLS[tier][0] }
  }
}

// Translates a RewardSpec (string hint or structured object) to a TreasureReward
const specToReward = (spec: RewardSpec, tier: Tier): TreasureReward => {
  if (typeof spec === "string") return hintToReward(spec, tier)
  return spec as TreasureReward
}

// tombId → wardKeyId: primary tombs each yield a ward key on their last floor
const TOMB_WARD_KEYS: Record<string, string> = {
  starter_treasure_tomb: "starter_ward",
  junior_treasure_tomb: "junior_ward",
  expert_treasure_tomb: "expert_ward",
  master_treasure_tomb: "master_ward",
  wizard_treasure_tomb: "wizard_ward",
  wizard_treasure_tomb_b: "wizard_b_ward",
}

// Translates a GateSpec to the runtime GateConfig form (undefined = no gate)
export const specToGate = (
  spec: GateSpec | undefined
): { type: "floor-key"; color?: string } | { type: "tomb-key"; wardKeyId: string } | undefined => {
  if (spec == null) return undefined
  if (typeof spec === "string") return spec === "floor-key" ? { type: "floor-key", color: "blue" } : undefined
  if (spec.type === "floor-key") return { type: "floor-key", color: spec.color ?? "blue" }
  const wardKeyId = TOMB_WARD_KEYS[spec.tombId]
  if (!wardKeyId) throw new Error(`[worldSpec] No ward key found for tombId "${spec.tombId}"`)
  return { type: "tomb-key", wardKeyId }
}

// ── Chest rewards ─────────────────────────────────────────────────────────────

const buildChestRewards = (
  journeyId: string,
  tier: Tier,
  slotOffset: number,
  pathPuzzles: number,
  assignments: Assignment[]
): TreasureReward[] => {
  const count = chestCountFor(pathPuzzles)
  const slots: TreasureReward[] = Array(count).fill(null)
  for (const a of assignments.filter(a => a.journeyId === journeyId)) {
    const localIdx = a.slotIndex - slotOffset
    if (localIdx >= 0 && localIdx < count) {
      slots[localIdx] = { type: "hieroglyphFragment", hieroglyphId: a.hieroglyphId }
    }
  }
  // Fill any unassigned slots with tier symbols (deterministic cycle by absolute slot index)
  const tierSymbols = TOMB_SYMBOLS[tier]
  for (let i = 0; i < count; i++) {
    if (!slots[i]) {
      slots[i] = { type: "hieroglyphFragment", hieroglyphId: tierSymbols[(slotOffset + i) % tierSymbols.length] }
    }
  }
  return slots as TreasureReward[]
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
const pathCountForDensity = (density: SideIntensity, journeyId: string, pyramidIndex: number): number => {
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

const pathEndToReward = (end: string, tier: string): TreasureReward | undefined => {
  if (end === "mosaic") return { type: "mosaicPiece" }
  if (end === "fragment") {
    const symbols = TOMB_SYMBOLS[tier as Tier]
    return { type: "hieroglyphFragment", hieroglyphId: symbols[0] }
  }
  return undefined // "treasure" = no specific endReward, just chest room
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
    const prevTierKey = PREV_TIER[tier]
    if (prevTierKey) {
      sections.push({
        pathPuzzles: 0,
        difficulty,
        end: "treasure",
        gate: { type: "tomb-key", wardKeyId: `${prevTierKey}_ward` },
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
      }
    })
    sections.push({
      pathPuzzles: typeof cs.pathPuzzles === "number" ? cs.pathPuzzles : 0,
      difficulty: cs.difficulty ?? difficulty,
      end: "treasure" as const,
      ...(gate ? { gate } : {}),
      ...(endReward ? { endReward } : {}),
      ...(subSections?.length ? { sideSections: subSections } : {}),
    })
  }

  // Auto/density mosaic side paths — apply key gating by density + color count
  const gatedCount = keyDensity ? Math.round(mosaicPathCount * DENSITY_FRACTION[keyDensity]) : 0
  const colorCount = Math.min(keyColors ?? 1, 5)
  const mosaicPP = Math.max(1, Math.round(mainPathPuzzles / 3))
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
  for (const entry of declaredSidePaths ?? []) {
    const count = pathCountForDensity(entry.density, jId, pIdx)
    const endReward = pathEndToReward(entry.end, tier)
    for (let j = 0; j < count; j++) {
      sections.push({
        pathPuzzles: entry.pathPuzzles,
        difficulty,
        end: "treasure",
        ...(endReward ? { endReward } : {}),
      })
    }
  }
  for (const entry of declaredHiddenPaths ?? []) {
    const count = pathCountForDensity(entry.density, jId, pIdx)
    const endReward = pathEndToReward(entry.end, tier)
    for (let j = 0; j < count; j++) {
      sections.push({
        pathPuzzles: entry.pathPuzzles,
        difficulty,
        end: "treasure",
        hidden: true,
        ...(endReward ? { endReward } : {}),
      })
    }
  }

  return sections
}

// ── Phase 1: Build initial plan ───────────────────────────────────────────────

export type PyramidPlan = ChestSlotPlan & {
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
      const basePP =
        constraint.pathPuzzles !== undefined && typeof constraint.pathPuzzles === "number"
          ? constraint.pathPuzzles
          : j.pathPuzzles
      return {
        journeyId: j.id,
        tier: j.tier as Tier,
        pyramidIndex: i,
        levelCount: j.levelCount,
        pathPuzzles: scalePP(basePP, i, j.levelCount),
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

// ── Phase 3 + 4: Build SiteConfigs from plan + assignments ────────────────────

const buildSiteConfigs = (plan: PyramidPlan[], assignments: Assignment[]): Record<string, SiteConfig[]> => {
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

      const tierSymbols = TOMB_SYMBOLS[tier]
      const mainEndReward: TreasureReward = constraint.mainEndReward
        ? specToReward(constraint.mainEndReward, tier)
        : { type: "hieroglyphFragment", hieroglyphId: tierSymbols[i % tierSymbols.length] }

      if (constraint.floors?.length) {
        // Multi-floor: build one FloorConfig per floors[] entry
        const floorConfigs: FloorConfig[] = []
        for (let fi = 0; fi < constraint.floors.length; fi++) {
          const fc = constraint.floors[fi] ?? {}
          const floorPP = typeof fc.pathPuzzles === "number" ? fc.pathPuzzles : pp
          const floorDiff: Difficulty = fc.difficulty ?? difficulty
          const isLast = fi === constraint.floors.length - 1
          const floorSections = Array.isArray(fc.sideSections) ? fc.sideSections : undefined
          const floorSideSections = buildSideSections(tier, floorDiff, false, false, null, floorSections, 0, floorPP)
          const floorChests = buildChestRewards(journeyId, tier, chestOffset, floorPP, assignments)
          chestOffset += chestCountFor(floorPP)
          floorConfigs.push({
            pathPuzzles: floorPP,
            chestEvery: chestEveryFor(floorPP),
            difficulty: floorDiff,
            end: "treasure",
            exitOrStaircase: "exit",
            sideSections: floorSideSections,
            ...(isLast ? { mainEndReward } : {}),
            ...(floorChests.length > 0 ? { chestRewards: floorChests } : {}),
          } satisfies FloorConfig)
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
        const chestRewards = buildChestRewards(journeyId, tier, chestOffset, pp, assignments)
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

    // Last floor always rewards the tomb's ward key so pyramid ward gates can be unlocked
    const wardKeyId = TOMB_WARD_KEYS[tomb.id]
    const lastFloorReward: TreasureReward | undefined = wardKeyId ? { type: "tombKey", keyId: wardKeyId } : undefined

    // Starter tombs have no crocodile puzzle (compareAmount=0 in old system)
    const hasCroc = tomb.tier !== "starter"

    const floors: SiteConfig = Array.from({ length: tomb.levelCount }, (_, i) => {
      const isLast = i === tomb.levelCount - 1
      return {
        pathPuzzles: isLast && hasCroc ? 2 : 1,
        chestEvery: 0,
        difficulty,
        end: "treasure" as const,
        exitOrStaircase: isLast ? ("exit" as const) : ("staircase" as const),
        sideSections: [],
        puzzleFamily,
        ...(isLast && hasCroc ? { lastMainPuzzleFamily: "crocodile" as const } : {}),
        ...(isLast && lastFloorReward ? { mainEndReward: lastFloorReward } : {}),
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

// ── Phase 9f: Hieroglyph availability validator ───────────────────────────────

const TIERS: Tier[] = ["starter", "junior", "expert", "master", "wizard"]
const TIER_INDEX: Record<string, number> = Object.fromEntries(TIERS.map((t, i) => [t, i]))

// hieroglyphId → its tier (from TOMB_SYMBOLS)
const TIER_BY_SYMBOL: Map<string, Tier> = new Map(
  TIERS.flatMap(tier => TOMB_SYMBOLS[tier].map(id => [id, tier] as [string, Tier]))
)

const isSectionOpen = (
  gate: { type: "floor-key"; color?: string } | { type: "tomb-key"; wardKeyId: string } | undefined,
  wardKeys: Set<string>
): boolean => {
  if (!gate) return true
  if (gate.type === "floor-key") return true
  return wardKeys.has(gate.wardKeyId)
}

// Count fragments of hieroglyphId accessible to the player given current progression state.
const countAccessibleFragments = (
  hieroglyphId: string,
  accessibleTierMax: number,
  wardKeys: Set<string>,
  allConfigs: Record<string, SiteConfig[]>
): number => {
  let count = 0
  for (const [journeyId, siteConfigs] of Object.entries(allConfigs)) {
    const journey = PYRAMID_JOURNEYS.find(j => j.id === journeyId)
    if (!journey || TIER_INDEX[journey.tier] > accessibleTierMax) continue
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        for (const r of floor.chestRewards ?? []) {
          if (r.type === "hieroglyphFragment" && r.hieroglyphId === hieroglyphId) count++
        }
        for (const s of floor.sideSections) {
          if (!isSectionOpen(s.gate, wardKeys)) continue
          if (s.endReward?.type === "hieroglyphFragment" && s.endReward.hieroglyphId === hieroglyphId) count++
          for (const sub of s.sideSections ?? []) {
            if (!isSectionOpen(sub.gate, wardKeys)) continue
            if (sub.endReward?.type === "hieroglyphFragment" && sub.endReward.hieroglyphId === hieroglyphId) count++
          }
        }
      }
    }
  }
  return count
}

// Add one explicit fragment chest to the most appropriate accessible pyramid of targetTier.
// Priority: empty ward section → new ungated side section.
const addFragmentChest = (
  hieroglyphId: string,
  targetTier: Tier,
  accessibleTierMax: number,
  wardKeys: Set<string>,
  allConfigs: Record<string, SiteConfig[]>
): void => {
  // 1. Fill an empty ward section of targetTier (thematically appropriate)
  for (const [journeyId, siteConfigs] of Object.entries(allConfigs)) {
    const journey = PYRAMID_JOURNEYS.find(j => j.id === journeyId && j.tier === targetTier)
    if (!journey || TIER_INDEX[journey.tier] > accessibleTierMax) continue
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        for (const s of floor.sideSections) {
          if (s.gate?.type === "tomb-key" && wardKeys.has(s.gate.wardKeyId) && !s.endReward) {
            s.endReward = { type: "hieroglyphFragment", hieroglyphId }
            console.log(`  ✎ ${hieroglyphId}: filled empty ward section in ${journeyId}`)
            return
          }
        }
      }
    }
  }

  // 2. Add new ungated side section to first accessible targetTier pyramid
  for (const [journeyId, siteConfigs] of Object.entries(allConfigs)) {
    const journey = PYRAMID_JOURNEYS.find(j => j.id === journeyId && j.tier === targetTier)
    if (!journey || TIER_INDEX[journey.tier] > accessibleTierMax) continue
    const floor = siteConfigs[0]?.[0]
    if (!floor) continue
    floor.sideSections.push({
      pathPuzzles: 0,
      difficulty: floor.difficulty,
      end: "treasure",
      endReward: { type: "hieroglyphFragment", hieroglyphId },
    })
    console.log(`  ✎ ${hieroglyphId}: added ungated chest to ${journeyId}`)
    return
  }

  console.warn(`  ⚠ ${hieroglyphId}: no accessible ${targetTier} pyramid to place fragment in`)
}

// Simulates player progression and ensures every tableau's required hieroglyphs are findable
// in the player's accessible area at that point. Fixes deficits by adding explicit chest rewards.
// Validates run 1 only for each primary tomb (multi-run structure is deferred).
const validateAndFixHieroglyphAvailability = (allConfigs: Record<string, SiteConfig[]>): void => {
  let accessibleTierMax = 0 // starts at starter (index 0)
  const wardKeys = new Set<string>()
  let fixCount = 0

  for (const tier of TIERS) {
    // Primary tomb only (not _b / _c variants — those share the same symbol pool)
    const tomb = TOMB_JOURNEYS.find(t => t.tier === (tier as Tier) && !t.id.includes("_b") && !t.id.includes("_c"))
    if (!tomb) continue

    // Check each floor (= one tableau in run 1)
    for (let level = 1; level <= tomb.levelCount; level++) {
      const hieroglyphs =
        tableauLevels.find(t => t.tombJourneyId === tomb.id && t.runNumber === 1 && t.levelNr === level)
          ?.inventoryIds ?? []

      for (const hieroglyphId of hieroglyphs) {
        const symbolTier = TIER_BY_SYMBOL.get(hieroglyphId)
        if (!symbolTier) continue
        const needed = HIEROGLYPH_REQUIRED[hieroglyphId] ?? 2
        const accessible = countAccessibleFragments(hieroglyphId, accessibleTierMax, wardKeys, allConfigs)
        if (accessible < needed) {
          console.log(
            `  ✎ Tableau ${tomb.id}.run1_level${level}: ${hieroglyphId} (${symbolTier}) has ${accessible}/${needed} accessible — adding ${needed - accessible} chest(s)`
          )
          for (let d = accessible; d < needed; d++) {
            addFragmentChest(hieroglyphId, tier as Tier, accessibleTierMax, wardKeys, allConfigs)
            fixCount++
          }
        }
      }
    }

    // After completing this tomb, grant ward key and expand accessible tier
    const wardKeyId = TOMB_WARD_KEYS[tomb.id]
    if (wardKeyId) {
      wardKeys.add(wardKeyId)
      const nextTier = NEXT_TIER[tier]
      if (nextTier) accessibleTierMax = TIER_INDEX[nextTier]
    }
  }

  if (fixCount > 0) {
    console.log(`  ✎ Hieroglyph availability: added ${fixCount} chest(s) to ensure tableau coverage`)
  } else {
    console.log(`  ✓ Hieroglyph availability: all tableau hieroglyphs reachable — no fixes needed`)
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

export const buildConfigs = (): Record<string, SiteConfig[]> => {
  // Phase 1: Resolve constraints + compute per-pyramid path puzzle counts
  const plan = buildPlan()

  // Phase 2: Ensure enough chest slots — throws if an explicit pathPuzzles constraint is too small
  const adjustedPlan = assertChestCapacity(plan)

  // Phase 3: Assign fragments to chest slots using the corrected plan
  const assignments = computeFragmentAssignments(adjustedPlan)

  // Phase 4: Build SiteConfigs for pyramids
  const pyramidConfigs = buildSiteConfigs(adjustedPlan, assignments)

  // Phase 6: Build tomb site configs
  const tombConfigs = buildTombConfigs()

  // Phase 9f: Ensure tableau hieroglyphs are findable before each tableau is encountered.
  // Mutates pyramid configs in-place (adds side sections) when coverage is insufficient.
  const allConfigs = { ...pyramidConfigs, ...tombConfigs }
  validateAndFixHieroglyphAvailability(allConfigs)

  // Phase 5+7: Validate all configs together — reward counts, staircase guardrail,
  // tomb ID references, and discovery graph solvability
  validateRewardCounts(allConfigs)
  validateDiscovery(allConfigs)

  return allConfigs
}
