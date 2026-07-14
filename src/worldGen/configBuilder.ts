import type { Difficulty, SiteConfig, Tier, TreasureReward } from "./types"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import { resolvePyramidConstraintWithProvenance } from "./constraintResolver"
import type { Provenance } from "./constraintResolver"
import { worldSpec } from "./worldSpec"
import type {
  PyramidConstraint,
  FloorConstraint,
  RewardSpec,
  SideSectionConstraint,
  PathPuzzlesRange,
  TombRewardHint,
} from "./dsl"
import { wardPath } from "./dsl"
import { specToReward } from "./rewards"
import { buildSite } from "./buildSite"
import { placeFragments } from "./placeFragments"
import type { CurrencyDistribution, CappedCurrency } from "./placeFragments"
import type { Distribution } from "./slotAllocator"
import type { FamilyWeightFor } from "./slots"
import type { ResolveKeyRequirements } from "../game/siteAssembler"
import { validateDiscovery, validateRewardCounts, type WorldValidator } from "./validate"
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

// A tomb is structurally the same as a pyramid interior (pyramid-interior-design.md §8) —
// one treasure per floor, self-gating its own next floor's shortcut ("the treasure IS the
// key"). Built by authoring one FloorConstraint per floor and handing them to buildSite()'s
// authored-floors branch, the exact same mechanism pyramids' own authored floors[] use —
// tomb-specific vocabulary (wardPath, the perk-stream reward resolver, "tomb-puzzle" encounter,
// crocodile capstone) is authoring convenience, not a separate construction path.
const buildTombConfigs = (): Record<string, SiteConfig[]> => {
  const configs: Record<string, SiteConfig[]> = {}
  for (const tomb of TOMB_JOURNEYS) {
    // ponytail: pyramidIndex=0,levelCount=1 so tier-pyramid selectors like "last"/"first" always match
    const { constraint } = resolvePyramidConstraintWithProvenance(worldSpec, tomb.id, tomb.tier as Tier, 0, 1)
    const difficulty: Difficulty = constraint.difficulty ?? "starter"
    // Defaults to the "tomb-puzzle" tag (resolves to tableau) — not "puzzle" (sumplete), since
    // tomb main-path rooms consume hieroglyph symbols the player may not have yet.
    const encounter = constraint.encounter ?? "tomb-puzzle"

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
      if (reward) return specToReward(reward as RewardSpec, tomb.tier as Tier)
      return undefined
    }

    // Every floor is authored explicitly — its own mainEndReward defaults to "tombTreasure"
    // (the perk-stream's next id) unless an authored entry overrides it, and every non-last
    // floor gets a ward-path shortcut gated by that same key: walk the floor once to earn
    // it, then a later re-entry can skip straight past via the shortcut instead of
    // re-solving its tableau. Never authored per-tomb; systemic for all.
    //
    // encounterArgs.runNr defaults to this floor's own 1-based index — same as the "grind
    // era", each floor's tableau is tied to the treasure it unlocks (perkIndex above walks
    // in lockstep with i). An authored floor can override it to place its tableau content
    // on a different run (e.g. a ward-gated side path pointing at a later run's puzzle).
    const floors: FloorConstraint<TombRewardHint>[] = Array.from({ length: levelCount }, (_, i) => {
      const isLast = i === levelCount - 1
      const authored = authoredFloors?.[i]
      const authoredSections = (authored?.sideSections as SideSectionConstraint<TombRewardHint>[] | undefined) ?? []
      const shortcut = isLast ? [] : [wardPath({ tomb: tomb.id, index: i, puzzles: 0 })]
      return {
        pathPuzzles: isLast && hasCroc ? 2 : 1,
        difficulty,
        encounter,
        mainEndReward: authored?.mainEndReward ?? "tombTreasure",
        lastMainPuzzleFamily: isLast && hasCroc ? "crocodile" : undefined,
        sideSections: [...authoredSections, ...shortcut],
        corridorStraightness: authored?.corridorStraightness ?? constraint.corridorStraightness,
        packing: authored?.packing ?? constraint.packing,
        sealed: authored?.sealed ?? constraint.sealed,
        encounterArgs: authored?.encounterArgs ?? { runNr: i + 1 },
      }
    })

    const { floors: floorConfigs } = buildSite<TombRewardHint>({
      journeyId: tomb.id,
      tier: tomb.tier as Tier,
      pyramidIndex: 0,
      levelCount: 1,
      pathPuzzles: 1,
      // Cast: `floors` is authored in tomb's own TombRewardHint vocabulary, which
      // resolveTombReward (below) understands.
      constraint: { ...constraint, floors } as PyramidConstraint,
      difficulty,
      hasMapPieceBranch: false,
      hasWardGate: false,
      nextTier: null,
      resolveReward: resolveTombReward,
      resolveMainEndReward: () => ({ type: "fragmentSlot" }),
    })
    configs[tomb.id] = [floorConfigs]
  }
  return configs
}

// ── Main entry point ──────────────────────────────────────────────────────────

// `resolveKeyRequirements`/`currencies` default to a no-op resolver and no currencies —
// src/worldGen/ can't import src/mods/'s real resolver or mod-owned currencies directly
// (architecture.md's dependency table); the caller with access to them
// (scripts/generateWorld.ts) passes the real ones in. The reward-count expectation and the
// "is this a gating-currency reward" predicate are derived from those same `currencies`, so a
// currency that isn't registered contributes neither — core hardcodes no per-mod number.
export const buildConfigs = (
  resolveKeyRequirements?: ResolveKeyRequirements,
  currencies: CurrencyDistribution[] = [],
  capped: CappedCurrency[] = [],
  dynamicDistributions: Distribution[] = [],
  worldValidators: WorldValidator[] = [],
  familyWeightFor?: FamilyWeightFor,
  emptyFraction = 0
): Record<string, SiteConfig[]> => {
  // Phase 1: Resolve constraints + compute per-pyramid path puzzle counts
  const plan = buildPlan()

  // Phase 2: Build SiteConfigs for pyramids (fragmentSlot sentinels in place)
  const pyramidConfigs = buildSiteConfigs(plan)

  // Phase 3: Build tomb site configs
  const tombConfigs = buildTombConfigs()

  // Phase 4: Worklist-driven currency placement (docs/game-design/keys-and-locks-solver.md)
  // — assigns fragmentSlot positions per registered currency, fills the remainder with junk loot
  const allConfigs = { ...pyramidConfigs, ...tombConfigs }
  placeFragments(
    allConfigs,
    currencies,
    resolveKeyRequirements,
    capped,
    dynamicDistributions,
    familyWeightFor,
    emptyFraction
  )

  // Phase 5+7: Validate all configs together — reward counts, staircase guardrail,
  // tomb ID references, discovery graph solvability, and the shop economy guard. The
  // gating-currency reward expectation + predicate come from the registered currencies
  // themselves (a currency contributes its own expectedTotal + bucketForReward), so an
  // unregistered mod's currency drops out of the check — no false "expected N, got 0".
  const expectedCurrencyRewards = currencies.reduce((sum, c) => sum + (c.expectedTotal?.() ?? 0), 0)
  const isCurrencyReward = (r: TreasureReward) => currencies.some(c => c.bucketForReward?.(r) !== undefined)
  validateRewardCounts(allConfigs, expectedCurrencyRewards, isCurrencyReward)
  validateDiscovery(allConfigs)
  // Mod-injected post-build validators (e.g. the shop economy guard) run last, over the whole
  // grown world. They drop out with their mod, so core names none — the shop guard leaves the
  // check when shop leaves REGISTERED_MODS.
  for (const validate of worldValidators) validate(allConfigs)

  return allConfigs
}
