export type Tier = "starter" | "junior" | "expert" | "master" | "wizard"
// Authored puzzle-count progression across a journey's pyramids: `start` on pyramid 1,
// `end` on the last pyramid, linearly interpolated in between. Explicit and literal —
// no implicit spread happens unless a range is authored.
export type PathPuzzlesRange = { start: number; end: number }
export type JourneyDef = { id: string; tier: Tier; pathPuzzles: number | PathPuzzlesRange; levelCount: number }
export type Difficulty = "starter" | "junior" | "expert" | "master" | "wizard"

// One open reward type, shared: worldGen re-exports game/siteTypes rather than mirroring it
// (worldGen→game is an allowed edge). Core enumerates no reward id; see the doc comment there.
import type { TreasureReward, FragmentSlotReward, MapPieceReward, TombKeyReward } from "@/game/siteTypes"
export type { TreasureReward, FragmentSlotReward, MapPieceReward, TombKeyReward }

export type SubSection = {
  pathPuzzles: number
  difficulty: Difficulty
  end: "treasure" | "staircase" | { stairId: string }
  gate?: { type: "floor-key"; color?: string } | { type: "tomb-key"; wardKeyId: string }
  endReward?: TreasureReward
  rewards?: (TreasureReward | undefined)[]
  hidden?: boolean
  /** Isolates this section's cells from leftover maze edges, so a compact layout can't merge a shortcut around it. */
  sealed?: boolean
  /** Family/tag(s) for this section's own intermediate rooms — defaults to the "puzzle" tag
   * (sumplete) when unset. Never "crocodile" — that's a main-path-finale-only family. An
   * array means AND: every listed tag must be present on the resolved family. */
  encounter?: string | string[]
  /** Per-node encounter override: 0-based room index → family/tag, resolved from authored `nodes`
   * selectors. A room uses `encountersByIndex[k] ?? encounter`. Mirrors game/siteTypes.ts. */
  encountersByIndex?: Record<number, string | string[]>
  /** Opaque payload for whichever family renders this section's rooms (e.g. a tableau's
   * `{runNr}`) — mirrors game/siteTypes.ts's SubSection.encounterArgs. */
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
  entrance?: "stairhead" | { stairId: string }
  sideSections: SideSection[]
  mainEndReward?: TreasureReward
  rewards?: (TreasureReward | undefined)[]
  encounter?: string | string[]
  /** Per-node encounter override for the main path: 0-based room index → family/tag, resolved from
   * authored `nodes` selectors (e.g. the last room → "capstone"). Room k uses
   * `encountersByIndex[k] ?? encounter`. Mirrors game/siteTypes.ts. */
  encountersByIndex?: Record<number, string | string[]>
  corridorStraightness?: number
  packing?: number
  /** Isolates the main path's cells from leftover maze edges, so a compact layout can't merge a shortcut around a puzzle room. */
  sealed?: boolean
  /** Opaque payload for whichever family renders the main path's rooms (e.g. a tableau's
   * `{runNr}`) — mirrors game/siteTypes.ts's FloorConfig.encounterArgs. */
  encounterArgs?: unknown
}

export type SiteConfig = FloorConfig[]

export type FragmentSlot = { journeyId: string; slotIndex: number }
export type Assignment = { journeyId: string; slotIndex: number; hieroglyphId: string }

export type TombJourneyDef = { id: string; tier: Tier; levelCount: number }
