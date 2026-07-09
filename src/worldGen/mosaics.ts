import { TOMB_JOURNEYS } from "./data"
import { resolvePyramidConstraintWithProvenance } from "./constraintResolver"
import { worldSpec, WORLD_TARGETS } from "./worldSpec"
import { pathCountForDensity } from "./sideSections"
import { TOMB_CAPABILITIES } from "./capabilities"
import type { PyramidPlan } from "./configBuilder"
import type { FloorConstraint, SideIntensity, SideSectionConstraint, TombRewardHint } from "./dsl"
import type { Tier } from "./types"

const INTENSITY_PATHS: Record<SideIntensity, number> = { none: 0, low: 1, medium: 2, dense: 4 }

const countMosaicEndRewards = (sections: SideSectionConstraint<TombRewardHint>[] | undefined): number =>
  (sections ?? []).reduce(
    (sum, s) => sum + (s.endReward === "mosaicPiece" ? 1 : 0) + countMosaicEndRewards(s.sideSections),
    0
  )

// Tomb-authored mosaicPiece endRewards draw from the same world-wide budget pyramids
// auto-distribute from, so pyramids don't overshoot WORLD_TARGETS once tombs opt in.
// Exported for testing.
export const countAuthoredTombMosaics = (): number => {
  if (!TOMB_CAPABILITIES.emitMosaics) return 0
  return TOMB_JOURNEYS.reduce((sum, tomb) => {
    const { constraint } = resolvePyramidConstraintWithProvenance(worldSpec, tomb.id, tomb.tier as Tier, 0, 1)
    const floors = constraint.floors as FloorConstraint<TombRewardHint>[] | undefined
    return (
      sum +
      (floors ?? []).reduce(
        (s, f) => s + countMosaicEndRewards(f?.sideSections as SideSectionConstraint<TombRewardHint>[] | undefined),
        0
      )
    )
  }, 0)
}

// Decides, per pyramid, how many auto-distributed mosaic side paths it gets — honoring
// any explicit sideSections density/count/array first, then spreading the remaining
// WORLD_TARGETS.mosaicPieceRewards budget across the unconstrained pyramids, biggest first.
export const computeMosaicPaths = (plan: PyramidPlan[]): Map<string, number> => {
  let committed = countAuthoredTombMosaics()
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
      // Count declared mosaic paths (sidePaths/hiddenPaths with end:"mosaic") toward the
      // budget — buildSideSections builds those directly. The pyramid still stays an
      // auto-candidate so the remaining budget can top it up with auto surface mosaics;
      // otherwise declaring one hidden mosaic would strand the rest of the budget.
      const allDeclared = [...(p.constraint.sidePaths ?? []), ...(p.constraint.hiddenPaths ?? [])]
      committed += allDeclared
        .filter(e => e.end === "mosaic")
        .reduce((sum, e) => sum + pathCountForDensity(e.density, p.journeyId, p.pyramidIndex), 0)
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
