import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { difficultyRank } from "@/ui/tokens/difficultyColors"

type DifficultyPillProps = {
  difficulty: Difficulty
  label: string
  disabled?: boolean
}

export const DifficultyPill: FC<DifficultyPillProps> = ({ difficulty, label, disabled = false }) => (
  <span
    className={`rounded-full border px-2 py-1 text-xs font-bold ${
      disabled ? "border-gray-400 bg-gray-200 text-gray-600" : difficultyRank[difficulty]
    }`}
  >
    {label.toUpperCase()}
  </span>
)
