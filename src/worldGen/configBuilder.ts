import type { Difficulty, FloorConfig, SideSection, SiteConfig, Tier, TreasureReward } from "./types"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS, HIEROGLYPH_REQUIRED, chestCountFor, chestEveryFor } from "./data"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import { resolvePyramidConstraintWithProvenance, describeScope } from "./constraintResolver"
import type { Provenance } from "./constraintResolver"
import { worldSpec } from "./worldSpec"
import type {
  PyramidConstraint,
  FloorConstraint,
  RewardHint,
  RewardSpec,
  SideSectionConstraint,
  PathPuzzlesRange,
  TombRewardHint,
} from "./dsl"
import { hintToReward, specToReward } from "./rewards"
import { buildSideSections } from "./sideSections"
import { buildChestRewards, buildFloor, buildSite, wireStaircases } from "./buildSite"
import { computeMosaicPaths } from "./mosaics"
import { assignFragments } from "./fragments"
import { validateDiscovery, validateRewardCounts } from "./validate"
import { PYRAMID_CAPABILITIES, TOMB_CAPABILITIES } from "./capabilities"

// ── Ward tier progression ─────────────────────────────────────────────────────

const NEXT_TIER: Record<string, string | null> = {
  starter: "junior",
  junior: "expert",
  expert: "master",
  master: "wizard",
  wizard: null,
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

// Tombs' own chest capacity (fixed floor pathPuzzles, mirrors buildTombConfigs) — counts
// toward the same fragment-coverage budget pyramids are checked against below.
const TOMB_CHEST_CAPACITY = TOMB_CAPABILITIES.placeChests
  ? TOMB_JOURNEYS.reduce((sum, tomb) => {
      const hasCroc = tomb.tier !== "starter"
      return (
        sum +
        Array.from({ length: tomb.levelCount }, (_, i) =>
          chestCountFor(i === tomb.levelCount - 1 && hasCroc ? 2 : 1)
        ).reduce((a, b) => a + b, 0)
      )
    }, 0)
  : 0

// Exported for testing. Throws if a pyramid with an explicit pathPuzzles constraint is too
// small; silently bumps unconstrained pyramids (those with no provenance on pathPuzzles).
export const assertChestCapacity = (plan: PyramidPlan[]): PyramidPlan[] => {
  const totalSlots = (p: PyramidPlan[]) => p.reduce((s, e) => s + chestCountFor(e.pathPuzzles), 0) + TOMB_CHEST_CAPACITY
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

      const { floors, chestOffset: nextChestOffset } = buildSite({
        journeyId,
        tier,
        pyramidIndex: i,
        pathPuzzles: pp,
        constraint,
        difficulty,
        hasMapPieceBranch: PYRAMID_CAPABILITIES.emitMapPiece && i === mapPiecePyramid && tier !== "starter",
        hasWardGate: i >= Math.ceil(levelCount / 2) && nextTier !== null,
        nextTier,
        mosaicPathCount: PYRAMID_CAPABILITIES.emitMosaics ? (mosaicPaths.get(`${journeyId}:${i}`) ?? 0) : 0,
        chestOffset,
        resolveReward: spec => specToReward(spec, tier),
        resolveMainEndReward: spec => specToReward(spec, tier),
      })
      chestOffset = nextChestOffset
      pyramidConfigs.push(floors)
    }

    configs[journeyId] = pyramidConfigs
  }

  return configs
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
    const authoredFloors = constraint.floors as FloorConstraint<TombRewardHint>[] | undefined
    let perkIndex = 0
    let chestOffset = 0

    const resolveTombReward = (reward: RewardSpec | TombRewardHint | undefined): TreasureReward | undefined => {
      if (reward === "tombTreasure") {
        const perkId = perkIds[perkIndex++]
        return perkId ? { type: "tombKey", keyId: perkId } : undefined
      }
      if (reward === "fragmentSlot") return { type: "fragmentSlot" }
      if (reward) return hintToReward(reward as RewardHint, tomb.tier as Tier)
      return undefined
    }

    const floors: FloorConfig[] = Array.from({ length: levelCount }, (_, i) => {
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
              constraintSections: authored.sideSections as SideSectionConstraint<TombRewardHint>[],
            })
          : []

      const straightness = authored?.corridorStraightness ?? constraint.corridorStraightness
      const packing = authored?.packing ?? constraint.packing

      const pathPuzzles = isLast && hasCroc ? 2 : 1
      const chestRewards = TOMB_CAPABILITIES.placeChests
        ? buildChestRewards(tomb.id, chestOffset, pathPuzzles, constraint.consumableRates)
        : undefined
      if (TOMB_CAPABILITIES.placeChests) chestOffset += chestCountFor(pathPuzzles)

      return buildFloor({
        pathPuzzles,
        chestEvery: TOMB_CAPABILITIES.placeChests ? chestEveryFor(pathPuzzles) : 0,
        chestRewards,
        difficulty,
        sideSections,
        puzzleFamily,
        lastMainPuzzleFamily: isLast && hasCroc ? "crocodile" : undefined,
        mainEndReward,
        corridorStraightness: straightness,
        packing,
      })
    })

    wireStaircases(floors, fi => `${tomb.id}:floor${fi}`)
    configs[tomb.id] = [floors]
  }
  return configs
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
