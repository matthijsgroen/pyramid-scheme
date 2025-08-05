import type { Difficulty } from "./difficultyLevels"

export const hieroglyphLevelColors: Record<Difficulty, string> = {
  starter: "bg-stone-100",
  junior: "bg-amber-100",
  expert: "bg-yellow-100",
  master: "bg-orange-100",
  wizard: "bg-red-100",
}
