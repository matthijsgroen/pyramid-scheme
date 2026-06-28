import type { Difficulty, FloorConfig, SideSection, SiteConfig, Tier, TreasureReward, ChestSlotPlan } from "./types"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS, TOMB_SYMBOLS, FRAGMENT_COUNT, chestEveryFor, chestCountFor } from "./data"
import { computeFragmentAssignments } from "./fragmentAssigner"
import { resolvePyramidConstraint } from "./constraintResolver"
import { worldSpec, WORLD_TARGETS } from "../worldSpec"
import type {
  PyramidConstraint,
  RewardHint,
  RewardSpec,
  GateSpec,
  SideSectionConstraint,
  SideIntensity,
  KeyColor,
} from "./dsl"
import type { Assignment } from "./types"

// ── Ward tier progression ─────────────────────────────────────────────────────

const NEXT_TIER: Record<string, string | null> = {
  starter: "junior",
  junior: "expert",
  expert: "master",
  master: "wizard",
  wizard: null,
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

const INTENSITY_PATHS: Record<SideIntensity, number> = { none: 0, sparse: 1, normal: 2, dense: 4 }

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
      autoCandidates.push(p)
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
const DENSITY_FRACTION: Record<SideIntensity, number> = { none: 0, sparse: 0.33, normal: 0.5, dense: 1.0 }

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
  keyColors?: number
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
    sections.push({
      pathPuzzles: typeof cs.pathPuzzles === "number" ? cs.pathPuzzles : 0,
      difficulty: cs.difficulty ?? difficulty,
      end: "treasure" as const,
      ...(gate ? { gate } : {}),
      ...(endReward ? { endReward } : {}),
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

  return sections
}

// ── Phase 1: Build initial plan ───────────────────────────────────────────────

type PyramidPlan = ChestSlotPlan & {
  pyramidIndex: number
  levelCount: number
  constraint: PyramidConstraint
}

const buildPlan = (): PyramidPlan[] =>
  PYRAMID_JOURNEYS.flatMap(j =>
    Array.from({ length: j.levelCount }, (_, i) => {
      const constraint = resolvePyramidConstraint(worldSpec, j.id, j.tier as Tier, i, j.levelCount)
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
      }
    })
  )

// ── Phase 2: Auto-correct for fragment chest coverage ─────────────────────────

const TOTAL_FRAGMENTS = (Object.keys(TOMB_SYMBOLS) as Tier[]).reduce(
  (sum, tier) => sum + TOMB_SYMBOLS[tier].length * FRAGMENT_COUNT[tier],
  0
)

const autoCorrectPlan = (plan: PyramidPlan[]): PyramidPlan[] => {
  const slots = () => plan.reduce((s, p) => s + chestCountFor(p.pathPuzzles), 0)
  if (slots() >= TOTAL_FRAGMENTS) return plan

  console.log(`  ⚙ Auto-correct: need ${TOTAL_FRAGMENTS - slots()} more chest slots — expanding smallest pyramids`)
  const mutable = plan.map(p => ({ ...p }))

  while (mutable.reduce((s, p) => s + chestCountFor(p.pathPuzzles), 0) < TOTAL_FRAGMENTS) {
    // Bump the pyramid that gains the most chests per +1 PP, breaking ties by current PP
    mutable.sort(
      (a, b) =>
        chestCountFor(a.pathPuzzles + 1) -
          chestCountFor(a.pathPuzzles) -
          (chestCountFor(b.pathPuzzles + 1) - chestCountFor(b.pathPuzzles)) || a.pathPuzzles - b.pathPuzzles
    )
    mutable[mutable.length - 1].pathPuzzles++
  }

  const expanded = mutable.filter((p, i) => p.pathPuzzles !== plan[i].pathPuzzles).length
  console.log(`  ✓ Expanded ${expanded} pyramid(s)`)
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
      const difficulty: Difficulty = constraint.difficulty ?? "medium"

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
          constraint.keyColors
        )
        const chestRewards = buildChestRewards(journeyId, tier, chestOffset, pp, assignments)
        chestOffset += chestCountFor(pp)
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
          } satisfies FloorConfig,
        ])
      }
    }

    configs[journeyId] = pyramidConfigs
  }

  return configs
}

// ── Phase 5: Validate structural rewards ──────────────────────────────────────

const validateRewardCounts = (configs: Record<string, SiteConfig[]>): void => {
  let mapPieces = 0
  let mosaicPieces = 0

  for (const siteConfigs of Object.values(configs)) {
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        if (floor.mainEndReward?.type === "mapPiece") mapPieces++
        if (floor.mainEndReward?.type === "mosaicPiece") mosaicPieces++
        for (const s of floor.sideSections) {
          if (s.endReward?.type === "mapPiece") mapPieces++
          if (s.endReward?.type === "mosaicPiece") mosaicPieces++
        }
      }
    }
  }

  if (mapPieces !== WORLD_TARGETS.mapPieceRewards)
    throw new Error(`[worldSpec] Expected ${WORLD_TARGETS.mapPieceRewards} map pieces, got ${mapPieces}`)
  if (mosaicPieces !== WORLD_TARGETS.mosaicPieceRewards)
    throw new Error(`[worldSpec] Expected ${WORLD_TARGETS.mosaicPieceRewards} mosaic pieces, got ${mosaicPieces}`)
}

// ── Tomb configs ──────────────────────────────────────────────────────────────

const buildTombConfigs = (): Record<string, SiteConfig[]> => {
  const configs: Record<string, SiteConfig[]> = {}
  for (const tomb of TOMB_JOURNEYS) {
    // ponytail: pyramidIndex=0,levelCount=1 so tier-pyramid selectors like "last"/"first" always match;
    // constraint.mainEndReward is intentionally ignored here — tombs don't use pyramid end rewards
    const constraint = resolvePyramidConstraint(worldSpec, tomb.id, tomb.tier as Tier, 0, 1)
    const difficulty: Difficulty = constraint.difficulty ?? "easy"
    const puzzleFamily = (constraint.puzzleFamily ?? "tableau") as "sumplete" | "tableau"

    const lastFloorReward: TreasureReward | undefined = constraint.mainEndReward
      ? specToReward(constraint.mainEndReward, tomb.tier as Tier)
      : undefined

    const floors: SiteConfig = Array.from({ length: tomb.levelCount }, (_, i) => {
      const isLast = i === tomb.levelCount - 1
      return {
        pathPuzzles: 1,
        chestEvery: 0, // tomb floors have no chests; the puzzle node is the reward
        difficulty,
        end: "treasure" as const,
        exitOrStaircase: isLast ? ("exit" as const) : ("staircase" as const),
        sideSections: [],
        puzzleFamily,
        ...(isLast && lastFloorReward ? { mainEndReward: lastFloorReward } : {}),
      }
    })

    configs[tomb.id] = [floors]
  }
  return configs
}

// ── Main entry point ──────────────────────────────────────────────────────────

export const buildConfigs = (): Record<string, SiteConfig[]> => {
  // Phase 1: Resolve constraints + compute per-pyramid path puzzle counts
  const plan = buildPlan()

  // Phase 2: Ensure enough chest slots for all hieroglyph fragments
  const adjustedPlan = autoCorrectPlan(plan)

  // Phase 3: Assign fragments to chest slots using the corrected plan
  const assignments = computeFragmentAssignments(adjustedPlan)

  // Phase 4: Build SiteConfigs for pyramids
  const pyramidConfigs = buildSiteConfigs(adjustedPlan, assignments)

  // Phase 5: Validate structural rewards (fail hard on violations)
  validateRewardCounts(pyramidConfigs)

  // Phase 6: Build tomb site configs
  const tombConfigs = buildTombConfigs()

  return { ...pyramidConfigs, ...tombConfigs }
}
