import type { FC } from "react"

type DifficultyPillProps = {
  difficulty: "starter" | "junior" | "expert" | "master" | "wizard"
  label: string
  disabled?: boolean
}

export const DifficultyPill: FC<DifficultyPillProps> = ({ difficulty, label, disabled = false }) => {
  const difficultyColors = {
    starter: "bg-green-100 border-green-300 text-green-800",
    junior: "bg-blue-100 border-blue-300 text-blue-800",
    expert: "bg-yellow-100 border-yellow-300 text-yellow-800",
    master: "bg-orange-100 border-orange-300 text-orange-800",
    wizard: "bg-purple-100 border-purple-300 text-purple-800",
  }

  return (
    <span
      className={`rounded-full border px-2 py-1 text-xs font-bold ${
        disabled ? "border-gray-400 bg-gray-200 text-gray-600" : difficultyColors[difficulty]
      }`}
    >
      {label.toUpperCase()}
    </span>
  )
}
