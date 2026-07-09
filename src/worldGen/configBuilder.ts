import type { Difficulty, FloorConfig, SideSection, SiteConfig, Tier, TreasureReward } from "./types"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import { resolvePyramidConstraintWithProvenance } from "./constraintResolver"
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
import { buildFloor, buildSite, wireStaircases } from "./buildSite"
import { assignPuzzleRewards } from "./puzzleRewards"
import { GLOBAL_DEFAULTS } from "./spec/global"
import { computeMosaicPaths } from "./mosaics"
import { assignFragments } from "./fragments"
import { validateDiscovery, validateRewardCounts } from "./validate"
import { PYRAMID_CAPABILITIES } from "./capabilities"

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

    for (const p of pyramids) {
      const { pyramidIndex: i, pathPuzzles: pp, constraint } = p
      const difficulty: Difficulty = constraint.difficulty ?? "expert"

      const { floors } = buildSite({
        journeyId,
        tier,
        pyramidIndex: i,
        levelCount,
        pathPuzzles: pp,
        constraint,
        difficulty,
        hasMapPieceBranch: PYRAMID_CAPABILITIES.emitMapPiece && i === mapPiecePyramid && tier !== "starter",
        hasWardGate: i >= Math.ceil(levelCount / 2) && nextTier !== null,
        nextTier,
        mosaicPathCount: PYRAMID_CAPABILITIES.emitMosaics ? (mosaicPaths.get(`${journeyId}:${i}`) ?? 0) : 0,
        resolveReward: spec => specToReward(spec, tier),
        resolveMainEndReward: spec => specToReward(spec, tier),
      })
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

      return buildFloor({
        pathPuzzles,
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
    assignPuzzleRewards(tomb.id, floors, constraint.consumableRates ?? GLOBAL_DEFAULTS.consumableRates)
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
