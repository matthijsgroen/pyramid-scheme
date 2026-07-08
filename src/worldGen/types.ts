export type Tier = "starter" | "junior" | "expert" | "master" | "wizard"
// Authored puzzle-count progression across a journey's pyramids: `start` on pyramid 1,
// `end` on the last pyramid, linearly interpolated in between. Explicit and literal —
// no implicit spread happens unless a range is authored.
export type PathPuzzlesRange = { start: number; end: number }
export type JourneyDef = { id: string; tier: Tier; pathPuzzles: number | PathPuzzlesRange; levelCount: number }
export type Difficulty = "starter" | "junior" | "expert" | "master" | "wizard"

export type ConsumableType = "bandage" | "oil" | "trapTool"
export type TreasureReward =
  | { type: "mosaicPiece" }
  | { type: "mapPiece"; tombId: string }
  | { type: "hieroglyphs" }
  | { type: "hieroglyphFragment"; hieroglyphId: string; pieceIndex?: number }
  | { type: "tombKey"; keyId: string }
  | { type: "consumable"; consumable: ConsumableType }
  | { type: "fragmentSlot" }

export type SubSection = {
  pathPuzzles: number
  chestEvery?: number
  difficulty: Difficulty
  end: "treasure" | "staircase" | { stairId: string }
  gate?: { type: "floor-key"; color?: string } | { type: "tomb-key"; wardKeyId: string }
  endReward?: TreasureReward
  hidden?: boolean
  trapped?: boolean
}
export type SideSection = SubSection & {
  sideSections?: SubSection[]
}

export type FloorConfig = {
  pathPuzzles: number
  chestEvery?: number
  difficulty: Difficulty
  end: "treasure"
  exitOrStaircase: "exit" | "staircase" | { stairId: string }
  entrance?: "stairhead" | { stairId: string }
  sideSections: SideSection[]
  mainEndReward?: TreasureReward
  chestRewards?: TreasureReward[]
  puzzleFamily?: "sumplete" | "tableau"
  lastMainPuzzleFamily?: "crocodile"
  consumableDensity?: number
  corridorStraightness?: number
  packing?: number
}

export type SiteConfig = FloorConfig[]

export type FragmentSlot = { journeyId: string; slotIndex: number }
export type Assignment = { journeyId: string; slotIndex: number; hieroglyphId: string }

// Per-pyramid plan: resolved pathPuzzles after worldSpec constraints + scaling + auto-correction
export type ChestSlotPlan = { journeyId: string; tier: Tier; pathPuzzles: number }

export type TombJourneyDef = { id: string; tier: Tier; levelCount: number }
