import type { Difficulty } from "./difficultyLevels"

/**
 * Material tier of inventory items, mapped to difficulty levels:
 * stone=starter, bronze=junior, silver=expert, gold=master, divine=wizard.
 * A mod-agnostic display naming for a difficulty (used by the shop's sellables view).
 */
export type MaterialTier = "stone" | "bronze" | "silver" | "gold" | "divine"

export const materialTierByDifficulty: Record<Difficulty, MaterialTier> = {
  starter: "stone",
  junior: "bronze",
  expert: "silver",
  master: "gold",
  wizard: "divine",
}

export const difficultyByMaterialTier: Record<MaterialTier, Difficulty> = {
  stone: "starter",
  bronze: "junior",
  silver: "expert",
  gold: "master",
  divine: "wizard",
}
