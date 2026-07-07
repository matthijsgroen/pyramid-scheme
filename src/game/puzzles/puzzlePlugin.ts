import type { FC } from "react"

export type PuzzleSettings = {
  difficulty?: "starter" | "junior" | "expert" | "master" | "wizard"
  theme?: string
}

export type PuzzlePlugin<TPuzzle = unknown> = {
  family: string
  generate: (seed: number, settings: PuzzleSettings) => TPuzzle
  Component: FC<{ puzzle: TPuzzle; settings: PuzzleSettings; onSolved: () => void }>
}
