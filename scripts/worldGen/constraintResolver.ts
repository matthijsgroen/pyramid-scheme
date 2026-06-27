import type { Tier } from "./types"
import type { Rule, RuleScope, PyramidConstraint, FloorConstraint, PyramidSelector } from "./dsl"

// ── Specificity ───────────────────────────────────────────────────────────────

const SPECIFICITY: Record<RuleScope["level"], number> = {
  global: 0,
  tier: 1,
  journey: 1,
  "tier-pyramid": 2,
  "journey-pyramid": 2,
  "tier-pyramid-floor": 3,
  "journey-pyramid-floor": 3,
}

// ── Selector matching ─────────────────────────────────────────────────────────

const matchesPyramidSelector = (sel: PyramidSelector, index: number, levelCount: number): boolean => {
  if (typeof sel === "number") return index === sel - 1 // 1-based input → 0-based index
  if (sel === "first") return index === 0
  if (sel === "last") return index === levelCount - 1
  if (sel === "middle") return index === Math.floor(levelCount / 2)
  const lastN = sel.match(/^last-(\d+)$/)
  if (lastN) return index === levelCount - 1 - parseInt(lastN[1])
  const range = sel.match(/^(\d+)-(\d+)$/)
  if (range) return index >= parseInt(range[1]) - 1 && index <= parseInt(range[2]) - 1
  return false
}

const matchesPyramidScope = (
  scope: RuleScope,
  journeyId: string,
  tier: Tier,
  pyramidIndex: number,
  levelCount: number
): boolean => {
  switch (scope.level) {
    case "global":
      return true
    case "tier":
      return scope.tier === tier
    case "journey":
      return scope.journey === journeyId
    case "tier-pyramid":
      return scope.tier === tier && matchesPyramidSelector(scope.pyramid, pyramidIndex, levelCount)
    case "journey-pyramid":
      return scope.journey === journeyId && matchesPyramidSelector(scope.pyramid, pyramidIndex, levelCount)
    default:
      return false
  }
}

const matchesFloorScope = (
  scope: RuleScope,
  journeyId: string,
  tier: Tier,
  pyramidIndex: number,
  levelCount: number,
  floorIndex: number
): boolean => {
  switch (scope.level) {
    case "tier-pyramid-floor":
      return (
        scope.tier === tier &&
        matchesPyramidSelector(scope.pyramid, pyramidIndex, levelCount) &&
        scope.floor === floorIndex
      )
    case "journey-pyramid-floor":
      return (
        scope.journey === journeyId &&
        matchesPyramidSelector(scope.pyramid, pyramidIndex, levelCount) &&
        scope.floor === floorIndex
      )
    default:
      return false
  }
}

// ── Merging ───────────────────────────────────────────────────────────────────

// Shallow merge — later values override earlier. floors[] is replaced wholesale.
const mergeConstraints = <T extends object>(base: T, override: Partial<T>): T => ({ ...base, ...override })

// ── Validation ────────────────────────────────────────────────────────────────

const validatePyramidConstraint = (c: PyramidConstraint, context: string): void => {
  if (c.minFloors !== undefined && c.maxFloors !== undefined && c.minFloors > c.maxFloors)
    throw new Error(`[worldSpec] ${context}: minFloors (${c.minFloors}) > maxFloors (${c.maxFloors})`)
  if (c.floorDepth !== undefined && c.maxFloors !== undefined && c.floorDepth > c.maxFloors)
    throw new Error(`[worldSpec] ${context}: floorDepth (${c.floorDepth}) > maxFloors (${c.maxFloors})`)
  if (c.minFloors !== undefined && c.floorDepth !== undefined && c.floorDepth < c.minFloors)
    throw new Error(`[worldSpec] ${context}: floorDepth (${c.floorDepth}) < minFloors (${c.minFloors})`)
}

// ── Resolution ────────────────────────────────────────────────────────────────

export const resolvePyramidConstraint = (
  rules: Rule[],
  journeyId: string,
  tier: Tier,
  pyramidIndex: number,
  levelCount: number
): PyramidConstraint => {
  const merged = rules
    .filter(r => matchesPyramidScope(r.scope, journeyId, tier, pyramidIndex, levelCount))
    .sort((a, b) => SPECIFICITY[a.scope.level] - SPECIFICITY[b.scope.level])
    .reduce<PyramidConstraint>((acc, rule) => mergeConstraints(acc, rule.constraints as PyramidConstraint), {})

  validatePyramidConstraint(merged, `journey=${journeyId} pyramid=${pyramidIndex + 1}`)
  return merged
}

export const resolveFloorConstraint = (
  rules: Rule[],
  pyramidConstraint: PyramidConstraint,
  journeyId: string,
  tier: Tier,
  pyramidIndex: number,
  levelCount: number,
  floorIndex: number
): FloorConstraint => {
  const fromArray: FloorConstraint = pyramidConstraint.floors?.[floorIndex] ?? {}

  return rules
    .filter(r => matchesFloorScope(r.scope, journeyId, tier, pyramidIndex, levelCount, floorIndex))
    .sort((a, b) => SPECIFICITY[a.scope.level] - SPECIFICITY[b.scope.level])
    .reduce<FloorConstraint>((acc, rule) => mergeConstraints(acc, rule.constraints as FloorConstraint), fromArray)
}
