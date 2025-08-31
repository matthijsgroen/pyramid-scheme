import type { Difficulty } from "./difficultyLevels"

export const hieroglyphLevelColors: Record<Difficulty, string> = {
  starter: "bg-stone-300 border-stone-400",
  junior: "bg-orange-300 border-orange-400",
  expert: "bg-slate-400 border-slate-500",
  master: "bg-yellow-200 border-yellow-400",
  wizard: "bg-emerald-400 border-emerald-500",
}
