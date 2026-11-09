import { difficulties } from "@/data/difficultyLevels"
import type { DecorationKind, Difficulty, WallDecorationKind } from "./siteTypes"

/**
 * What a single room is FOR — the level below a wing's role (docs/game-design/themed-rooms.md, "An
 * activity is a small fixed set").
 *
 * Every tier has a theme of its own — the merchant's house, the nobleman's — and each activity belongs to one
 * theme. A kind is a silhouette and the rank is its skin, so two themes may share a kind (the nobleman's wine jars
 * are the merchant's amphorae with a junior look). A room shows an activity of its pyramid's theme as soon as its
 * pool holds one of the activity's props. `PROP_ROLES` is derived from this table (`dressingTags.ts`), so the roles
 * a prop serves and the activities it furnishes cannot drift apart.
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
  /** The tier whose theme this activity belongs to. */
  theme: Difficulty
}

// `hanging` is a prop, never a wall item: the selling room's awning and the banquet's frieze. A room whose
// entry names no wall item hangs nothing.
//
// The nobleman's rooms take their roles from the places his wings are authored as: the lamplit rooms
// (banquet, the dressing room by its mirror, the shrine's lamp) serve `light`, the open court `water` and
// `sky`, the bedroom on the roof `sky`, the brewery `water`.
export const ACTIVITIES: readonly Activity[] = [
  {
    id: "weighing",
    props: ["scale", "weightsTable"],
    wall: ["tallyBoard"],
    roles: ["trade", "shop"],
    theme: "starter",
  },
  { id: "packing", props: ["basketStack", "bales"], wall: [], roles: ["trade", "logistics"], theme: "starter" },
  {
    id: "storage",
    props: ["jarRack", "shelf", "basin"],
    wall: ["niche"],
    roles: ["trade", "logistics", "agriculture"],
    theme: "starter",
  },
  {
    id: "selling",
    props: ["counter", "mat", "offeringTable", "hanging"],
    wall: [],
    roles: ["trade", "shop"],
    theme: "starter",
  },
  {
    id: "ledger",
    props: ["scribeDesk", "shelf"],
    wall: ["tallyBoard", "niche"],
    roles: ["trade", "scribe"],
    theme: "starter",
  },
  { id: "banquet", props: ["banquetTable", "harp", "jarRack", "hanging"], wall: [], roles: ["light"], theme: "junior" },
  {
    id: "dressingRoom",
    props: ["dressingTable", "wigStand", "shelf"],
    wall: ["sconce"],
    roles: ["light"],
    theme: "junior",
  },
  {
    id: "householdShrine",
    props: ["shrine", "offeringTable", "lamp"],
    wall: ["stela"],
    roles: ["light"],
    theme: "junior",
  },
  {
    id: "gardenCourt",
    props: ["basin", "pottedTree", "pillar", "mat"],
    wall: [],
    roles: ["water", "sky"],
    theme: "junior",
  },
  // No linen chest beside the bed: a chest on the map means treasure you can open.
  { id: "bedroom", props: ["bed", "headrest"], wall: [], roles: ["sky"], theme: "junior" },
  { id: "bakeryBrewery", props: ["grindstone", "breadOven", "jarRack"], wall: [], roles: ["water"], theme: "junior" },
]

/**
 * Kinds that fit anywhere. An activity may list one (a selling room has a mat), but it gets no roles
 * from that, so it survives every role narrowing and keeps a pool from collapsing.
 */
export const FILLER: ReadonlySet<DecorationKind> = new Set<DecorationKind>(["rubblePile", "pillar", "mat"])

/** The wall items that hang anywhere: a sconce is a bracket any wall carries, whichever room lists it. */
export const WALL_FILLER: ReadonlySet<WallDecorationKind> = new Set<WallDecorationKind>(["sconce"])

const THEMED: readonly Difficulty[] = difficulties.filter(tier => ACTIVITIES.some(a => a.theme === tier))

/**
 * The theme a pyramid of `tier` is dressed in: its tier's own, or, for a tier with no activities of its own yet
 * (or a site of no tier), the first themed tier's. A section played at another difficulty carries its pyramid's
 * pool, so it wears its pyramid's theme too.
 */
export const themeOf = (tier: Difficulty | undefined): Difficulty =>
  tier !== undefined && THEMED.includes(tier) ? tier : THEMED[0]

/** The activities of `theme` with at least one prop in `pool`, in table order. */
export const activitiesFor = (pool: readonly DecorationKind[], theme: Difficulty): Activity[] =>
  ACTIVITIES.filter(activity => activity.theme === theme && activity.props.some(prop => pool.includes(prop)))
