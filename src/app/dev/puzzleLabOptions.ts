import { difficulties, difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import type { FamilyMeta } from "@/game/families/familyMeta"

export const DEFAULT_THEME = "default"

// Which tiers a family may legitimately be authored at: its catalogue debut (minTier) and up.
// Same rule the gen-time allocator applies (src/mods/allFamilyMeta.ts), so the lab can only
// produce configurations the world can actually hand a player.
export const allowedDifficulties = (meta: FamilyMeta): Difficulty[] =>
  difficulties.filter(d => difficultyCompare(d, meta.minTier ?? "starter") >= 0)

export const themesFor = (meta: FamilyMeta): string[] => meta.themes ?? [DEFAULT_THEME]

/**
 * Which families the bench can play: the plain puzzle rooms, and the two boards a tomb serves — a capstone
 * crocodile and a tableau.
 *
 * The tomb pair are on the list because a family the bench cannot reach is a family nobody reviews: they were
 * playable only by walking a real tomb to the floor that serves them, which is why they are the two that have
 * had the least of it. Both generate without a tomb around them — a tableau falls back to a tier-pool draw
 * when no floor is resolvable, which is the path the bench takes.
 *
 * **A tableau still needs its hieroglyphs**, and the bench does not grant them: filling a slot asks the save
 * for a completed hieroglyph, so a tableau plays here only as far as the fragments already collected allow.
 * That is enough to look at the board and not enough to solve one cold.
 */
const BENCH_TAGS = ["puzzle", "tomb-puzzle", "capstone"]

export const playableInLab = (meta: FamilyMeta): boolean => meta.tags.some(tag => BENCH_TAGS.includes(tag))

/** Stands for "whatever the site would have said" — the lab's way of picking no role at all. */
export const NO_ROLE = "(no role)"

/**
 * The roles a family can be allocated for, which for a family with more than one identity is also the list
 * of faces it can wear (docs/instructions/puzzle-screens.md §2).
 *
 * Its own picker because a role and a theme answer different questions, and a lab that could only set the
 * theme could not show the combination that matters: a place at a time of day — a causeway at night.
 * `puzzle` is dropped: every family carries it, so it says nothing about which face this is.
 */
export const rolesFor = (meta: FamilyMeta): string[] => [NO_ROLE, ...meta.tags.filter(tag => tag !== "puzzle")]
