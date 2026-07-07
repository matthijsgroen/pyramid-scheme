import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"

export type TrapPlugin<TQuestion = unknown> = {
  family: string
  generate: (seed: number, difficulty: Difficulty) => TQuestion
  Component: FC<{
    question: TQuestion
    timeLimit: number // seconds, pre-computed with insight upgrades applied
    onPass: () => void
    onFail: () => void
  }>
}
