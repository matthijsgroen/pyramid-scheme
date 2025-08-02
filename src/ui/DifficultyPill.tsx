import type { FC } from "react"

interface DifficultyPillProps {
  difficulty: "easy" | "medium" | "hard"
  label: string
  disabled?: boolean
}

export const DifficultyPill: FC<DifficultyPillProps> = ({
  difficulty,
  label,
  disabled = false,
}) => {
  const difficultyColors = {
    easy: "bg-green-100 border-green-300 text-green-800",
    medium: "bg-yellow-100 border-yellow-300 text-yellow-800",
    hard: "bg-red-100 border-red-300 text-red-800",
  }

  return (
    <span
      className={`rounded-full border px-2 py-1 text-xs font-bold ${
        disabled
          ? "border-gray-400 bg-gray-200 text-gray-600"
          : difficultyColors[difficulty]
      }`}
    >
      {label.toUpperCase()}
    </span>
  )
}
