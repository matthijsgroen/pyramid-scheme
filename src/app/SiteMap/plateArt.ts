import type { PlateLook } from "@/game/stonePlay"

/** The painting each look of a plate wears, from `tiles/default/`: one plate for every rank, three looks drawn in
 * one frame so they swap on a cell. */
export const PLATE_TILE: Record<PlateLook, string> = { raised: "plate", pressed: "plateDown", stone: "plateStone" }
