import { WORLD_TARGETS } from "./worldSpec"
import { pathCountForDensity } from "./sideSections"
import type { PyramidPlan } from "./configBuilder"
import type { SideIntensity } from "./dsl"

const INTENSITY_PATHS: Record<SideIntensity, number> = { none: 0, low: 1, medium: 2, dense: 4 }

// Decides, per pyramid, how many auto-distributed mosaic side paths it gets — honoring
// any explicit sideSections density/count/array first, then spreading the remaining
// WORLD_TARGETS.mosaicPieceRewards budget across the unconstrained pyramids, biggest first.
export const computeMosaicPaths = (plan: PyramidPlan[]): Map<string, number> => {
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
