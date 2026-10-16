import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { METALS } from "@/ui/tokens/metalPalette"

type DifficultyPillProps = {
  difficulty: Difficulty
  label: string
  disabled?: boolean
}

export const DifficultyPill: FC<DifficultyPillProps> = ({ difficulty, label, disabled = false }) => (
  <span
    className={`rounded-full border px-2 py-1 text-xs font-bold ${
      disabled ? "border-gray-400 bg-gray-200 text-gray-600" : ""
    }`}
    style={
      disabled
        ? undefined
        : {
            backgroundColor: METALS[difficulty].light,
            borderColor: METALS[difficulty].material,
            color: METALS[difficulty].shade,
          }
    }
  >
    {label.toUpperCase()}
  </span>
)
