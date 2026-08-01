import { allItems } from "@/data/inventory"

// id → glyph, for anywhere this mod needs to SHOW a hieroglyph it only holds the id of (the
// Collection hunt bar, the compass target label seam). Shared so the two don't drift.
export const HIEROGLYPH_SYMBOLS: Record<string, string> = Object.fromEntries(allItems.map(i => [i.id, i.symbol]))
