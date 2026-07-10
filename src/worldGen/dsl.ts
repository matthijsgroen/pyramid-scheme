import type { Tier, Difficulty, PathPuzzlesRange } from "./types"
import type { DecorationKind } from "../game/siteTypes"

export type { PathPuzzlesRange } from "./types"

// ── Constraint vocabulary ─────────────────────────────────────────────────────

export type PathPuzzlesPreset = "tiny" | "small" | "medium" | "large" | "huge"
export type SideIntensity = "none" | "low" | "medium" | "dense"
export type PathEndHint = "fragment" | "treasure" | "mosaic" | "junk"
export type PathEntry = {
  density: SideIntensity
  pathPuzzles: number
  end: PathEndHint
  /** Which family/tag renders this path's intermediate rooms — an exact registered family
   * id (e.g. "tableau") or a tag (e.g. "trap"). Omit = the default for this slot's context. */
  encounter?: string | string[]
  /** Lock this path behind a floor-key door. Color is drawn from the floor's keyColors rotation. */
  gate?: "floor-key"
  /** Chance [0-1], rolled per pyramid, that this entry emits at all. Omit = always. Use to
   * scatter (e.g. trapped) paths across only some pyramids instead of every one. */
  chance?: number
}
export type GateType = "floor-key" | "tomb-key"
export type KeyColor = "blue" | "red" | "green" | "yellow" | "purple"
export type RewardHint = "mosaicPiece" | "mapPiece" | "hieroglyphs" | "hieroglyphFragment"
// Structured reward — carries specific IDs; string form is a shorthand resolved by tier context
export type RewardSpec = RewardHint | { type: "mapPiece"; tombId: string } | { type: "tombKey"; keyId: string }
// Structured gate — tomb-key references a perk by tomb journey ID + zero-based index
export type GateSpec =
  | GateType
  | null
  | { type: "tomb-key"; tombId: string; index: number }
  | { type: "floor-key"; color?: KeyColor }

export type Theme = string // e.g. "desert", "underwater" — visual hint to renderer

export type PyramidSelector = number | "first" | "last" | "middle" | `${number}-${number}` | `last-${number}`

export type SideSectionConstraint<TExtra extends string = never> = {
  gate?: GateSpec
  pathPuzzles?: PathPuzzlesPreset | number
  difficulty?: Difficulty
  /** Which family/tag renders this section's intermediate rooms — an exact registered family
   * id (e.g. "tableau", "sumplete") or a tag (e.g. "trap", "puzzle"). Omit = the default for
   * this section's context (a side path defaults to the "puzzle" tag, i.e. sumplete). */
  encounter?: string | string[]
  endReward?: RewardSpec | TExtra
  /** Marks this section's endReward as a Fez-shop purchase instead of a free pickup — the
   * DSL literal in coins. No `chance` allowed on a shop slot; must stay deterministic. */
  shopPrice?: number
  sideSections?: SideSectionConstraint<TExtra>[]
  /** Pool of decoration kinds this section's fork/endpoint rooms may draw from. */
  decorations?: DecorationKind[]
  /** "staircase" ends the path at a stairhead into the next floor instead of a treasure room. */
  end?: "treasure" | "staircase"
  /** Invisible without the Detection perk. */
  hidden?: boolean
  /** Isolates this section's cells from leftover maze edges in a compact layout, so a
   * shortcut can't merge around it — same mechanism `gate`/an `encounter:"trap"` section
   * already gets for free. */
  sealed?: boolean
}

export type FloorConstraint<TExtra extends string = never> = {
  pathPuzzles?: PathPuzzlesPreset | number
  difficulty?: Difficulty
  /** Default family/tag for this floor's main-path encounter rooms. */
  encounter?: string | string[]
  /** How often the maze continues straight instead of turning, 0-1. Defaults to 0.65; lower = more winding. */
  corridorStraightness?: number
  /** Main-path length multiplier, relative to actual content. Defaults to 1; lower = a shorter, tighter walk, higher = a longer, more wandering one. */
  packing?: number
  /** Isolates the main path's cells from leftover maze edges in a compact layout, so a
   * shortcut can't merge around a main-path puzzle room. */
  sealed?: boolean
  mainEndReward?: RewardHint | TExtra
  /** Pool of decoration kinds the main path's fork/endpoint rooms may draw from. */
  decorations?: DecorationKind[]
  /**
   * Side paths for this pyramid.
   * - SideIntensity | number: that many auto mosaic-piece paths, no explicit sections.
   * - SideSectionConstraint[]: explicit sections; auto-distributor still appends mosaic paths.
   * - undefined: auto-distributor decides.
   */
  sideSections?: SideIntensity | number | SideSectionConstraint<TExtra>[]
  /** Fraction of auto side paths gated with a floor key. "dense" = all gated. */
  keyDensity?: SideIntensity
  /** How many distinct key colors to use (1–5). Fewer colors → one key opens more doors. */
  keyColors?: number
  /** Declared visible side paths — each entry adds paths of that density with the given reward. */
  sidePaths?: PathEntry[]
  /** Declared hidden side paths (hidden: true) — invisible without Detection perk. */
  hiddenPaths?: PathEntry[]
  /** Integer weights for consumable type selection. Higher = more frequent. */
  consumableRates?: { bandage: number; oil: number; trapTool: number }
}

export type PyramidConstraint = {
  /** A bare number/preset is literal — applied as-is, everywhere it resolves. A range
   * interpolates linearly from `start` (the journey's first pyramid) to `end` (its last). */
  pathPuzzles?: PathPuzzlesPreset | number | PathPuzzlesRange
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
  /** Chance [0-1], rolled per pyramid, that keyColors resolves to 1 (one key, every gated
   * door). Ignored if keyColors or keyColorsRange is also set. */
  sharedKeyChance?: number
  /** keyColors rolled per pyramid, uniformly in [min, max]. Takes priority over keyColors
   * and sharedKeyChance. */
  keyColorsRange?: { min: number; max: number }
  difficulty?: Difficulty
  /** Default family/tag for this pyramid/tomb's main-path encounter rooms — e.g. a tomb sets
   * "tableau" (or the "tomb-puzzle" tag) here so every floor's main-path rooms use it. */
  encounter?: string | string[]
  /** How often the maze continues straight instead of turning, 0-1. Defaults to 0.65; lower = more winding. */
  corridorStraightness?: number
  /** Chance [0-1], rolled per pyramid, of an extra-winding floor. Ignored if corridorStraightness is set. */
  windyChance?: number
  /** corridorStraightness used on a windyChance hit. Default 0.35. */
  windyStraightness?: number
  /** Main-path length multiplier, relative to actual content. Defaults to 1; lower = a shorter, tighter walk, higher = a longer, more wandering one. */
  packing?: number
  /** Chance [0-1], rolled per pyramid, of an extra-large packing floor. Ignored if packing is set. */
  packingChance?: number
  /** packing used on a packingChance hit. Default 1.6. */
  packingWhenHit?: number
  /** Isolates the main path's cells from leftover maze edges in a compact layout, so a
   * shortcut can't merge around a main-path puzzle room. Per-floor `sealed` overrides this. */
  sealed?: boolean
  theme?: Theme
  mainEndReward?: RewardSpec
  gateHint?: GateType
  floors?: (FloorConstraint | null)[]
  /** Baseline floor count for the main path itself, before any ward wings. Default 1. */
  mainFloors?: number
  /** Auto-generated ward-gated bonus floors branching off the last main floor, keyed from
   * this tier's own tomb (skipping any index reserved for tier-unlock/location-key). */
  wardWings?: number
  /** Ward-gated side paths off the last main floor — a single gated section with one reward,
   * not a whole bonus floor. Cheaper return-content; draws ward keys from the same pool as
   * wardWings (allocated after them). */
  wardPaths?: number
  /** Trap the ward paths in this journey's earlier-half pyramids, so the return trip costs
   * consumables. Only affects wardPaths (a floor's main path has no trap model). */
  wardPathTrapped?: boolean
  /** Declared visible side paths — each entry adds paths of that density with the given reward. */
  sidePaths?: PathEntry[]
  /** Declared hidden side paths (hidden: true) — invisible without Detection perk. */
  hiddenPaths?: PathEntry[]
  /** Integer weights for consumable type selection. Higher = more frequent. */
  consumableRates?: { bandage: number; oil: number; trapTool: number }
  /** Number of floors for tomb journeys. Overrides the value in TOMB_STRUCTURES. */
  levelCount?: number
}

/** Tomb-only reward hints: "tombTreasure" draws the next ward-key/perk off the tomb's
 * perk stream; "fragmentSlot" opts a slot into the same hieroglyph-fragment assignment
 * pyramids use (see collectSlots/assignFragments). */
export type TombRewardHint = "tombTreasure" | "fragmentSlot"

/** Tomb journey constraint — extends PyramidConstraint with explicit authored floor layouts. */
export type TombConstraint = Omit<PyramidConstraint, "floors"> & {
  floors?: FloorConstraint<TombRewardHint>[]
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

export type Rule = { scope: RuleScope; constraints: PyramidConstraint | TombConstraint | FloorConstraint }

// ── Builder interfaces ────────────────────────────────────────────────────────

/** A Rule whose `constraints.floors` accumulates via chained `.floor(n, c)` calls. */
export type FloorChainBuilder = Rule & {
  floor(n: number, c: FloorConstraint): FloorChainBuilder
}

interface GlobalScopeBuilder {
  floor(n: number, c: FloorConstraint): Rule
}

export type PathSettings = Omit<PathEntry, "density">

type PathSettingsBuilder = {
  settings(c: PathSettings): ConstraintAccumulator
}

/** A Rule that also supports chaining `.sidePaths()` / `.hiddenPaths()` calls. */
export type ConstraintAccumulator = Rule & {
  sidePaths(density: SideIntensity): PathSettingsBuilder
  hiddenPaths(density: SideIntensity): PathSettingsBuilder
}

interface TierScopeBuilder {
  floor(n: number, c: FloorConstraint): Rule
  // Only a single pyramid (a bare number) can chain per-floor overrides — a range/first/
  // last selector spans several pyramids, so "the floor" wouldn't mean any one of them.
  pyramid(sel: number, c?: PyramidConstraint): FloorChainBuilder
  pyramid(sel: Exclude<PyramidSelector, number>, c: PyramidConstraint): Rule
  set(c: PyramidConstraint): ConstraintAccumulator
}

interface JourneyScopeBuilder {
  floor(n: number, c: FloorConstraint): Rule
  pyramid(sel: number, c?: PyramidConstraint): FloorChainBuilder
  pyramid(sel: Exclude<PyramidSelector, number>, c: PyramidConstraint): Rule
  set(c: PyramidConstraint): ConstraintAccumulator
}

// ── Builder functions ─────────────────────────────────────────────────────────

const makeAccumulator = (scope: RuleScope, c: PyramidConstraint): ConstraintAccumulator => {
  const constraints: PyramidConstraint = {
    ...c,
    ...(c.sidePaths ? { sidePaths: [...c.sidePaths] } : {}),
    ...(c.hiddenPaths ? { hiddenPaths: [...c.hiddenPaths] } : {}),
  }
  const acc: ConstraintAccumulator = {
    scope,
    constraints,
    sidePaths(density: SideIntensity): PathSettingsBuilder {
      return {
        settings(config: PathSettings): ConstraintAccumulator {
          if (!constraints.sidePaths) constraints.sidePaths = []
          constraints.sidePaths.push({ density, ...config })
          return acc
        },
      }
    },
    hiddenPaths(density: SideIntensity): PathSettingsBuilder {
      return {
        settings(config: PathSettings): ConstraintAccumulator {
          if (!constraints.hiddenPaths) constraints.hiddenPaths = []
          constraints.hiddenPaths.push({ density, ...config })
          return acc
        },
      }
    },
  }
  return acc
}

const makeFloorChain = (scope: RuleScope, c?: PyramidConstraint): FloorChainBuilder => {
  const floors: (FloorConstraint | null)[] = []
  const chain: FloorChainBuilder = {
    scope,
    constraints: { ...c, floors },
    floor(n: number, fc: FloorConstraint): FloorChainBuilder {
      floors[n] = fc
      return chain
    },
  }
  return chain
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
    pyramid(sel: PyramidSelector, pc?: PyramidConstraint): Rule | FloorChainBuilder {
      const scope: RuleScope = { level: "tier-pyramid", tier: name, pyramid: sel }
      if (typeof sel === "number") return makeFloorChain(scope, pc)
      return { scope, constraints: pc as PyramidConstraint }
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
    pyramid(sel: PyramidSelector, pc?: PyramidConstraint): Rule | FloorChainBuilder {
      const scope: RuleScope = { level: "journey-pyramid", journey: id, pyramid: sel }
      if (typeof sel === "number") return makeFloorChain(scope, pc)
      return { scope, constraints: pc as PyramidConstraint }
    },
    set: (c: PyramidConstraint): ConstraintAccumulator => makeAccumulator({ level: "journey", journey: id }, c),
  } as JourneyScopeBuilder
}

export function tomb(id: string, c: TombConstraint): Rule {
  return { scope: { level: "journey", journey: id }, constraints: c }
}

export const rules = (list: Rule[]): Rule[] => list

// ── Compact side-path helpers ──────────────────────────────────────────────────
// Shorthand for authoring a floor's `sideSections` array. `puzzles`/`tier` are aliases
// for `pathPuzzles`/`difficulty` — kept short here only; the underlying constraint
// shape (and every other spec file) still uses the long names.

type PathOpts = Omit<SideSectionConstraint, "pathPuzzles" | "difficulty" | "end" | "gate" | "hidden" | "encounter"> & {
  puzzles?: PathPuzzlesPreset | number
  tier?: Difficulty
}

/** A plain, ungated side path — puzzles then a treasure room. */
export const sidePath = (opts: PathOpts = {}): SideSectionConstraint => {
  const { puzzles, tier, ...rest } = opts
  return { ...rest, pathPuzzles: puzzles ?? 0, ...(tier ? { difficulty: tier } : {}) }
}

/** A side path gated by a ward key (tomb treasure), ending in a stairhead to the next floor. */
export const wardPath = (opts: PathOpts & { tomb: string; index: number }): SideSectionConstraint => {
  const { puzzles, tier, tomb: tombId, index, ...rest } = opts
  return {
    ...rest,
    pathPuzzles: puzzles ?? 0,
    ...(tier ? { difficulty: tier } : {}),
    gate: { type: "tomb-key", tombId, index },
    end: "staircase",
  }
}

/** A hidden side path, invisible without the Detection perk. */
export const hiddenPath = (opts: PathOpts & { encounter?: string | string[] } = {}): SideSectionConstraint => {
  const { puzzles, tier, encounter, ...rest } = opts
  return {
    ...rest,
    pathPuzzles: puzzles ?? 0,
    ...(tier ? { difficulty: tier } : {}),
    hidden: true,
    ...(encounter !== undefined ? { encounter } : {}),
  }
}
