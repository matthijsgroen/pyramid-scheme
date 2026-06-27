/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { type FC } from "react"
import { registerPuzzle } from "@/game/puzzleRegistry"
import { generateSumplete, type SumpleteGrid } from "@/game/generateSumplete"
import { SumpleteBoard } from "./SumpleteBoard"
import type { PuzzleSettings } from "@/game/puzzlePlugin"

const SumpleteComponent: FC<{ puzzle: SumpleteGrid; settings: PuzzleSettings; onSolved: () => void }> = ({
  puzzle,
  onSolved,
}) => (
  <SumpleteBoard grid={puzzle.grid} rowTargets={puzzle.rowTargets} colTargets={puzzle.colTargets} onSolved={onSolved} />
)

registerPuzzle({
  family: "sumplete",
  generate: (seed, settings): SumpleteGrid =>
    generateSumplete(settings.difficulty === "hard" ? 4 : 3, seed, { allowZeroTargets: false }),
  Component: SumpleteComponent as FC<{ puzzle: unknown; settings: PuzzleSettings; onSolved: () => void }>,
})
