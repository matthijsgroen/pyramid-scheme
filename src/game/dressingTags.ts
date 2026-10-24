import { ACTIVITIES, FILLER, activitiesFor } from "./activities"
import type { DecorationKind, WallDecorationKind } from "./siteTypes"

/**
 * What each piece of furniture is FOR — the purposes it belongs to.
 *
 * A role is the place a stretch of floor is (journeys.md §2), and a piece of furniture belongs to the
 * places it would actually be found in. That makes this table two things at once: world-gen narrows a
 * wing's pools with it (`worldGen/dressingRoles.ts`), and the assembler reads it to give a single ROOM
 * one purpose, so that what stands in it and what hangs on its wall agree with each other.
 *
 * It lives in `game/` rather than in `worldGen/` because both need it and core may not import world-gen.
 *
 * **An untagged kind fits anywhere.** Rubble, a pillar, a chest, a mat, a pit and a sconce belong to no
 * place in particular, so they survive every narrowing and are what keeps a pool from collapsing.
 *
 * The roles come from the activity table (`activities.ts`) plus `ROLE_ONLY`: the roles of kinds no
 * activity owns yet, and the roles a kind serves beyond its activities.
 */
export const ROLE_ONLY: Partial<Record<DecorationKind, readonly string[]>> = {
  shelf: ["shop"],
  jarRack: ["shop", "water"],
  offeringTable: ["funerary", "judgement"],
  basin: ["water"],
  statue: ["funerary", "judgement", "cosmos"],
  sarcophagus: ["funerary"],
  shrine: ["funerary", "cosmos"],
  hanging: ["funerary", "cosmos"],
  lamp: ["light", "scribe"],
  brazier: ["light", "funerary"],
  crystal: ["cosmos", "sky", "light"],
}

const WALL_ROLE_ONLY: Partial<Record<WallDecorationKind, readonly string[]>> = {
  niche: ["shop"],
  stela: ["funerary"],
  veil: ["funerary", "cosmos"],
  wallShrine: ["funerary", "cosmos"],
  starShaft: ["cosmos", "sky"],
  mask: ["funerary", "judgement"],
  // `sconce` carries no tag on purpose: a bracket for a lamp belongs on any wall, and it is what keeps
  // a rank whose other wall items are all funerary from hanging nothing at all in a trade wing.
}

const unionRoles = <K extends string>(
  fromActivities: readonly (readonly [K, readonly string[]])[],
  only: Partial<Record<K, readonly string[]>>
): Partial<Record<K, readonly string[]>> => {
  const roles: Partial<Record<K, string[]>> = {}
  const add = (kind: K, more: readonly string[]) => {
    const list = (roles[kind] ??= [])
    for (const role of more) if (!list.includes(role)) list.push(role)
  }
  for (const [kind, more] of fromActivities) add(kind, more)
  for (const [kind, more] of Object.entries(only) as [K, readonly string[]][]) add(kind, more)
  return roles
}

export const PROP_ROLES: Partial<Record<DecorationKind, readonly string[]>> = unionRoles(
  ACTIVITIES.flatMap(a => a.props.filter(kind => !FILLER.has(kind)).map(kind => [kind, a.roles] as const)),
  ROLE_ONLY
)

export const WALL_ITEM_ROLES: Partial<Record<WallDecorationKind, readonly string[]>> = unionRoles(
  ACTIVITIES.flatMap(a => a.wall.map(kind => [kind, a.roles] as const)),
  WALL_ROLE_ONLY
)

/** The purposes a kind serves, or `undefined` for one that fits anywhere. */
export const rolesOfProp = (kind: DecorationKind): readonly string[] | undefined => PROP_ROLES[kind]
export const rolesOfWallItem = (kind: WallDecorationKind): readonly string[] | undefined => WALL_ITEM_ROLES[kind]

const PROP_PLACES: ReadonlySet<string> = new Set(Object.values(PROP_ROLES).flatMap(roles => roles ?? []))

/**
 * The activities a room may serve: those its pool furnishes, and of those only the ones its wing's role is
 * a place for — a funerary wing holding an offering table is not a market. A role no kind furnishes
 * (`puzzle`, the default for a room no author placed, or one a mod invents) names no place, so it narrows
 * nothing, as it narrows nothing in world-gen's pools.
 */
export const activitiesServing = (pool: readonly DecorationKind[], role: string | readonly string[] | undefined) => {
  const furnished = activitiesFor(pool)
  const places = (role === undefined ? [] : typeof role === "string" ? [role] : role).filter(r => PROP_PLACES.has(r))
  return places.length === 0 ? furnished : furnished.filter(activity => activity.roles.some(r => places.includes(r)))
}
