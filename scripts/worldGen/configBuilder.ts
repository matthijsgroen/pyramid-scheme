import type { Difficulty, FloorConfig, SideSection, SiteConfig, Tier, TreasureReward, ChestSlotPlan } from "./types"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS, TOMB_SYMBOLS, FRAGMENT_COUNT, chestEveryFor, chestCountFor } from "./data"
import { computeFragmentAssignments } from "./fragmentAssigner"
import { resolvePyramidConstraint } from "./constraintResolver"
import { worldSpec, WORLD_TARGETS } from "../worldSpec"
import type { PyramidConstraint, RewardHint, RewardSpec, GateSpec, SideSectionConstraint } from "./dsl"
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
      // ponytail: type hint only; actual hieroglyphId comes from fragmentAssigner
      return { type: "hieroglyphs" }
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
): { type: "floor-key" } | { type: "tomb-key"; wardKeyId: string } | undefined => {
  if (spec == null) return undefined
  if (typeof spec === "string") return spec === "floor-key" ? { type: "floor-key" } : undefined
  const wardKeyId = TOMB_WARD_KEYS[spec.tombId]
  if (!wardKeyId) throw new Error(`[worldSpec] No ward key found for tombId "${spec.tombId}"`)
  return { type: "tomb-key", wardKeyId }
}

// ── Chest rewards ─────────────────────────────────────────────────────────────

const buildChestRewards = (
  journeyId: string,
  slotOffset: number,
  pathPuzzles: number,
  assignments: Assignment[]
): TreasureReward[] => {
  const count = chestCountFor(pathPuzzles)
  const slots: TreasureReward[] = Array(count).fill({ type: "hieroglyphs" } as TreasureReward)
  for (const a of assignments.filter(a => a.journeyId === journeyId)) {
    const localIdx = a.slotIndex - slotOffset
    if (localIdx >= 0 && localIdx < count) {
      slots[localIdx] = { type: "hieroglyphFragment", hieroglyphId: a.hieroglyphId }
    }
  }
  return slots
}

// ── Side sections ─────────────────────────────────────────────────────────────

const buildSideSections = (
  tier: string,
  difficulty: Difficulty,
  hasMapPieceBranch: boolean,
  hasWardGate: boolean,
  nextTier: string | null,
  constraintSections?: SideSectionConstraint[]
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

      const mainEndReward: TreasureReward = constraint.mainEndReward
        ? specToReward(constraint.mainEndReward, tier)
        : { type: "hieroglyphs" }

      const constraintSections = Array.isArray(constraint.sideSections)
        ? (constraint.sideSections as SideSectionConstraint[])
        : undefined
      const sideSections = buildSideSections(
        tier,
        difficulty,
        hasMapPieceBranch,
        hasWardGate,
        nextTier,
        constraintSections
      )
      const chestRewards = buildChestRewards(journeyId, chestOffset, pp, assignments)
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

    configs[journeyId] = pyramidConfigs
  }

  return configs
}

// ── Phase 5: Validate structural rewards ──────────────────────────────────────

const validateRewardCounts = (configs: Record<string, SiteConfig[]>): void => {
  const tierByJourney = Object.fromEntries(PYRAMID_JOURNEYS.map(j => [j.id, j.tier as Tier]))
  const mosaicByTier: Record<Tier, number> = { starter: 0, junior: 0, expert: 0, master: 0, wizard: 0 }
  let mapPieces = 0
  let mosaicPieces = 0

  for (const [journeyId, siteConfigs] of Object.entries(configs)) {
    const tier = tierByJourney[journeyId]
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        if (floor.mainEndReward?.type === "mapPiece") mapPieces++
        if (floor.mainEndReward?.type === "mosaicPiece") {
          mosaicPieces++
          mosaicByTier[tier]++
        }
        for (const s of floor.sideSections) {
          if (s.endReward?.type === "mapPiece") mapPieces++
        }
      }
    }
  }

  if (mapPieces !== WORLD_TARGETS.mapPieceRewards)
    throw new Error(`[worldSpec] Expected ${WORLD_TARGETS.mapPieceRewards} map pieces, got ${mapPieces}`)
  if (mosaicPieces !== WORLD_TARGETS.mosaicPieceRewards)
    throw new Error(`[worldSpec] Expected ${WORLD_TARGETS.mosaicPieceRewards} mosaic pieces, got ${mosaicPieces}`)
  const mosaicPerTier = WORLD_TARGETS.mosaicPieceRewards / Object.keys(mosaicByTier).length
  for (const [t, count] of Object.entries(mosaicByTier) as [Tier, number][]) {
    if (count !== mosaicPerTier)
      throw new Error(`[worldSpec] Expected ${mosaicPerTier} mosaic pieces for ${t} tier, got ${count}`)
  }
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
