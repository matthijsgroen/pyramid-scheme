import type { PlateLook } from "@/game/stonePlay"

/** The painting each look of a plate wears, in the cell's mechanism style (`MECHANISM_STYLE`, shared `tiles/default/`
 * unless a style paints its own): three looks drawn in one frame so they swap on a cell. */
export const PLATE_TILE: Record<PlateLook, string> = { raised: "plate", pressed: "plateDown", stone: "plateStone" }
