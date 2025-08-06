import type { Difficulty } from "./difficultyLevels"

export const hieroglyphLevelColors: Record<Difficulty, string> = {
  starter: "bg-stone-300",
  junior: "bg-amber-300",
  expert: "bg-yellow-200",
  master: "bg-orange-400",
  wizard: "bg-red-400",
}
