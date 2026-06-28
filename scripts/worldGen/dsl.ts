import type { Tier, Difficulty } from "./types"

// ── Constraint vocabulary ─────────────────────────────────────────────────────

export type PathPuzzlesPreset = "tiny" | "small" | "medium" | "large" | "huge"
export type SideIntensity = "none" | "sparse" | "normal" | "dense"
export type GateType = "floor-key" | "tomb-key"
export type RewardHint = "mosaicPiece" | "mapPiece" | "hieroglyphs" | "hieroglyphFragment" | "tombKey"
// Structured reward — carries specific IDs; string form is a shorthand resolved by tier context
export type RewardSpec = RewardHint | { type: "mapPiece"; tombId: string } | { type: "tombKey"; keyId: string }
// Structured gate — tomb-key references a tombId; resolver picks the ward key from that tomb's reward
export type GateSpec = GateType | null | { type: "tomb-key"; tombId: string }

export type PuzzleFamily = "sumplete" | "tableau"
export type Theme = string // e.g. "desert", "underwater" — visual hint to renderer

export type PyramidSelector = number | "first" | "last" | "middle" | `${number}-${number}` | `last-${number}`

export type SideSectionConstraint = {
  gate?: GateSpec
  pathPuzzles?: PathPuzzlesPreset | number
  difficulty?: Difficulty
  puzzleFamily?: PuzzleFamily | PuzzleFamily[]
  endReward?: RewardSpec
}

export type FloorConstraint = {
  pathPuzzles?: PathPuzzlesPreset | number
  difficulty?: Difficulty
  puzzleFamily?: PuzzleFamily | PuzzleFamily[]
  mainEndReward?: RewardHint
  chestReward?: RewardHint
  sideSections?: SideIntensity | number | SideSectionConstraint[]
}

export type PyramidConstraint = {
  pathPuzzles?: PathPuzzlesPreset | number
  floorDepth?: number
  minFloors?: number
  maxFloors?: number
  sideSections?: SideIntensity | number | SideSectionConstraint[]
  difficulty?: Difficulty
  puzzleFamily?: PuzzleFamily | PuzzleFamily[]
  theme?: Theme
  mainEndReward?: RewardSpec
  gateHint?: GateType
  floors?: (FloorConstraint | null)[]
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

interface TierScopeBuilder {
  floor(n: number, c: FloorConstraint): Rule
  pyramid(sel: PyramidSelector, c: PyramidConstraint): Rule
  pyramid(sel: PyramidSelector): PyramidChainBuilder
}

interface JourneyScopeBuilder {
  floor(n: number, c: FloorConstraint): Rule
  pyramid(sel: PyramidSelector, c: PyramidConstraint): Rule
  pyramid(sel: PyramidSelector): PyramidChainBuilder
}

// ── Builder functions ─────────────────────────────────────────────────────────

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
  } as JourneyScopeBuilder
}

export const rules = (list: Rule[]): Rule[] => list
