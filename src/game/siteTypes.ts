export type RoomType = "portal" | "fork" | "encounter"
// OPEN reward vocabulary (docs/mods/distribution-primitive-design.md §D; ARCHITECTURE invariant 1):
// core enumerates no reward/currency id. A reward is a `type` tag plus arbitrary payload fields the
// owning mod defines. Validated at load against per-type zod schemas registered by the mods
// (src/app/SiteMap/rewardSchemas). Producers/consumers that own a type narrow it via its schema
// (mods) or the core-owned shapes below.
export type TreasureReward = { type: string } & Record<string, unknown>

// Core-owned reward shapes — NOT a mod-currency enumeration. `fragmentSlot` is the world-gen
// placement sentinel (never serialized). `mapPiece`/`tombKey` belong to the tomb-treasure mod
// (effect/display/schema/state all live there), but their world-gen PLACEMENT hasn't migrated to
// the solver yet (§E): reachability harvest, validate.ts counting, and the tombKey construction
// literal still cast to these shapes. Kept here as structural cast helpers until §E; the open
// `TreasureReward` stays the surface everything passes around.
export type FragmentSlotReward = { type: "fragmentSlot"; prefers?: string }
export type MapPieceReward = { type: "mapPiece"; tombId: string }
export type TombKeyReward = { type: "tombKey"; keyId: string }

export type Direction = "n" | "s" | "e" | "w"
export type CellState = "fogged" | "visible" | "reachable" | "completed"

export type EmptyCell = { type: "empty" }
export type CorridorCell = {
  type: "corridor"
  dirs: ReadonlySet<Direction>
  state: CellState
  sectionHash?: string
  /** The hash this cell had before the section hash stopped covering the encounter, so a save
   *  written under the old scheme still recognises its own cells. Read-only compatibility — nothing
   *  writes it back, and it can go once no live save predates that change. */
  legacySectionHash?: string
  hidden?: boolean
}
export type GateVariant = "floor-key" | "tomb-key"
export type KeyColor = "blue" | "red" | "green" | "yellow" | "purple"
// Canonical order for anything that LISTS colors (a key ring, a chest's badges) — world-gen assigns
// hues in whatever order a floor's gates came out, and a status readout that reshuffles between
// floors is unreadable.
export const KEY_COLORS: readonly KeyColor[] = ["blue", "red", "green", "yellow", "purple"]
export type DecorationKind = "sarcophagus" | "statue" | "fountain" | "pit" | "rubble" | "pillar" | "chestProp"
export type RoomCell = {
  type: "room"
  roomType: RoomType
  dirs: ReadonlySet<Direction>
  state: CellState
  sectionHash?: string
  /** See CorridorCell.legacySectionHash. */
  legacySectionHash?: string
  hidden?: boolean
  reward?: TreasureReward
  /** A shop node's stock: up to `rewardCapacity` reward slots (currency pieces + consumables) the
   * mods placed into the section's `rewards[]`. The shop family renders these as its buyable list;
   * each is priced by the shop and claimed per (node, index). Entries may be undefined (unfilled). */
  stock?: (TreasureReward | undefined)[]
  requiredKeyId?: string
  // Same precondition as requiredKeyId, generalized to several — every id must be owned
  // for this room to be completable. A tableau needing several hieroglyphs complete is
  // several independent locks, not one; resolved per-room at assembly time by whichever
  // family owns it (see ResolveKeyRequirements in siteAssembler.ts) — core never
  // interprets what an id means.
  requiredKeyIds?: string[]
  gateVariant?: GateVariant
  keyColor?: KeyColor
  keyColors?: KeyColor[]
  // This room's position among its own section's puzzle rooms (0-based, path order) —
  // purely structural, meaningful only to whichever family reads it (e.g. the tableau
  // family re-deriving which TableauLevel it presents from journeyId + the section's own
  // encounterArgs.runNr + this index, not from floor position).
  pathIndex?: number
  // Which entry of its family's seed list this room draws (see src/game/seeds/boardIndex.ts). Every
  // room drawing from one list gets a different entry, so no two rooms in the world serve the same
  // board. Unset where the site isn't part of the baked world (stories, specs, the builder), and the
  // room falls back to indexing the list by its own hash.
  boardIndex?: number
  // The authored encounter args for this room's family (e.g. a tableau's `{ runNr }`), carried
  // from the FloorConfig/SideSection so the play-time family can re-derive exactly what world-gen
  // resolved (which authored TableauLevel this is). Opaque to core; each family reads it via its
  // own zod schema. Mirrors FloorConfig/SideSection.encounterArgs.
  encounterArgs?: unknown
  // The role this room was allocated for — "trade", "sky", "puzzle". What the AUTHOR asked for, where
  // `family` is what that request resolved to, and a family reads it to know which of its identities this
  // room is (the same board is a star map for `sky` and a haul-road network for `trade`).
  role?: string | string[]
  // The tier this room's puzzle generates at, carried from the FloorConfig/SubSection that authored
  // it — a section may sit at a different difficulty than its floor (a ward pocket, a deliberately
  // gentler detour), and the room is what the player meets, not the floor. Unset falls back to the
  // floor's own difficulty.
  difficulty?: Difficulty
  // Which skin this room's family should wear (docs/instructions/puzzle-screens.md §2), carried from the
  // FloorConfig/SideSection that authored it. A NAME, not a look: core knows nothing about what it means,
  // and a family with no skin registered under it draws its default one.
  theme?: string
  // Registered family id (src/app/families/familyRegistry.ts) — open string, not a closed
  // union, since mods register their own families. Always set for roomType "encounter".
  family?: string
  // The resolved family's own tags (e.g. ["trap"], ["treasure"]) — lets domain-layer code
  // (siteValidator.ts, SiteMapView.tsx) classify a room without knowing family ids itself.
  tags?: string[]
  stairId?: string
  decoration?: DecorationKind
}
export type GridCell = EmptyCell | CorridorCell | RoomCell

export type FloorGrid = {
  readonly cells: ReadonlyArray<ReadonlyArray<GridCell>>
  /** The floor's own tier, straight off its FloorConfig — what the map is built OF. Room-level
   * `RoomCell.difficulty` can differ (a ward-chest teaser is authored at a later tier), so it must not
   * be used to infer this. Optional only because test fixtures build grids by hand. */
  readonly difficulty?: Difficulty
  readonly rows: number
  readonly cols: number
  readonly entrancePos: readonly [number, number]
  readonly exitPos: readonly [number, number]
  readonly siteId: string
  readonly staircases: Record<string, readonly [number, number]>
}

export type GateConfig = { type: "floor-key"; color?: KeyColor } | { type: "tomb-key"; wardKeyId: string }
export type { Difficulty } from "@/data/difficultyLevels"
import type { Difficulty } from "@/data/difficultyLevels"
export type SubSection = {
  pathPuzzles: number
  difficulty: Difficulty
  end: "treasure" | "staircase" | { stairId: string }
  gate?: GateConfig
  endReward?: TreasureReward
  rewards?: (TreasureReward | undefined)[]
  hidden?: boolean
  /** Isolates this section's cells from leftover maze edges, so a compact layout can't merge a shortcut around it. */
  sealed?: boolean
  /** Family/tag(s) for this section's own intermediate rooms — defaults to the "puzzle" tag
   * (sumplete) when unset (a floor's tableau family never leaks onto a side path unless a
   * section explicitly opts in). Never "crocodile" — that's a main-path-finale-only family.
   * An array means "any of these": the union of those tags' pools. Narrowing is a narrower tag's job. */
  encounter?: string | string[]
  /** Per-node encounter override: 0-based room index → family/tag, resolved from authored `nodes`
   * selectors (docs/mods/ARCHITECTURE.md ("Authoring: node selectors")). Room k uses `encountersByIndex[k] ?? encounter`;
   * at runtime the values are resolved family ids. */
  encountersByIndex?: Record<number, string | string[]>
  /** Pool of decoration kinds available to this section's fork/endpoint rooms. */
  decorations?: DecorationKind[]
  /** Opaque payload for whichever family renders this section's rooms (e.g. a tableau's
   * `{runNr}`) — validated by that family's own ResolveKeyRequirements resolver, never
   * interpreted here. See ResolveKeyRequirements in siteAssembler.ts. */
  encounterArgs?: unknown
  /** Skin name for this section's puzzle rooms — inherited from the site where the section authors none. */
  theme?: string
  /** The role these rooms were allocated for ("trade", "sky", "puzzle"…), kept alongside the family it
   * resolved to so a family can dress for the pool it was drawn from. */
  role?: string | string[]
}
export type SideSection = SubSection & {
  sideSections?: SubSection[]
}
export type FloorConfig = {
  pathPuzzles: number
  difficulty: Difficulty
  end: "treasure"
  exitOrStaircase: "exit" | "staircase" | { stairId: string }
  /** If set, the entrance room becomes an up-stairhead with this stairId. */
  entrance?: "stairhead" | { stairId: string }
  sideSections: SideSection[]
  /** Pool of decoration kinds available to the main path's fork/endpoint rooms. */
  decorations?: DecorationKind[]
  mainEndReward?: TreasureReward
  rewards?: (TreasureReward | undefined)[]
  /** Default family/tag(s) for this floor's main-path encounter rooms. An array means "any of these". */
  encounter?: string | string[]
  /** Per-node encounter override for the main path: 0-based room index → family/tag, resolved from
   * authored `nodes` selectors (e.g. the last room → "capstone"/crocodile). Room k uses
   * `encountersByIndex[k] ?? encounter`; baked to concrete family ids by the gen-time encounter
   * pass. Replaces the old last-only `lastMainPuzzleFamily`. See docs/mods/ARCHITECTURE.md ("Authoring: node selectors"). */
  encountersByIndex?: Record<number, string | string[]>
  /** How often the maze continues straight instead of turning, 0-1. Defaults to 0.65 (fairly straight); lower = more winding. */
  corridorStraightness?: number
  /** Main-path length multiplier, relative to actual content. Defaults to 1; lower = a shorter, tighter walk, higher = a longer, more wandering one. */
  packing?: number
  /** Isolates the main path's cells from leftover maze edges, so a compact layout can't merge a shortcut around a puzzle room. */
  sealed?: boolean
  /** Opaque payload for whichever family renders the main path's rooms (e.g. a tableau's
   * `{runNr}`) — validated by that family's own ResolveKeyRequirements resolver, never
   * interpreted here. See ResolveKeyRequirements in siteAssembler.ts. */
  encounterArgs?: unknown
  /** Skin name for this floor's puzzle rooms. Unset inherits the site's; a floor may override it. */
  theme?: string
  /** The role this floor's main-path rooms were allocated for, kept alongside the resolved family. */
  role?: string | string[]
}

// A site is one or more floors. Index 0 = surface.
export type SiteConfig = FloorConfig[]

export type ValidationReason =
  | { type: "keyAfterGate"; gatePos: readonly [number, number]; keyPos: readonly [number, number] }
  | { type: "allBlandFork"; forkPos: readonly [number, number] }
  | { type: "mapPieceNotSealReachable"; pos: readonly [number, number] }
  | { type: "mapPieceMissing" }
  | { type: "mapPieceDuplicate"; siteIds: string[] }
  | { type: "mosaicMissing" }
  | { type: "mosaicNotReachable" }
  | { type: "mosaicDuplicate"; siteId: string }

export type ValidationResult = { valid: true } | { valid: false; reasons: ValidationReason[] }
export type AssemblerReason = ValidationReason | { type: "noUngatedSectionForKey" } | { type: "layoutNotFound" }
export type AssemblerFailure = { success: false; reasons: AssemblerReason[] }
export type AssemblerResult = { success: true; grid: FloorGrid } | AssemblerFailure

// ── Detector types ────────────────────────────────────────────────────────────

export type DetectorMode = "compass" | "consumable" | "hiddenPassageway" | null

// `cell` (row,col within the floor) is resolved only at compass level 3 — it needs a floor
// assembly the lower levels don't pay for. See collection-and-detector-design.md §7.2.
export type CompassResult = {
  journeyId: string
  levelIdx: number
  floorIdx: number
  hieroglyphId: string
  pieceIndex: number
  cell?: { row: number; col: number }
  // Access facts a scanner observes while walking the config, for the readout to flag pieces you
  // can't collect yet (§7.2's readout is otherwise happy to point at gated content). Deliberately
  // raw facts, not a verdict: the scanner has no access to what the player holds, so judging
  // reachability is the consumer's job (useDetector).
  //
  // Every tomb-key ward gate between the floor and this piece — ALL must be held to reach it.
  wardKeys?: readonly string[]
  // The piece sits in a hidden corridor: structurally reachable but discovery-gated (§7.3), so it
  // needs the corridor detector or luck rather than a key.
  hidden?: boolean
  // The piece is stock in a shop, so it costs money on top of getting there — a blocker the
  // readout can't evaluate, hence surfaced as uncertainty rather than a lock.
  inShop?: boolean
}

// Whether the player can actually go and collect a compass hit right now. The readout only models
// some of what can block a piece, so this deliberately has a "don't know" value rather than
// collapsing unknowns into "fine":
// - "locked"  a checkable blocker IS in the way (a ward key not held, or the tier not unlocked)
// - "hidden"  in a hidden corridor: needs the corridor detector or luck, not a key (§7.3)
// - "unknown" a blocker exists that this readout can't evaluate (tomb map-piece entry, shop price)
// - "open"    nothing known is in the way — NOT a guarantee, just "we checked and found nothing"
export type CompassAccess = "open" | "locked" | "hidden" | "unknown"

// A compass hit with its access verdict resolved against what the player currently holds.
export type CompassHit = CompassResult & { access: CompassAccess; missingKeys?: readonly string[] }

// floorIdx + cell decoded from edgeId ("floor:row,col") so the supplies detector can narrow its
// readout by level (§7.2): L1 pyramid, L2 +floor, L3 +cell.
export type ConsumableResult = {
  journeyId: string
  edgeId: string
  floorIdx: number
  cell: { row: number; col: number }
}
