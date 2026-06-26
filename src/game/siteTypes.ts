export type PuzzleFamily = "sumplete"
export type RoomType = "entrance" | "puzzle" | "fork" | "gate" | "treasure" | "stairhead" | "exit"
export type TreasureReward =
  | { type: "mosaicPiece" }
  | { type: "mapPiece" }
  | { type: "hieroglyphs" }
  | { type: "hieroglyphFragment"; hieroglyphId: string }
  | { type: "tombKey"; keyId: string }

export type Direction = "n" | "s" | "e" | "w"
export type CellState = "fogged" | "visible" | "reachable" | "completed"

export type EmptyCell = { type: "empty" }
export type CorridorCell = { type: "corridor"; dirs: ReadonlySet<Direction>; state: CellState }
export type GateVariant = "floor-key" | "tomb-key"
export type RoomCell = {
  type: "room"
  roomType: RoomType
  dirs: ReadonlySet<Direction>
  state: CellState
  reward?: TreasureReward
  requiredKeyId?: string
  gateVariant?: GateVariant
  family?: PuzzleFamily
}
export type GridCell = EmptyCell | CorridorCell | RoomCell

export type FloorGrid = {
  readonly cells: ReadonlyArray<ReadonlyArray<GridCell>>
  readonly rows: number
  readonly cols: number
  readonly entrancePos: readonly [number, number]
  readonly exitPos: readonly [number, number]
  readonly siteId: string
}

export type GateConfig = { type: "floor-key" } | { type: "tomb-key" }
export type Difficulty = "easy" | "medium" | "hard"
export type SideSection = {
  pathPuzzles: number
  chestEvery?: number
  difficulty: Difficulty
  end: "treasure" | "staircase"
  gate?: GateConfig
}
export type FloorConfig = {
  pathPuzzles: number
  chestEvery?: number
  difficulty: Difficulty
  end: "treasure"
  exitOrStaircase: "exit" | "staircase"
  sideSections: SideSection[]
  mainEndReward?: TreasureReward
  chestRewards?: TreasureReward[]
}

export type ValidationReason =
  | { type: "keyAfterGate"; gatePos: readonly [number, number]; keyPos: readonly [number, number] }
  | { type: "allBlandFork"; forkPos: readonly [number, number] }
  | { type: "mapPieceNotSealReachable"; pos: readonly [number, number] }
  | { type: "mapPieceMissing" }
  | { type: "mapPieceDuplicate"; siteIds: string[] }
  | { type: "mosaicMissing" }
  | { type: "mosaicDuplicate"; siteId: string }

export type ValidationResult = { valid: true } | { valid: false; reasons: ValidationReason[] }
export type AssemblerReason = ValidationReason | { type: "noUngatedSectionForKey" } | { type: "layoutNotFound" }
export type AssemblerFailure = { success: false; reasons: AssemblerReason[] }
export type AssemblerResult = { success: true; grid: FloorGrid } | AssemblerFailure
