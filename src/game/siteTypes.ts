export type PuzzleFamily = "sumplete" | "tableau" | "crocodile"
export type RoomType = "portal" | "fork" | "encounter"
// OPEN reward vocabulary (docs/mods/distribution-primitive-design.md §D; ARCHITECTURE invariant 1):
// core enumerates no reward/currency id. A reward is a `type` tag plus arbitrary payload fields the
// owning mod defines. Validated at load against per-type zod schemas registered by the mods
// (src/app/SiteMap/rewardSchemas). Producers/consumers that own a type narrow it via its schema
// (mods) or the core-owned shapes below.
export type TreasureReward = { type: string } & Record<string, unknown>

// Core-owned reward shapes — NOT a mod-currency enumeration: `fragmentSlot` is the world-gen
// placement sentinel (never serialized), and `mapPiece`/`tombKey` are tomb-treasure, which stays
// core until that mod is extracted (its own later slice). Core code casts to these when it reads
// its own reward types; the open `TreasureReward` stays the surface everything passes around.
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
  hidden?: boolean
}
export type GateVariant = "floor-key" | "tomb-key"
export type KeyColor = "blue" | "red" | "green" | "yellow" | "purple"
export type DecorationKind = "sarcophagus" | "statue" | "fountain" | "pit" | "rubble" | "pillar" | "chestProp"
export type RoomCell = {
  type: "room"
  roomType: RoomType
  dirs: ReadonlySet<Direction>
  state: CellState
  sectionHash?: string
  hidden?: boolean
  reward?: TreasureReward
  /** `reward` is a Fez-shop purchase (this many coins), not a free pickup. */
  shopPrice?: number
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
  /** endReward is a Fez-shop purchase (this many coins) instead of a free pickup. */
  shopPrice?: number
  puzzleRewards?: (TreasureReward | undefined)[]
  hidden?: boolean
  /** Isolates this section's cells from leftover maze edges, so a compact layout can't merge a shortcut around it. */
  sealed?: boolean
  /** Family/tag(s) for this section's own intermediate rooms — defaults to the "puzzle" tag
   * (sumplete) when unset (a floor's tableau family never leaks onto a side path unless a
   * section explicitly opts in). Never "crocodile" — that's a main-path-finale-only family.
   * An array means AND: every listed tag must be present on the resolved family. */
  encounter?: string | string[]
  /** Pool of decoration kinds available to this section's fork/endpoint rooms. */
  decorations?: DecorationKind[]
  /** Opaque payload for whichever family renders this section's rooms (e.g. a tableau's
   * `{runNr}`) — validated by that family's own ResolveKeyRequirements resolver, never
   * interpreted here. See ResolveKeyRequirements in siteAssembler.ts. */
  encounterArgs?: unknown
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
  puzzleRewards?: (TreasureReward | undefined)[]
  /** Default family/tag(s) for this floor's main-path encounter rooms. An array means AND. */
  encounter?: string | string[]
  /** If set, the last main-path puzzle room uses this family instead of `encounter`. */
  lastMainPuzzleFamily?: PuzzleFamily
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

export type CompassResult = {
  journeyId: string
  levelIdx: number
  floorIdx: number
  hieroglyphId: string
  pieceIndex: number
}

export type ConsumableResult = {
  journeyId: string
  edgeId: string
}
