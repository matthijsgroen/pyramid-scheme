import { difficulties, difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import type { FamilyMeta } from "@/game/families/familyMeta"

export const DEFAULT_THEME = "default"

// Which tiers a family may legitimately be authored at: its catalogue debut (minTier) and up.
// Same rule the gen-time allocator applies (src/mods/allFamilyMeta.ts), so the lab can only
// produce configurations the world can actually hand a player.
export const allowedDifficulties = (meta: FamilyMeta): Difficulty[] =>
  difficulties.filter(d => difficultyCompare(d, meta.minTier ?? "starter") >= 0)

export const themesFor = (meta: FamilyMeta): string[] => meta.themes ?? [DEFAULT_THEME]
