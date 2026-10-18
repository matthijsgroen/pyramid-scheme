import type { DecorationKind, WallDecorationKind } from "./siteTypes"

/**
 * What a single room is FOR — the level below a wing's role (docs/game-design/themed-rooms.md, "An
 * activity is a small fixed set").
 *
 * Shared by every rank: a kind is a silhouette and the rank is its skin, so a rank shows an activity as
 * soon as its pool holds one of the activity's props. `PROP_ROLES` is derived from this table
 * (`dressingTags.ts`), so the roles a prop serves and the activities it furnishes cannot drift apart.
 */
export type ActivityId = "weighing" | "packing" | "storage" | "selling" | "ledger"

export type Activity = {
  id: ActivityId
  props: readonly DecorationKind[]
  wall: readonly WallDecorationKind[]
  roles: readonly string[]
}

// `hanging` is the selling room's awning; packing and selling hang nothing on the wall.
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
]

/**
 * Kinds that fit anywhere. An activity may list one (a selling room has a mat), but it gets no roles
 * from that, so it survives every role narrowing and keeps a pool from collapsing.
 */
export const FILLER: ReadonlySet<DecorationKind> = new Set<DecorationKind>(["rubblePile", "pillar", "mat"])

/** Activities with at least one prop in `pool`, in table order. */
export const activitiesFor = (pool: readonly DecorationKind[]): Activity[] =>
  ACTIVITIES.filter(activity => activity.props.some(prop => pool.includes(prop)))
