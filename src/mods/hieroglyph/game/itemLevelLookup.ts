import { TOMB_SYMBOLS } from "@/mods/hieroglyph/game/tableaus"
import { TIER_BY_HIEROGLYPH } from "@/mods/hieroglyph/game/hieroglyphCurrency"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"

/**
 * Get the first (lowest) level where a tableau symbol appears.
 * @param itemId - The inventory item ID (a tableau/hieroglyph symbol)
 * @returns The lowest difficulty where the symbol appears, or undefined if not found. Tomb-treasure
 * ids aren't resolved here — that content is mod-owned; a treasure carries its own difficulty on the
 * Collection item it emits.
 *
 * A sign granted whole appears in no tableau, so it has no first level to find — it falls back to
 * the tier its one chest was authored at, which is the same thing the Collection wants to say:
 * where you get it.
 */
export const getItemFirstLevel = (itemId: string): Difficulty =>
  difficulties.find(key => TOMB_SYMBOLS[key].some(item => item === itemId)) ?? TIER_BY_HIEROGLYPH[itemId]
