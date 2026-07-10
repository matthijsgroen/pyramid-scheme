// Fez-shop price list — SHOP_PLAN.md "Prices (locked)". Single source of truth for both
// world-gen placement (worldGen/spec/*.ts shop sidepaths, worldGen/validate.ts's economy
// guard) and the shop UI (Phase 4).

import { difficulties, type Difficulty } from "./difficultyLevels"

export const NUM_SHOPS = 8

export const fragmentPrice = (difficulty: Difficulty): number => 250 + 50 * difficulties.indexOf(difficulty)

export const MOSAIC_PRICE = 500
export const MAP_PIECE_PRICE = 1000

export const CONSUMABLE_PRICES = { bandage: 20, oil: 50, trapTool: 40 } as const
export const CONSUMABLE_STOCK_PER_VISIT = 2

export const CONSUMABLE_STOCK_VALUE =
  (CONSUMABLE_PRICES.bandage + CONSUMABLE_PRICES.oil + CONSUMABLE_PRICES.trapTool) * CONSUMABLE_STOCK_PER_VISIT

// Total coins a player could spend on consumables across every shop in one visit each —
// counts toward the economy guard's total, since SHOP_PLAN.md's guard covers everything
// buyable, not just the mandatory rares.
export const TOTAL_CONSUMABLE_BUYABLE = NUM_SHOPS * CONSUMABLE_STOCK_VALUE
