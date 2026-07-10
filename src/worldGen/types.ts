export type Tier = "starter" | "junior" | "expert" | "master" | "wizard"
// Authored puzzle-count progression across a journey's pyramids: `start` on pyramid 1,
// `end` on the last pyramid, linearly interpolated in between. Explicit and literal —
// no implicit spread happens unless a range is authored.
export type PathPuzzlesRange = { start: number; end: number }
export type JourneyDef = { id: string; tier: Tier; pathPuzzles: number | PathPuzzlesRange; levelCount: number }
export type Difficulty = "starter" | "junior" | "expert" | "master" | "wizard"

export type ConsumableType = "bandage" | "oil" | "trapTool"
// Mirrors game/siteTypes.ts's TreasureReward — same closed-union growth concern, see the
// comment there and docs/mods-architecture.md.
export type TreasureReward =
  | { type: "mosaicPiece" }
  | { type: "mapPiece"; tombId: string }
  | { type: "hieroglyphs" }
  | { type: "hieroglyphFragment"; hieroglyphId: string; pieceIndex?: number }
  | { type: "tombKey"; keyId: string }
  | { type: "consumable"; consumable: ConsumableType }
  | { type: "fragmentSlot" }
  | { type: "money"; amount: number }
  | { type: "sellable"; itemId: string }

export type SubSection = {
  pathPuzzles: number
  difficulty: Difficulty
  end: "treasure" | "staircase" | { stairId: string }
  gate?: { type: "floor-key"; color?: string } | { type: "tomb-key"; wardKeyId: string }
  endReward?: TreasureReward
  /** endReward is a Fez-shop purchase (this many coins) instead of a free pickup. */
  shopPrice?: number
  puzzleRewards?: (TreasureReward | undefined)[]
  hidden?: boolean
  /** Isolates this section's cells from leftover maze edges, so a compact layout can't merge a shortcut around it. */
  sealed?: boolean
  /** Family/tag for this section's own intermediate rooms — defaults to the "puzzle" tag
   * (sumplete) when unset. Never "crocodile" — that's a main-path-finale-only family. */
  encounter?: string
}
export type SideSection = SubSection & {
  sideSections?: SubSection[]
}

export type FloorConfig = {
  pathPuzzles: number
  difficulty: Difficulty
  end: "treasure"
  exitOrStaircase: "exit" | "staircase" | { stairId: string }
  entrance?: "stairhead" | { stairId: string }
  sideSections: SideSection[]
  mainEndReward?: TreasureReward
  puzzleRewards?: (TreasureReward | undefined)[]
  encounter?: string
  lastMainPuzzleFamily?: "crocodile"
  corridorStraightness?: number
  packing?: number
  /** Isolates the main path's cells from leftover maze edges, so a compact layout can't merge a shortcut around a puzzle room. */
  sealed?: boolean
}

export type SiteConfig = FloorConfig[]

export type FragmentSlot = { journeyId: string; slotIndex: number }
export type Assignment = { journeyId: string; slotIndex: number; hieroglyphId: string }

export type TombJourneyDef = { id: string; tier: Tier; levelCount: number }
