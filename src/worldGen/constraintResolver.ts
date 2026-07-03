import type { Tier } from "./types"
import type { Rule, RuleScope, PyramidConstraint, FloorConstraint, PyramidSelector } from "./dsl"

export type Provenance = Partial<Record<keyof PyramidConstraint, RuleScope>>

export const describeScope = (scope: RuleScope): string => {
  switch (scope.level) {
    case "global":
      return "global"
    case "global-floor":
      return `global.floor(${scope.floor})`
    case "tier":
      return `tier('${scope.tier}')`
    case "tier-floor":
      return `tier('${scope.tier}').floor(${scope.floor})`
    case "journey":
      return `journey('${scope.journey}')`
    case "journey-floor":
      return `journey('${scope.journey}').floor(${scope.floor})`
    case "tier-pyramid":
      return `tier('${scope.tier}').pyramid('${scope.pyramid}')`
    case "tier-pyramid-floor":
      return `tier('${scope.tier}').pyramid('${scope.pyramid}').floor(${scope.floor})`
    case "journey-pyramid":
      return `journey('${scope.journey}').pyramid('${scope.pyramid}')`
    case "journey-pyramid-floor":
      return `journey('${scope.journey}').pyramid('${scope.pyramid}').floor(${scope.floor})`
  }
}

// ── Specificity ───────────────────────────────────────────────────────────────

const SPECIFICITY: Record<RuleScope["level"], number> = {
  global: 0,
  "global-floor": 1,
  tier: 2,
  "tier-floor": 3,
  journey: 4,
  "journey-floor": 5,
  "tier-pyramid": 6,
  "tier-pyramid-floor": 7,
  "journey-pyramid": 8,
  "journey-pyramid-floor": 9,
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
      return false // floor-scoped rules don't apply at pyramid level
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
    case "global-floor":
      return scope.floor === floorIndex
    case "tier-floor":
      return scope.tier === tier && scope.floor === floorIndex
    case "journey-floor":
      return scope.journey === journeyId && scope.floor === floorIndex
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

export const resolvePyramidConstraintWithProvenance = (
  rules: Rule[],
  journeyId: string,
  tier: Tier,
  pyramidIndex: number,
  levelCount: number
): { constraint: PyramidConstraint; provenance: Provenance } => {
  const matching = rules
    .filter(r => matchesPyramidScope(r.scope, journeyId, tier, pyramidIndex, levelCount))
    .sort((a, b) => SPECIFICITY[a.scope.level] - SPECIFICITY[b.scope.level])

  const constraint: PyramidConstraint = {}
  const provenance: Provenance = {}
  for (const rule of matching) {
    const c = rule.constraints as PyramidConstraint
    for (const key of Object.keys(c) as (keyof PyramidConstraint)[]) {
      if (c[key] !== undefined) {
        ;(constraint as Record<string, unknown>)[key] = c[key]
        provenance[key] = rule.scope
      }
    }
  }

  validatePyramidConstraint(constraint, `journey=${journeyId} pyramid=${pyramidIndex + 1}`)
  return { constraint, provenance }
}

export const resolvePyramidConstraint = (
  rules: Rule[],
  journeyId: string,
  tier: Tier,
  pyramidIndex: number,
  levelCount: number
): PyramidConstraint =>
  resolvePyramidConstraintWithProvenance(rules, journeyId, tier, pyramidIndex, levelCount).constraint

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
