import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"

/** Roles every board can serve, so a family need not answer for them. `capstone` is one of them: a
 * single-family role authored by id, so no face is owed for it either. */
export const STRUCTURAL = new Set(["puzzle", "trap", "treasure", "gate", "shop", "capstone", "tomb-puzzle"])

/** The one ambience that exists. A theme is an hour, never a place (docs/game-design/journeys.md). */
export const AMBIENCES = new Set(["night"])

export const dressing = ALL_FAMILY_META.filter(family => family.faces !== undefined)
