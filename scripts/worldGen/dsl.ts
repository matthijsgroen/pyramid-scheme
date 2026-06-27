import type { Tier, Difficulty } from "./types"

// ── Constraint vocabulary ─────────────────────────────────────────────────────

export type PathPuzzlesPreset = "tiny" | "small" | "medium" | "large" | "huge"
export type SideIntensity = "none" | "sparse" | "normal" | "dense"
export type GateType = "floor-key" | "tomb-key"
export type RewardHint = "mosaicPiece" | "mapPiece" | "hieroglyphs" | "hieroglyphFragment" | "tombKey"
// Structured reward — carries specific IDs; string form is a shorthand resolved by tier context
export type RewardSpec = RewardHint | { type: "mapPiece"; tombId: string } | { type: "tombKey"; keyId: string }
// Structured gate — tomb-key requires a wardKeyId; string "tomb-key" is ambiguous (no keyId)
export type GateSpec = GateType | null | { type: "tomb-key"; wardKeyId: string }

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
  | { level: "tier"; tier: Tier }
  | { level: "journey"; journey: string }
  | { level: "tier-pyramid"; tier: Tier; pyramid: PyramidSelector }
  | { level: "journey-pyramid"; journey: string; pyramid: PyramidSelector }
  | { level: "tier-pyramid-floor"; tier: Tier; pyramid: PyramidSelector; floor: number }
  | { level: "journey-pyramid-floor"; journey: string; pyramid: PyramidSelector; floor: number }

export type Rule = { scope: RuleScope; constraints: PyramidConstraint | FloorConstraint }

// ── Builder interfaces ────────────────────────────────────────────────────────

interface PyramidChainBuilder {
  floor(n: number, c: FloorConstraint): Rule
}

interface TierScopeBuilder {
  pyramid(sel: PyramidSelector, c: PyramidConstraint): Rule
  pyramid(sel: PyramidSelector): PyramidChainBuilder
}

interface JourneyScopeBuilder {
  pyramid(sel: PyramidSelector, c: PyramidConstraint): Rule
  pyramid(sel: PyramidSelector): PyramidChainBuilder
}

// ── Builder functions ─────────────────────────────────────────────────────────

export const global = (c: PyramidConstraint): Rule => ({ scope: { level: "global" }, constraints: c })

export function tier(name: Tier, c: PyramidConstraint): Rule
export function tier(name: Tier): TierScopeBuilder
export function tier(name: Tier, c?: PyramidConstraint): Rule | TierScopeBuilder {
  if (c !== undefined) return { scope: { level: "tier", tier: name }, constraints: c }
  return {
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
