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
 */
export const PROP_ROLES: Partial<Record<DecorationKind, readonly string[]>> = {
  shelf: ["trade", "shop", "scribe", "logistics"],
  jarRack: ["trade", "shop", "water", "agriculture", "logistics"],
  offeringTable: ["trade", "funerary", "judgement"],
  basin: ["water", "agriculture"],
  statue: ["funerary", "judgement", "cosmos"],
  sarcophagus: ["funerary"],
  shrine: ["funerary", "cosmos"],
  hanging: ["funerary", "cosmos"],
  lamp: ["light", "scribe"],
  brazier: ["light", "funerary"],
  crystal: ["cosmos", "sky", "light"],
}

export const WALL_ITEM_ROLES: Partial<Record<WallDecorationKind, readonly string[]>> = {
  niche: ["trade", "shop", "logistics"],
  tallyBoard: ["trade", "shop", "scribe"],
  stela: ["funerary"],
  veil: ["funerary", "cosmos"],
  wallShrine: ["funerary", "cosmos"],
  starShaft: ["cosmos", "sky"],
  mask: ["funerary", "judgement"],
  // `sconce` carries no tag on purpose: a bracket for a lamp belongs on any wall, and it is what keeps
  // a rank whose other wall items are all funerary from hanging nothing at all in a trade wing.
}

/** The purposes a kind serves, or `undefined` for one that fits anywhere. */
export const rolesOfProp = (kind: DecorationKind): readonly string[] | undefined => PROP_ROLES[kind]
export const rolesOfWallItem = (kind: WallDecorationKind): readonly string[] | undefined => WALL_ITEM_ROLES[kind]
