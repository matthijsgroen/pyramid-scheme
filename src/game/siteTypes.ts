export type PuzzleFamily = "sumplete" | "tableau" | "crocodile"
export type RoomType = "entrance" | "puzzle" | "trap" | "fork" | "gate" | "treasure" | "stairhead" | "exit"
export type ConsumableType = "bandage" | "oil" | "trapTool"
export type TreasureReward =
  | { type: "mosaicPiece" }
  | { type: "mapPiece"; tombId: string }
  | { type: "hieroglyphs" }
  | { type: "hieroglyphFragment"; hieroglyphId: string; pieceIndex: number }
  | { type: "tombKey"; keyId: string }
  | { type: "consumable"; consumable: ConsumableType }
  | { type: "fragmentSlot" }
  | { type: "money"; amount: number }
  | { type: "sellable"; itemId: string }

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
  gateVariant?: GateVariant
  keyColor?: KeyColor
  keyColors?: KeyColor[]
  family?: PuzzleFamily
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
  trapped?: boolean
  /** Pool of decoration kinds available to this section's fork/endpoint rooms. */
  decorations?: DecorationKind[]
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
  puzzleFamily?: PuzzleFamily
  /** If set, the last main-path puzzle room uses this family instead of puzzleFamily. */
  lastMainPuzzleFamily?: PuzzleFamily
  /** How often the maze continues straight instead of turning, 0-1. Defaults to 0.65 (fairly straight); lower = more winding. */
  corridorStraightness?: number
  /** Main-path length multiplier, relative to actual content. Defaults to 1; lower = a shorter, tighter walk, higher = a longer, more wandering one. */
  packing?: number
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
