import type { ActivityId } from "../game/activities"
import type {
  DecorationKind,
  ForkDemand,
  HandleSide,
  Patron,
  SiteCondition,
  StairLink,
  WallDecorationKind,
} from "../game/siteTypes"
import type { PlacedContainer } from "../game/regions"
import type { BarrierOrder, Control, Obstacle } from "@/game/obstacles"
import type { PlacedLock } from "@/game/floorLocks"
import type { RealisationBinding } from "@/game/lockCompile"
import type { WebDoorPlacement } from "@/game/webDoors"

export type Tier = "starter" | "junior" | "expert" | "master" | "wizard"
// Authored puzzle-count progression across a journey's pyramids: `start` on pyramid 1,
// `end` on the last pyramid, linearly interpolated in between. Explicit and literal —
// no implicit spread happens unless a range is authored.
export type PathPuzzlesRange = { start: number; end: number }
export type JourneyDef = { id: string; tier: Tier; pathPuzzles: number | PathPuzzlesRange; levelCount: number }
export type Difficulty = "starter" | "junior" | "expert" | "master" | "wizard"

// One open reward type, shared: worldGen re-exports game/siteTypes rather than mirroring it
// (worldGen→game is an allowed edge). Core enumerates no reward id; see the doc comment there.
import type { TreasureReward, FragmentSlotReward, MapPieceReward, TombKeyReward, Tileset } from "@/game/siteTypes"
export type { TreasureReward, FragmentSlotReward, MapPieceReward, TombKeyReward }

export type SubSection = {
  /** The authored name for this path, if it has one — what a save files its cells under, in place of
   * the positional `s0`/`s0.1`. Mirrors game/siteTypes.ts's SubSection.label. */
  label?: string
  pathPuzzles: number
  difficulty: Difficulty
  /** The tileset this path is drawn in. Mirrors game/siteTypes.ts. */
  tileset?: Tileset
  end: "treasure" | "staircase" | StairLink
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
  /** A loot end placement left empty. Mirrors game/siteTypes.ts. */
  lootEnd?: true
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
  /** Per-node authored activity, resolved from `nodes` selectors. Mirrors game/siteTypes.ts. */
  activitiesByIndex?: Record<number, ActivityId>
  /** Per-node difficulty, resolved from `nodes` selectors: a room builds at `difficultiesByIndex[k] ?? difficulty`
   * (see roomDifficulty). Mirrors game/siteTypes.ts. */
  difficultiesByIndex?: Record<number, Difficulty>
  /** `false` keeps generated loot out of this section. Mirrors game/siteTypes.ts. */
  loot?: false
  /** Per-node loot, resolved from `nodes` selectors. Mirrors game/siteTypes.ts. */
  lootByIndex?: Record<number, false>
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
  /** The tileset this floor is drawn in. Mirrors game/siteTypes.ts. */
  tileset?: Tileset
  end: "treasure"
  exitOrStaircase: "exit" | "none" | "staircase" | StairLink
  entrance?: "stairhead" | StairLink
  sideSections: SideSection[]
  mainEndReward?: TreasureReward
  rewards?: (TreasureReward | undefined)[]
  encounter?: string | string[]
  /** Per-node encounter override for the main path: 0-based room index → family/tag, resolved from
   * authored `nodes` selectors (e.g. the last room → "capstone"). Room k uses
   * `encountersByIndex[k] ?? encounter`. Mirrors game/siteTypes.ts. */
  encountersByIndex?: Record<number, string | string[]>
  /** Per-node authored activity for the main path, resolved from `nodes` selectors. Mirrors game/siteTypes.ts. */
  activitiesByIndex?: Record<number, ActivityId>
  /** Per-node difficulty for the main path, resolved from `nodes` selectors. Mirrors game/siteTypes.ts. */
  difficultiesByIndex?: Record<number, Difficulty>
  /** `false` keeps generated loot out of this floor. Mirrors game/siteTypes.ts. */
  loot?: false
  /** Per-node loot for the main path, resolved from `nodes` selectors. Mirrors game/siteTypes.ts. */
  lootByIndex?: Record<number, false>
  corridorStraightness?: number
  packing?: number
  /** The top-level side sections, by index, that hang outside the floor's lock as branches. Written by the layout
   * search. Mirrors game/siteTypes.ts. */
  outsideLock?: number[]
  /** A lock corridor may carry two side sections. Written by the layout search. Mirrors game/siteTypes.ts. */
  corridorsTakeTwo?: true
  /** The seed this floor carves at, in place of the one its address derives. Read inside the assembler, so
   * every entry point that carves the floor (the hook, stair travel, the scanner, the bake) agrees. Baked
   * from a search that found a seed carving soundly on the first attempt. */
  seed?: number
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
  /** How many junctions this floor's carve must offer, and how many ways out each must leave free to
   * be closed — mirrors game/siteTypes.ts's FloorConfig.forks. */
  forks?: ForkDemand[]
  /** A passage from one named section to another that the player may take only in that direction —
   * mirrors game/siteTypes.ts's FloorConfig.oneWays. */
  oneWays?: { from: string; to: string }[]
  /** Mirrors game/siteTypes.ts's FloorConfig.oneWayRealisation. */
  oneWayRealisation?: string
  /** Mirrors game/siteTypes.ts's FloorConfig.regionBarrierRealisation. */
  regionBarrierRealisation?: string
  /** A lever standing in one named section, opening the entrance gates the side it hangs on names and
   * shutting the other side's — mirrors game/siteTypes.ts's FloorConfig.handles. */
  handles?: { in: string; left: string[]; right: string[]; starts?: HandleSide }[]
  /** The floor's authored REGION layout — see game/regions.ts's RegionGraph, which is this field's
   * type rather than a shape restated here. Distinct from AssemblerReason's `layoutNotFound` (the
   * carve finding no MAZE layout at a seed), an unrelated failure this field shares no meaning with. */
  regionLayout?: PlacedContainer
  /** A SWITCH standing in one of the junctions `forks` reserved, closing that junction's free ways out
   * so what the player meets there decides which one opens — mirrors game/siteTypes.ts's
   * FloorConfig.switches. */
  switches?: { encounter: string | string[]; min: number; max: number }
  /** WHAT STANDS BETWEEN THE FLOOR'S REGIONS, and what decides whether it does — mirrors
   * game/siteTypes.ts's FloorConfig.obstacles/.controls (see game/obstacles.ts). Core authoring: they stay
   * when a mod is not registered, and a floor whose controls need a realisation no mod provides is refused. */
  obstacles?: Obstacle[]
  controls?: Control[]
  /** The order of the gates on any connection carrying several — mirrors game/siteTypes.ts's
   * FloorConfig.barrierOrder. Core authoring, like the obstacles. */
  barrierOrder?: BarrierOrder[]
  /** Mirrors game/siteTypes.ts's FloorConfig.locks and .realisations. */
  locks?: PlacedLock[]
  /** Mirrors game/siteTypes.ts's FloorConfig.webDoors. */
  webDoors?: WebDoorPlacement[]
  /** Mirrors game/siteTypes.ts's FloorConfig.webMarks. */
  webMarks?: Record<string, number>
  realisations?: RealisationBinding
}

export type SiteConfig = FloorConfig[]

export type TombJourneyDef = { id: string; tier: Tier; floorCount: number; levelCount: number }
