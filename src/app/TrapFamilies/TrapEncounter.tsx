import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { getTrapPlugin } from "@/game/trapRegistry"
import { TRAP_TIME_LIMITS_SECONDS, TRAP_TIME_EXTENSION_PER_INSIGHT_STACK } from "@/game/trapConfig"
// Side-effect: registers trap plugins
import "./ArithmeticReflex/plugin"

type Props = {
  family: string
  seed: number
  difficulty: Difficulty
  trapInsightStacks: number
  onPass: () => void
  onFail: () => void
}

export const TrapEncounter: FC<Props> = ({ family, seed, difficulty, trapInsightStacks, onPass, onFail }) => {
  const plugin = getTrapPlugin(family)
  if (!plugin) return <div className="p-4 text-red-400">Unknown trap family: {family}</div>

  const timeLimit = TRAP_TIME_LIMITS_SECONDS[difficulty] + trapInsightStacks * TRAP_TIME_EXTENSION_PER_INSIGHT_STACK
  const question = plugin.generate(seed, difficulty)

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/90">
      <plugin.Component question={question} timeLimit={timeLimit} onPass={onPass} onFail={onFail} />
    </div>
  )
}
