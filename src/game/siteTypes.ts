export type NodeType = "puzzle" | "fork" | "gate" | "treasure" | "stairhead" | "exit"

export type PuzzleFamily = "sumplete"

export type TreasureReward =
  | { type: "hieroglyphs" }
  | { type: "mapPiece" }
  | { type: "mosaicPiece" }
  | { type: "tombKey"; keyId: string }

export type SiteNode = {
  id: string
  type: NodeType
  floor: number
  gridX: number
  family?: PuzzleFamily
  reward?: TreasureReward
}

export type GateType = "seal" | "ward"

export type SiteEdge = {
  id: string
  fromNodeId: string
  toNodeId: string
  gateType?: GateType
  requiredKeyId?: string
}

export type SiteLayout = {
  siteId: string
  nodes: SiteNode[]
  edges: SiteEdge[]
  entranceNodeId: string
  exitNodeId: string
  criticalPath: string[]
}

export type SiteConfig = {
  floors: number
  allowedNodeTypes: NodeType[]
  maxBranchFactor: number
  gates: "none" | "seal-only" | "seal+ward"
  puzzleBudget: number
  puzzlePlacement: "spine-heavy" | "balanced" | "branch-heavy"
  mapPiece: boolean
  rewards: {
    hieroglyphNodes: number
    mosaicDepth: number
  }
  pins?: NodePin[]
}

export type NodePin = {
  nodeType: NodeType
  floor?: number
  gridX?: number
}

export type ValidationReason =
  | { type: "criticalPathBlocked"; nodeId: string; missingKeyId: string }
  | { type: "keyAfterGate"; gateEdgeId: string; keyNodeId: string }
  | { type: "allBlandFork"; forkNodeId: string }
  | { type: "mapPieceNotSealReachable"; nodeId: string }
  | { type: "mapPieceMissing" }
  | { type: "mapPieceDuplicate"; siteIds: string[] }
  | { type: "mosaicMissing" }
  | { type: "mosaicDuplicate"; siteId: string }

export type ValidationResult = { valid: true } | { valid: false; reasons: ValidationReason[] }

export type AssemblerFailure = { success: false; reasons: ValidationReason[] }

export type AssemblerResult = { success: true; layout: SiteLayout } | AssemblerFailure
