import type { Tier, Difficulty, PathPuzzlesRange } from "./types"
import type { DecorationKind, HandleSide, Patron, SiteCondition, WallDecorationKind } from "../game/siteTypes"
import type { PlacedContainer } from "../game/regions"
import type { BarrierOrder, Control, Obstacle } from "@/game/obstacles"
import type { PlacedLock } from "@/game/floorLocks"
import type { RealisationBinding } from "@/game/lockCompile"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import { wardKeyDifficulty } from "../data/difficultyLevels"

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
// A reward hint is a currency id — the DSL authors a soft placement preference for that
// currency (resolved to a `{ type: "fragmentSlot", prefers: <id> }` slot), never a baked
// reward. Unified bucket grammar: `<currencyId>` prefers any instance of that currency,
// `<currencyId>:<instanceId>` prefers one specific instance (see the placement solver).
// "junk" is the plain-loot bucket the density settings already author as `end: "junk"` — naming it
// here lets an explicitly authored section ask for the same thing, so the two authoring routes
// share one vocabulary instead of the preference being reachable only via a density preset.
export type RewardHint = "mosaicPiece" | "mapPiece" | "hieroglyph" | "junk" | `${string}:${string}`
// Structured reward — carries specific IDs; string form is a shorthand resolved by tier context
export type RewardSpec = RewardHint | { type: "mapPiece"; tombId: string } | { type: "tombKey"; keyId: string }
// Structured gate — tomb-key references a perk by tomb journey ID + zero-based index. A floor-key's
// `keyId`/`ownerMod` name an authored key instead of the floor's own rotation — see
// worldGen/types.ts's SubSection["gate"] for what naming one changes.
export type GateSpec =
  | GateType
  | null
  | { type: "tomb-key"; tombId: string; index: number }
  | { type: "floor-key"; color?: KeyColor; keyId?: string; ownerMod?: string }

export type Theme = string // e.g. "desert", "underwater" — visual hint to renderer

export type PyramidSelector = number | "first" | "last" | "middle" | `${number}-${number}` | `last-${number}`

/** Where along a path's encounter chain a selector applies. 1-based positions: `"first"`, `"last"`,
 * an explicit `n`, or `{ every: k, from?: n }` (every k-th node, optionally starting at the n-th). */
export type NodeWhere = "first" | "last" | number | { every: number; from?: number }

/** An authoring selector that assigns an encounter preference to chosen node positions of a path
 * (main path OR any side section). Generalises the old hardcoded "last main puzzle = capstone" into
 * uniform authoring: `nodes: [{ where: "last", encounter: "capstone" }]`, `{ where: {every: 3},
 * encounter: "trap" }`, `{ where: 4, encounter: "arithmetic-reflex" }`. Unselected nodes fall back
 * to the path's `encounter` default; on overlap, the LATER selector in the array wins. Currently
 * carries a family-swap (`encounter`) only; a `gate?` extension is designed but unbuilt
 * (docs/mods/ARCHITECTURE.md ("Authoring: node selectors")). */
export type NodeSelector = {
  where: NodeWhere
  /** Family/tag for the selected node(s) — an exact family id or a tag (e.g. "capstone", "trap"). */
  encounter?: string | string[]
}

/** Expand `nodes` selectors against a path's node `count` into a sparse 0-based index → encounter
 * role map (the resolved form the gen-time encounter pass + assembler read). 1-based `where`
 * positions; out-of-range positions are dropped; later selectors win on overlap. Pure. */
export const resolveNodeSelectors = (
  nodes: NodeSelector[] | undefined,
  count: number
): Record<number, string | string[]> => {
  const out: Record<number, string | string[]> = {}
  if (!nodes || count <= 0) return out
  const set = (oneBased: number, enc: string | string[] | undefined) => {
    const i = oneBased - 1
    if (enc !== undefined && i >= 0 && i < count) out[i] = enc
  }
  for (const sel of nodes) {
    const w = sel.where
    if (w === "first") set(1, sel.encounter)
    else if (w === "last") set(count, sel.encounter)
    else if (typeof w === "number") set(w, sel.encounter)
    else {
      // Clamp step to a positive integer so a bad `every` (0, negative, fractional) can't hang the
      // build; a nonsense value degrades to "every node" rather than looping forever.
      const step = Math.max(1, Math.floor(w.every))
      for (let pos = w.from ?? 1; pos <= count; pos += step) set(pos, sel.encounter)
    }
  }
  return out
}

export type SideSectionConstraint<TExtra extends string = never> = {
  /**
   * A NAME FOR THIS PATH, so a player's progress in it is tied to the path rather than to its position
   * among its siblings.
   *
   * Unlabelled sections are addressed by where they sit — `s0` is the first sidepath of the main path,
   * `s0.1` its second sub-path — which is enough until a sidepath is inserted AHEAD of another: every
   * later one shifts down, and a save follows the index rather than the place. Labelling the paths that
   * matter pins them; the rest keep the positional address, so nothing has to be named that does not
   * need to be. See docs/game-design/world-stability.md.
   *
   * Unique within a floor, and not of the form the positional addresses take (`main`, `s3`, `s3.1`) —
   * the assembler refuses to build a floor that breaks either.
   */
  label?: string
  gate?: GateSpec
  pathPuzzles?: PathPuzzlesPreset | number
  difficulty?: Difficulty
  /** Which family/tag renders this section's intermediate rooms — an exact registered family
   * id (e.g. "tableau", "sumplete") or a tag (e.g. "trap", "puzzle"). Omit = the default for
   * this section's context (a side path defaults to the "puzzle" tag, i.e. sumplete). */
  encounter?: string | string[]
  /** Per-node encounter selectors — override `encounter` at chosen positions of this section's own
   * puzzle chain (e.g. every 3rd a trap). See NodeSelector. */
  nodes?: NodeSelector[]
  /** Opaque payload for whichever family renders this section's rooms — e.g. a tableau
   * section's `{runNr: 2}`, pulled through that family's own zod schema at assembly time
   * (siteAssembler.ts's ResolveKeyRequirements). Lets a tableau corridor be authored
   * anywhere (main path or a ward-gated side path) instead of being tied to floor position. */
  encounterArgs?: unknown
  /** Which skin this section's puzzle rooms wear — a name a family may recognise (`FamilyMeta.themes`),
   * not a look this layer knows anything about. Unset inherits the site's, and a family with no skin
   * for the resolved name silently draws its default. */
  theme?: Theme
  endReward?: RewardSpec | TExtra
  sideSections?: SideSectionConstraint<TExtra>[]
  /** Pool of decoration kinds this section's fork/endpoint rooms may draw from. */
  decorations?: DecorationKind[]
  /** Pool of wall-item kinds those rooms may hang on a wall. */
  wallDecorations?: WallDecorationKind[]
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
  /** Per-node encounter selectors — override `encounter` at chosen positions of the main-path
   * puzzle chain (e.g. `{ where: "last", encounter: "capstone" }` for the crocodile capstone). See
   * NodeSelector. Replaces the old hardcoded last-main-puzzle special case. */
  nodes?: NodeSelector[]
  /** WHAT THE CARVE MUST PROVIDE: `count` junctions with at least `exits` ways out free to be closed
   * — the main path onward and the side paths off the junction, never the way back, never one
   * something else already stands in, never one into a hidden branch. A carve offering fewer is
   * re-carved and a floor no carve can satisfy fails the build.
   *
   * Structural and owned by no mod: the same `forks` carves the same floor whether or not anything
   * is ever stood in those junctions, which is what lets a switch's mod leave the build without
   * moving a wall. */
  forks?: { exits: number; count: number }[]
  /** A passage from one named section to another that the player may take only in that direction.
   * Both ends name a section address — a `label` where a section has one, the positional `s0`/`s1.2`
   * where it does not, and `main` for the main path. Structural, like `forks`.
   *
   * Named ends rather than `forks`' counts: on a floor built with no side sections there is no address
   * for either end, so the drop can only ever be refused where `forks` would still be satisfied. */
  oneWays?: { from: string; to: string }[]
  /** The realisation every one-way of this floor is crossed through, named here and never in the lock. A
   * floor with a one-way and no realisation is refused: there is no default. */
  oneWayRealisation?: string
  /** A LEVER standing in the section `in` names. It hangs one way or the other: on the side it hangs
   * on, the entrance gate of every section that side names stands open, and every section the other
   * side names stands shut. It starts on `starts`, left unless said otherwise. Section addresses, the
   * same vocabulary `oneWays` uses for its two ends.
   *
   * What a fork cannot express: a switch decides which of ITS OWN ways out opens, while a handle
   * reaches across the floor. The author names where the lever stands and what it opens, and nothing
   * else — the gate ids are derived from the floor's own authoring address and the section each gate
   * stands on, so a position kept from an earlier layout cannot come to fit a door it was never
   * thrown for. */
  handles?: { in: string; left: string[]; right: string[]; starts?: HandleSide }[]
  /** The coarse layout this floor's regions are named in — see game/regions.ts's RegionGraph. */
  regionLayout?: PlacedContainer
  /** WHAT STANDS BETWEEN THE FLOOR'S REGIONS, named once and referred to by id — the topology mod's,
   * pointing at `regionLayout` by region name (see game/obstacles.ts). A control names which
   * obstacles each of its states opens. Both drop when the mod is not registered, and the identical
   * walls then carve with every connection open. */
  obstacles?: Obstacle[]
  controls?: Control[]
  /** The order of the gates on any connection that carries several, from `between[0]` to `between[1]`
   * — required wherever a connection has more than one gate (see game/obstacles.ts's BarrierOrder). */
  barrierOrder?: BarrierOrder[]
  /** LOCKS standing on this floor in sequence, each a `Lock` value shared by reference between every floor that
   * uses it. A second placement of one lock on a floor must say `as`. Compiled into `regionLayout`, `obstacles`,
   * `controls`, `forks` and `barrierOrder` when the floor is assembled, so authoring those beside `locks` is
   * refused. Floor-level only: a lock is placed on a floor, never inherited from the pyramid. */
  locks?: PlacedLock[]
  /** The realisation each control kind of this floor's locks is dressed as, and `"region-barrier"` the one (water, sand)
   * every barred region is dressed as, floor level: it wins, per kind, over the pyramid, journey and difficulty
   * declarations. The built floor carries the resolved binding — see FloorConfig.realisations. */
  realisations?: RealisationBinding
  /** A SWITCH: `encounter` stands in a junction `forks` reserved and closes its free ways out, so the
   * player stands in the fork and what is in it decides which way opens. Between `min` and `max` of
   * the reserved junctions get one, and a `min` past what `forks` reserves fails the build.
   *
   * The author names what stands there and nothing else: not which junction (the carve chooses where
   * they fall), not which ways out (the builder chooses, and reports them back on the room), and not
   * the keys. Those are derived from the floor's own authoring address and the section each way out
   * reaches, because how many ways out there are is not something the authoring can know and a name
   * the carve chose would let a key survive a re-carve into a door it does not belong to. */
  switches?: { encounter: string | string[]; min: number; max: number }
  /** How often the maze continues straight instead of turning, 0-1. Defaults to 0.65; lower = more winding. */
  corridorStraightness?: number
  /** Main-path length multiplier, relative to actual content. Defaults to 1; lower = a shorter, tighter walk, higher = a longer, more wandering one. */
  packing?: number
  /** The seed this floor carves at, in place of the one its address derives. Authored only where the floor
   * has no baked output to carry a searched seed; every other floor's seed is stamped by the bake. */
  seed?: number
  /** Isolates the main path's cells from leftover maze edges in a compact layout, so a
   * shortcut can't merge around a main-path puzzle room. */
  sealed?: boolean
  mainEndReward?: RewardHint | TExtra
  /** Opaque payload for whichever family renders the main path's rooms — see
   * SideSectionConstraint.encounterArgs above for the full rationale. */
  encounterArgs?: unknown
  /** Which skin this floor's puzzle rooms wear. Unset inherits the site's — so one floor can be a night
   * floor inside a plain pyramid, most-specific winning the same way `difficulty` and `encounter` do. */
  theme?: Theme
  /** Pool of decoration kinds the main path's fork/endpoint rooms may draw from. */
  decorations?: DecorationKind[]
  /** Pool of wall-item kinds those rooms may hang on a wall. */
  wallDecorations?: WallDecorationKind[]
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

/** One authored ward wing: a gated staircase to a bonus floor at `difficulty`, keyed to a
 * chosen tomb treasure (`tomb`/`index`). Authored form of `wardWings` — varied per wing. */
export type WardWingSpec = {
  tomb: string
  index: number
  difficulty?: Difficulty
  puzzles?: number
  /** Soft placement preference for the wing's own bonus-floor reward (e.g. "hieroglyph" or
   * "mosaicPiece") — same grammar as a `wardChest`'s `endReward`. Omit for the default generic
   * fragment slot. */
  endReward?: RewardHint
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
  /** Pool of decoration kinds every floor and side section of this site draws its props from, unless
   * one names its own. Authored at tier level this dresses a whole rank in one line. Purely drawn —
   * a free field (docs/game-design/world-spec-stability.md). */
  decorations?: DecorationKind[]
  /** Pool of wall items every floor and side section of this site hangs on its walls, unless one names
   * its own. Its own vocabulary, because a wall item is not a prop (see WallDecorationKind). Purely
   * drawn — a free field (docs/game-design/world-spec-stability.md). */
  wallDecorations?: WallDecorationKind[]
  /**
   * Something that has got into this whole site and shows on every floor of it: water standing in it,
   * green forcing through the brick. `amount` is 0-1 like every other fraction here — 0.25 is a damp
   * corner, 1 is the pyramid the journey is remembered for.
   *
   * Authored HERE rather than per floor on purpose. The point of a condition is that it survives the
   * climb: an agriculture journey can push one of its pyramids to overdrive and have the green follow
   * the player from the merchant's cellar to the gods' vault, which is not something a per-floor hour
   * can say. Purely drawn — a free field (docs/game-design/world-spec-stability.md).
   */
  condition?: SiteCondition
  /**
   * Whose tomb this is — see Patron in game/siteTypes.ts.
   *
   * Authored on the PYRAMID beside `condition` and for the same reason: a dedication is a property of
   * the site, not of one floor, and the point is that it holds all the way up the climb. A journey
   * named for a god says so once here rather than seven times.
   *
   * Purely drawn — a free field (docs/game-design/world-spec-stability.md). It chooses
   * `<kind>-<patron>.png` over the generic art for the five kinds a god appears on, and falls back
   * silently where that file does not exist.
   */
  patron?: Patron
  /** Default family/tag for this pyramid/tomb's main-path encounter rooms — e.g. a tomb sets
   * "tableau" (or the "tomb-puzzle" tag) here so every floor's main-path rooms use it. An array is
   * "any of these". */
  encounter?: string | string[]
  /** Junctions every floor of this site must carve, unless a floor names its own — see
   * FloorConstraint.forks. Authored here, a whole climb is shaped in one line. */
  forks?: { exits: number; count: number }[]
  /** One-way passages every floor of this site must carve, unless a floor names its own — see
   * FloorConstraint.oneWays. Authored here, a whole climb is shaped in one line. */
  oneWays?: { from: string; to: string }[]
  /** The realisation the one-ways of every floor of this site are crossed through, unless a floor names its
   * own — see FloorConstraint.oneWayRealisation. The one-way's entry in `realisations`, spelt alone. */
  oneWayRealisation?: string
  /** The realisation each control kind is dressed as, declared as a difficulty (`tier(...)`), journey or pyramid
   * rule. Resolved per kind, the most specific rule naming a kind winning, and a floor's own `realisations` over
   * all of them. */
  realisations?: RealisationBinding
  /** The levers every floor of this site stands, unless a floor names its own — see
   * FloorConstraint.handles. */
  handles?: { in: string; left: string[]; right: string[]; starts?: HandleSide }[]
  /** The layout every floor of this site carries, unless a floor names its own — see
   * FloorConstraint.regionLayout. */
  regionLayout?: PlacedContainer
  /** The obstacles/controls standing in that layout on every floor of this site, unless a floor
   * names its own — see FloorConstraint.obstacles/.controls. */
  obstacles?: Obstacle[]
  controls?: Control[]
  /** The gate order standing on those connections, unless a floor names its own — see
   * FloorConstraint.barrierOrder. */
  barrierOrder?: BarrierOrder[]
  /** The switch every floor of this site stands in the junctions `forks` reserved, unless a floor
   * names its own — see FloorConstraint.switches. */
  switches?: { encounter: string | string[]; min: number; max: number }
  /**
   * Arguments handed to every encounter of this site that does not carry its own.
   *
   * Opaque here on purpose: world-gen never reads it. A family declares what it wants and parses it with
   * its own zod schema (`tableauEncounterArgsSchema` is the reference), so a knob can be added to one
   * family without any other layer learning about it. Floors and side paths inherit it; either may
   * override with its own `encounterArgs`.
   */
  encounterArgs?: unknown
  /** How often the maze continues straight instead of turning, 0-1. Defaults to 0.65; lower = more winding. */
  corridorStraightness?: number
  /** Chance [0-1], rolled per pyramid, of an extra-winding floor. Ignored if corridorStraightness is set. */
  windyChance?: number
  /** corridorStraightness used on a windyChance hit. Default 0.35. */
  windyStraightness?: number
  /** Main-path length multiplier, relative to actual content. Defaults to 1; lower = a shorter, tighter walk, higher = a longer, more wandering one. */
  packing?: number
  /** The seed the floor carves at, in place of the one its address derives. Authored only where the floor
   * has no baked output to carry a searched seed; every other floor's seed is stamped by the bake. */
  seed?: number
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
  /** Ward-gated bonus floors branching off the last main floor. A `number` auto-generates that
   * many, keyed from this tier's own tomb at the pyramid's own difficulty. A `WardWingSpec[]`
   * authors each wing explicitly — its own tomb key + difficulty — for varied "come back
   * stronger" wings across a tier. */
  wardWings?: number | WardWingSpec[]
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

// A ward gate's content difficulty defaults to matching the gate's OWN key exactly (the
// player's read of "how hard is this lock" and "how hard is what's behind it" should agree) —
// derived from the same tomb/index the gate itself resolves its key from, so an author never has
// to separately compute or keep it in sync by hand. An explicit `tier` still overrides this.
const wardKeyTier = (tombId: string, index: number): Difficulty | undefined =>
  wardKeyDifficulty(TOMB_PERK_IDS[tombId]?.[index])

/** A side path gated by a ward key (tomb treasure), ending in a stairhead to the next floor. */
export const wardPath = (opts: PathOpts & { tomb: string; index: number }): SideSectionConstraint => {
  const { puzzles, tier, tomb: tombId, index, ...rest } = opts
  const resolvedTier = tier ?? wardKeyTier(tombId, index)
  return {
    ...rest,
    pathPuzzles: puzzles ?? 0,
    ...(resolvedTier ? { difficulty: resolvedTier } : {}),
    gate: { type: "tomb-key", tombId, index },
    end: "staircase",
  }
}

/** Authors one ward wing — a gated bonus floor at a chosen difficulty, keyed to a chosen tomb
 * treasure. Pass an array of these as `wardWings` for varied "come back stronger" wings. */
export const wardWing = (opts: {
  tomb: string
  index: number
  tier?: Difficulty
  puzzles?: number
  endReward?: RewardHint
}): WardWingSpec => {
  const resolvedTier = opts.tier ?? wardKeyTier(opts.tomb, opts.index)
  return {
    tomb: opts.tomb,
    index: opts.index,
    ...(resolvedTier ? { difficulty: resolvedTier } : {}),
    ...(opts.puzzles !== undefined ? { puzzles: opts.puzzles } : {}),
    ...(opts.endReward !== undefined ? { endReward: opts.endReward } : {}),
  }
}

/** A side path gated by a ward key (tomb treasure) ending in a loot chest — a "come back
 * later" teaser. No endReward: the gated treasure becomes a fillable slot the loot solver
 * assigns (currency if reachable, else mosaic/junk). Distinct from wardPath (a staircase
 * route) and wardWings (a whole new floor). */
export const wardChest = (opts: PathOpts & { tomb: string; index: number }): SideSectionConstraint => {
  const { puzzles, tier, tomb: tombId, index, ...rest } = opts
  const resolvedTier = tier ?? wardKeyTier(tombId, index)
  return {
    ...rest,
    pathPuzzles: puzzles ?? 0,
    ...(resolvedTier ? { difficulty: resolvedTier } : {}),
    gate: { type: "tomb-key", tombId, index },
    end: "treasure",
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
