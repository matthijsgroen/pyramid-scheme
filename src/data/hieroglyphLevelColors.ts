import type { Difficulty } from "./difficultyLevels"

export const hieroglyphLevelColors: Record<Difficulty, string> = {
  starter: "bg-stone-300 border-stone-400",
  junior: "bg-amber-300 border-amber-400",
  expert: "bg-yellow-200 border-yellow-300",
  master: "bg-orange-400 border-orange-500",
  wizard: "bg-red-400 border-red-500",
}
