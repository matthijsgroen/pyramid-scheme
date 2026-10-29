// A ROOM PREFAB read from text (prefabNotation.ts): a designed room whose places the carve fills per room.
import type { Difficulty } from "@/data/difficultyLevels"
import type { ActivityId } from "./activities"
import type { DecorationKind, WallDecorationKind } from "./siteTypes"

/** wall: stands against the north wall; floor: free-standing; ground: drawn under the player and walked over;
 * wallItem: hangs on a ring wall. */
export type PlaceLayer = "wall" | "floor" | "ground" | "wallItem"
export type SpecialPlace = "stop" | "actor" | "chest" | "portal" | "mechanism"
export type PlaceKind = DecorationKind | WallDecorationKind | "patron"
export type PlaceDef = {
  letter: string
  layer: PlaceLayer
  optional: boolean
  /** Named lists already expanded. */
  kinds: readonly PlaceKind[]
  /** Footprint, from the drawing. */
  cols: number
  rows: number
  /** "3 of 4": take of; "1 of 3 per q": one per place of letter q. */
  group?: { take: number; of: number; per?: string }
}
export type PrefabLayout = {
  /** "" for the first, "turned" and so on for a drawn variant. */
  name: string
  /** The drawn rows, spaces removed, wall ring included. */
  cells: readonly string[]
}
export type Prefab = {
  name: string
  tier: Difficulty
  activity?: ActivityId
  mirror: boolean
  designedBy?: string
  /** The file's comments other than its designed-by line, in the order written; printPrefab writes them at the top. */
  notes?: readonly string[]
  /** The named lists the file declares, so printPrefab writes a place's kinds by list name again. */
  lists?: Readonly<Record<string, readonly string[]>>
  layouts: readonly PrefabLayout[]
  places: Readonly<Record<string, PlaceDef>>
  /** Letter to special. */
  specials: Readonly<Record<string, SpecialPlace>>
}
