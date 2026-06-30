import type { Tier, Difficulty } from "./types"

// ── Constraint vocabulary ─────────────────────────────────────────────────────

export type PathPuzzlesPreset = "tiny" | "small" | "medium" | "large" | "huge"
export type SideIntensity = "none" | "low" | "medium" | "dense"
export type PathEndHint = "fragment" | "treasure" | "mosaic"
export type PathEntry = { density: SideIntensity; pathPuzzles: number; end: PathEndHint }
export type GateType = "floor-key" | "tomb-key"
export type KeyColor = "blue" | "red" | "green" | "yellow" | "purple"
export type RewardHint = "mosaicPiece" | "mapPiece" | "hieroglyphs" | "hieroglyphFragment" | "tombKey"
// Structured reward — carries specific IDs; string form is a shorthand resolved by tier context
export type RewardSpec = RewardHint | { type: "mapPiece"; tombId: string } | { type: "tombKey"; keyId: string }
// Structured gate — tomb-key references a tombId; resolver picks the ward key from that tomb's reward
export type GateSpec = GateType | null | { type: "tomb-key"; tombId: string } | { type: "floor-key"; color?: KeyColor }

export type PuzzleFamily = "sumplete" | "tableau"
export type Theme = string // e.g. "desert", "underwater" — visual hint to renderer

export type PyramidSelector = number | "first" | "last" | "middle" | `${number}-${number}` | `last-${number}`

export type SideSectionConstraint = {
  gate?: GateSpec
  pathPuzzles?: PathPuzzlesPreset | number
  difficulty?: Difficulty
  puzzleFamily?: PuzzleFamily | PuzzleFamily[]
  endReward?: RewardSpec
  sideSections?: SideSectionConstraint[]
}

export type FloorConstraint = {
  pathPuzzles?: PathPuzzlesPreset | number
  difficulty?: Difficulty
  puzzleFamily?: PuzzleFamily | PuzzleFamily[]
  mainEndReward?: RewardHint
  chestReward?: RewardHint
  /**
   * Side paths for this pyramid.
   * - SideIntensity | number: that many auto mosaic-piece paths, no explicit sections.
   * - SideSectionConstraint[]: explicit sections; auto-distributor still appends mosaic paths.
   * - undefined: auto-distributor decides.
   */
  sideSections?: SideIntensity | number | SideSectionConstraint[]
  /** Fraction of auto side paths gated with a floor key. "dense" = all gated. */
  keyDensity?: SideIntensity
  /** How many distinct key colors to use (1–5). Fewer colors → one key opens more doors. */
  keyColors?: number
  /** Declared visible side paths — each entry adds paths of that density with the given reward. */
  sidePaths?: PathEntry[]
  /** Declared hidden side paths (hidden: true) — invisible without Detection perk. */
  hiddenPaths?: PathEntry[]
  /** Fraction 0–1 of chest slots that become consumable rewards (Phase 14). */
  consumableDensity?: number
}

export type PyramidConstraint = {
  pathPuzzles?: PathPuzzlesPreset | number
  floorDepth?: number
  minFloors?: number
  maxFloors?: number
  /**
   * Side paths for this pyramid.
   * - SideIntensity | number: that many auto mosaic-piece paths, no explicit sections.
   * - SideSectionConstraint[]: explicit sections; auto-distributor still appends mosaic paths.
   * - undefined: auto-distributor decides.
   */
  sideSections?: SideIntensity | number | SideSectionConstraint[]
  /** Fraction of auto side paths gated with a floor key. "dense" = all gated. */
  keyDensity?: SideIntensity
  /** How many distinct key colors to use (1–5). Fewer colors → one key opens more doors. */
  keyColors?: number
  difficulty?: Difficulty
  puzzleFamily?: PuzzleFamily | PuzzleFamily[]
  theme?: Theme
  mainEndReward?: RewardSpec
  gateHint?: GateType
  floors?: (FloorConstraint | null)[]
  /** Declared visible side paths — each entry adds paths of that density with the given reward. */
  sidePaths?: PathEntry[]
  /** Declared hidden side paths (hidden: true) — invisible without Detection perk. */
  hiddenPaths?: PathEntry[]
  /** Fraction 0–1 of chest slots that become consumable rewards (Phase 14). */
  consumableDensity?: number
}

// ── Rule representation ───────────────────────────────────────────────────────

export type RuleScope =
  | { level: "global" }
  | { level: "global-floor"; floor: number }
  | { level: "tier"; tier: Tier }
  | { level: "tier-floor"; tier: Tier; floor: number }
  | { level: "journey"; journey: string }
  | { level: "journey-floor"; journey: string; floor: number }
  | { level: "tier-pyramid"; tier: Tier; pyramid: PyramidSelector }
  | { level: "journey-pyramid"; journey: string; pyramid: PyramidSelector }
  | { level: "tier-pyramid-floor"; tier: Tier; pyramid: PyramidSelector; floor: number }
  | { level: "journey-pyramid-floor"; journey: string; pyramid: PyramidSelector; floor: number }

export type Rule = { scope: RuleScope; constraints: PyramidConstraint | FloorConstraint }

// ── Builder interfaces ────────────────────────────────────────────────────────

interface PyramidChainBuilder {
  floor(n: number, c: FloorConstraint): Rule
}

interface GlobalScopeBuilder {
  floor(n: number, c: FloorConstraint): Rule
}

type PathSettingsBuilder = { settings(c: { pathPuzzles: number; end: PathEndHint }): ConstraintAccumulator }

/** A Rule that also supports chaining `.sidePaths()` / `.hiddenPaths()` calls. */
export type ConstraintAccumulator = Rule & {
  sidePaths(density: SideIntensity): PathSettingsBuilder
  hiddenPaths(density: SideIntensity): PathSettingsBuilder
}

interface TierScopeBuilder {
  floor(n: number, c: FloorConstraint): Rule
  pyramid(sel: PyramidSelector, c: PyramidConstraint): Rule
  pyramid(sel: PyramidSelector): PyramidChainBuilder
  set(c: PyramidConstraint): ConstraintAccumulator
}

interface JourneyScopeBuilder {
  floor(n: number, c: FloorConstraint): Rule
  pyramid(sel: PyramidSelector, c: PyramidConstraint): Rule
  pyramid(sel: PyramidSelector): PyramidChainBuilder
  set(c: PyramidConstraint): ConstraintAccumulator
}

// ── Builder functions ─────────────────────────────────────────────────────────

const makeAccumulator = (scope: RuleScope, c: PyramidConstraint): ConstraintAccumulator => {
  const constraints: PyramidConstraint = { ...c }
  const acc: ConstraintAccumulator = {
    scope,
    constraints,
    sidePaths(density: SideIntensity): PathSettingsBuilder {
      return {
        settings(config: { pathPuzzles: number; end: PathEndHint }): ConstraintAccumulator {
          if (!constraints.sidePaths) constraints.sidePaths = []
          constraints.sidePaths.push({ density, ...config })
          return acc
        },
      }
    },
    hiddenPaths(density: SideIntensity): PathSettingsBuilder {
      return {
        settings(config: { pathPuzzles: number; end: PathEndHint }): ConstraintAccumulator {
          if (!constraints.hiddenPaths) constraints.hiddenPaths = []
          constraints.hiddenPaths.push({ density, ...config })
          return acc
        },
      }
    },
  }
  return acc
}

export function global(): GlobalScopeBuilder
export function global(c: PyramidConstraint): Rule
export function global(c?: PyramidConstraint): Rule | GlobalScopeBuilder {
  if (c !== undefined) return { scope: { level: "global" }, constraints: c }
  return {
    floor: (n: number, fc: FloorConstraint): Rule => ({ scope: { level: "global-floor", floor: n }, constraints: fc }),
  }
}

export function tier(name: Tier, c: PyramidConstraint): Rule
export function tier(name: Tier): TierScopeBuilder
export function tier(name: Tier, c?: PyramidConstraint): Rule | TierScopeBuilder {
  if (c !== undefined) return { scope: { level: "tier", tier: name }, constraints: c }
  return {
    floor: (n: number, fc: FloorConstraint): Rule => ({
      scope: { level: "tier-floor", tier: name, floor: n },
      constraints: fc,
    }),
    pyramid(sel: PyramidSelector, pc?: PyramidConstraint): Rule | PyramidChainBuilder {
      if (pc !== undefined) return { scope: { level: "tier-pyramid", tier: name, pyramid: sel }, constraints: pc }
      return {
        floor: (n: number, fc: FloorConstraint): Rule => ({
          scope: { level: "tier-pyramid-floor", tier: name, pyramid: sel, floor: n },
          constraints: fc,
        }),
      }
    },
    set: (c: PyramidConstraint): ConstraintAccumulator => makeAccumulator({ level: "tier", tier: name }, c),
  } as TierScopeBuilder
}

export function journey(id: string, c: PyramidConstraint): Rule
export function journey(id: string): JourneyScopeBuilder
export function journey(id: string, c?: PyramidConstraint): Rule | JourneyScopeBuilder {
  if (c !== undefined) return { scope: { level: "journey", journey: id }, constraints: c }
  return {
    floor: (n: number, fc: FloorConstraint): Rule => ({
      scope: { level: "journey-floor", journey: id, floor: n },
      constraints: fc,
    }),
    pyramid(sel: PyramidSelector, pc?: PyramidConstraint): Rule | PyramidChainBuilder {
      if (pc !== undefined) return { scope: { level: "journey-pyramid", journey: id, pyramid: sel }, constraints: pc }
      return {
        floor: (n: number, fc: FloorConstraint): Rule => ({
          scope: { level: "journey-pyramid-floor", journey: id, pyramid: sel, floor: n },
          constraints: fc,
        }),
      }
    },
    set: (c: PyramidConstraint): ConstraintAccumulator => makeAccumulator({ level: "journey", journey: id }, c),
  } as JourneyScopeBuilder
}

export const rules = (list: Rule[]): Rule[] => list
