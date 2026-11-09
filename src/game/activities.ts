import type { DecorationKind, Difficulty, WallDecorationKind } from "./siteTypes"

/**
 * What a single room is FOR — the level below a wing's role (docs/game-design/themed-rooms.md, "An
 * activity is a small fixed set").
 *
 * A kind is a silhouette and the rank is its skin, so a rank shows an activity as soon as its pool holds one
 * of the activity's props. `PROP_ROLES` is derived from this table (`dressingTags.ts`), so the roles a prop
 * serves and the activities it furnishes cannot drift apart.
 */
export type ActivityId =
  | "weighing"
  | "packing"
  | "storage"
  | "selling"
  | "ledger"
  | "banquet"
  | "dressingRoom"
  | "householdShrine"
  | "gardenCourt"
  | "bedroom"
  | "bakeryBrewery"

export type Activity = {
  id: ActivityId
  props: readonly DecorationKind[]
  wall: readonly WallDecorationKind[]
  roles: readonly string[]
  /**
   * The rank whose house this is; none for the shared ones. A pool holding a kind of a rank's house
   * (`HOUSE_KINDS`) is furnished by that rank's activities only, any other by the shared ones: a house reuses
   * silhouettes other ranks' pools also hold (a jar rack, a shelf, a shrine), so those alone cannot tell the
   * merchant's storeroom from the nobleman's banquet.
   */
  rank?: Difficulty
}

// `hanging` is a prop, never a wall item: the selling room's awning and the banquet's frieze. A room whose
// entry names no wall item hangs nothing.
//
// The nobleman's rooms take their roles from the places his wings are authored as: the lamplit rooms
// (banquet, the dressing room by its mirror, the shrine's lamp) serve `light`, the open court `water` and
// `sky`, the bedroom on the roof `sky`, the brewery `water`.
export const ACTIVITIES: readonly Activity[] = [
  { id: "weighing", props: ["scale", "weightsTable"], wall: ["tallyBoard"], roles: ["trade", "shop"] },
  { id: "packing", props: ["basketStack", "bales"], wall: [], roles: ["trade", "logistics"] },
  {
    id: "storage",
    props: ["jarRack", "shelf", "basin"],
    wall: ["niche"],
    roles: ["trade", "logistics", "agriculture"],
  },
  { id: "selling", props: ["counter", "mat", "offeringTable", "hanging"], wall: [], roles: ["trade", "shop"] },
  { id: "ledger", props: ["scribeDesk", "shelf"], wall: ["tallyBoard", "niche"], roles: ["trade", "scribe"] },
  {
    id: "banquet",
    props: ["banquetTable", "harp", "jarRack", "hanging"],
    wall: [],
    roles: ["light"],
    rank: "junior",
  },
  {
    id: "dressingRoom",
    props: ["dressingTable", "wigStand", "shelf"],
    wall: ["sconce"],
    roles: ["light"],
    rank: "junior",
  },
  {
    id: "householdShrine",
    props: ["shrine", "offeringTable", "lamp"],
    wall: ["stela"],
    roles: ["light"],
    rank: "junior",
  },
  {
    id: "gardenCourt",
    props: ["basin", "pottedTree", "pillar", "mat"],
    wall: [],
    roles: ["water", "sky"],
    rank: "junior",
  },
  // No linen chest beside the bed: a chest on the map means treasure you can open.
  { id: "bedroom", props: ["bed", "headrest"], wall: [], roles: ["sky"], rank: "junior" },
  { id: "bakeryBrewery", props: ["grindstone", "breadOven", "jarRack"], wall: [], roles: ["water"], rank: "junior" },
]

/**
 * Kinds that fit anywhere. An activity may list one (a selling room has a mat), but it gets no roles
 * from that, so it survives every role narrowing and keeps a pool from collapsing.
 */
export const FILLER: ReadonlySet<DecorationKind> = new Set<DecorationKind>(["rubblePile", "pillar", "mat"])

/** The wall items that hang anywhere: a sconce is a bracket any wall carries, whichever room lists it. */
export const WALL_FILLER: ReadonlySet<WallDecorationKind> = new Set<WallDecorationKind>(["sconce"])

/**
 * The kinds a rank's house brings, which no other rank's pool holds (themed-rooms.md's bold kinds). A pool holding
 * one is that rank's, whatever difficulty the section it dresses is played at: a junior side path in a merchant's
 * pyramid carries the merchant's pool and stays his.
 */
export const HOUSE_KINDS: Partial<Record<Difficulty, readonly DecorationKind[]>> = {
  junior: [
    "banquetTable",
    "harp",
    "dressingTable",
    "wigStand",
    "pottedTree",
    "bed",
    "headrest",
    "grindstone",
    "breadOven",
  ],
}

/** The ranks whose house `pool` holds a kind of. */
export const housesOf = (pool: readonly DecorationKind[]): Difficulty[] =>
  (Object.entries(HOUSE_KINDS) as [Difficulty, readonly DecorationKind[]][])
    .filter(([, kinds]) => kinds.some(kind => pool.includes(kind)))
    .map(([rank]) => rank)

/**
 * Activities with at least one prop in `pool`, in table order: the activities of the houses the pool holds, or the
 * shared ones where it holds none.
 */
export const activitiesFor = (pool: readonly DecorationKind[]): Activity[] => {
  const houses = housesOf(pool)
  return ACTIVITIES.filter(activity =>
    houses.length > 0 ? activity.rank !== undefined && houses.includes(activity.rank) : activity.rank === undefined
  ).filter(activity => activity.props.some(prop => pool.includes(prop)))
}
