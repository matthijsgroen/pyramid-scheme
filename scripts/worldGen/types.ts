export type Tier = "starter" | "junior" | "expert" | "master" | "wizard"
export type JourneyDef = { id: string; tier: Tier; pathPuzzles: number; levelCount: number }
export type Difficulty = "easy" | "medium" | "hard"

export type TreasureReward =
  | { type: "mosaicPiece" }
  | { type: "mapPiece"; tombId: string }
  | { type: "hieroglyphs" }
  | { type: "hieroglyphFragment"; hieroglyphId: string }
  | { type: "tombKey"; keyId: string }

export type SideSection = {
  pathPuzzles: number
  chestEvery?: number
  difficulty: Difficulty
  end: "treasure" | "staircase"
  gate?: { type: "floor-key" } | { type: "tomb-key" }
  endReward?: TreasureReward
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
  puzzleFamily?: "sumplete" | "tableau"
}

export type SiteConfig = FloorConfig[]

export type FragmentSlot = { journeyId: string; slotIndex: number }
export type Assignment = { journeyId: string; slotIndex: number; hieroglyphId: string }

// Per-pyramid plan: resolved pathPuzzles after worldSpec constraints + scaling + auto-correction
export type ChestSlotPlan = { journeyId: string; tier: Tier; pathPuzzles: number }

export type TombJourneyDef = { id: string; tier: Tier; levelCount: number }
