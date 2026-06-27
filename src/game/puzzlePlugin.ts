import type { FC } from "react"

export type PuzzleSettings = {
  difficulty?: "easy" | "medium" | "hard"
  theme?: string
}

export type PuzzlePlugin<TPuzzle = unknown> = {
  family: string
  generate: (seed: number, settings: PuzzleSettings) => TPuzzle
  Component: FC<{ puzzle: TPuzzle; settings: PuzzleSettings; onSolved: () => void }>
}
