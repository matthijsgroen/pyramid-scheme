export type Tier = "starter" | "junior" | "expert" | "master" | "wizard"
export type JourneyDef = { id: string; tier: Tier; pathPuzzles: number; levelCount: number }
export type Difficulty = "starter" | "junior" | "expert" | "master" | "wizard"

export type TreasureReward =
  | { type: "mosaicPiece" }
  | { type: "mapPiece"; tombId: string }
  | { type: "hieroglyphs" }
  | { type: "hieroglyphFragment"; hieroglyphId: string; pieceIndex?: number }
  | { type: "tombKey"; keyId: string }

export type SubSection = {
  pathPuzzles: number
  chestEvery?: number
  difficulty: Difficulty
  end: "treasure" | "staircase"
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
  exitOrStaircase: "exit" | "staircase"
  sideSections: SideSection[]
  mainEndReward?: TreasureReward
  chestRewards?: TreasureReward[]
  puzzleFamily?: "sumplete" | "tableau"
  lastMainPuzzleFamily?: "crocodile"
  consumableDensity?: number
}

export type SiteConfig = FloorConfig[]

export type FragmentSlot = { journeyId: string; slotIndex: number }
export type Assignment = { journeyId: string; slotIndex: number; hieroglyphId: string }

// Per-pyramid plan: resolved pathPuzzles after worldSpec constraints + scaling + auto-correction
export type ChestSlotPlan = { journeyId: string; tier: Tier; pathPuzzles: number }

export type TombJourneyDef = { id: string; tier: Tier; levelCount: number }
