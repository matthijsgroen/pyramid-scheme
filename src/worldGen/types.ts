import type { DecorationKind, Patron, SiteCondition, WallDecorationKind } from "../game/siteTypes"

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
  /** The authored name for this path, if it has one — what a save files its cells under, in place of
   * the positional `s0`/`s0.1`. Mirrors game/siteTypes.ts's SubSection.label. */
  label?: string
  pathPuzzles: number
  difficulty: Difficulty
  end: "treasure" | "staircase" | { stairId: string }
  gate?:
    | {
        type: "floor-key"
        color?: string
        /** The key this gate wants, named by the author. Naming one means the AUTHOR owns where the key
         * comes from — a family that mints it, not a chest — so the floor grows no host section for it.
         * Opaque to core: it is a string, and nothing here knows what minted it. */
        keyId?: string
        /** Which mod mints that key. A gate naming one drops when that mod is not registered, so the
         * branch it guarded is simply open. Core compares it against the registered ids and names no mod. */
        ownerMod?: string
      }
    | { type: "tomb-key"; wardKeyId: string }
  endReward?: TreasureReward
  rewards?: (TreasureReward | undefined)[]
  hidden?: boolean
  /** Isolates this section's cells from leftover maze edges, so a compact layout can't merge a shortcut around it. */
  sealed?: boolean
  /** Family/tag(s) for this section's own intermediate rooms — defaults to the "puzzle" tag
   * (sumplete) when unset. Never "crocodile" — that's a main-path-finale-only family. An
   * array means "any of these": the union of those tags' pools. Narrowing is a narrower tag's job. */
  encounter?: string | string[]
  /** Per-node encounter override: 0-based room index → family/tag, resolved from authored `nodes`
   * selectors. A room uses `encountersByIndex[k] ?? encounter`. Mirrors game/siteTypes.ts. */
  encountersByIndex?: Record<number, string | string[]>
  /** Opaque payload for whichever family renders this section's rooms (e.g. a tableau's
   * `{runNr}`) — mirrors game/siteTypes.ts's SubSection.encounterArgs. */
  encounterArgs?: unknown
  /** Skin name for this section's puzzle rooms, inherited from the site where the section is silent.
   * Mirrors game/siteTypes.ts's SubSection.theme. */
  theme?: string
  /** The role this section's rooms were allocated FOR, kept after `encounter` is baked to a family id.
   * Mirrors game/siteTypes.ts's SubSection.role. */
  role?: string | string[]
  /** Pool this section's fork/endpoint rooms draw props from — mirrors game/siteTypes.ts's
   * SubSection.decorations. */
  decorations?: DecorationKind[]
  /** Pool this section's rooms draw wall items from — mirrors game/siteTypes.ts's
   * SubSection.wallDecorations. */
  wallDecorations?: WallDecorationKind[]
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
  /** Skin name for this floor's puzzle rooms — mirrors game/siteTypes.ts's FloorConfig.theme. */
  theme?: string
  /** Pool this floor's main-path fork/endpoint rooms draw props from — mirrors
   * game/siteTypes.ts's FloorConfig.decorations. */
  decorations?: DecorationKind[]
  /** Pool this floor's main-path rooms draw wall items from — mirrors game/siteTypes.ts's
   * FloorConfig.wallDecorations. */
  wallDecorations?: WallDecorationKind[]
  /** The role this floor's main-path rooms were allocated FOR — mirrors game/siteTypes.ts's FloorConfig.role. */
  role?: string | string[]
  /** What has got into this site — mirrors game/siteTypes.ts's FloorConfig.condition. Authored on the
   * PYRAMID and copied onto every floor, so it survives the climb through the ranks. */
  /** Whose tomb this is — mirrors game/siteTypes.ts's FloorConfig.patron. Authored on the PYRAMID
   * and copied onto every floor, exactly as `condition` is. */
  patron?: Patron
  condition?: SiteCondition
}

export type SiteConfig = FloorConfig[]

export type TombJourneyDef = { id: string; tier: Tier; levelCount: number }
