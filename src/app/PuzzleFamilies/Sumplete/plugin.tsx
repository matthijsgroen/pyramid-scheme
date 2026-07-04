/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { type FC } from "react"
import { registerPuzzle } from "@/game/puzzleRegistry"
import { generateSumplete, type SumpleteGrid } from "@/game/generateSumplete"
import { SumpletePuzzle } from "./SumpletePuzzle"
import type { PuzzleSettings } from "@/game/puzzlePlugin"

const SumpleteComponent: FC<{ puzzle: SumpleteGrid; settings: PuzzleSettings; onSolved: () => void }> = ({
  puzzle,
  onSolved,
}) => (
  <SumpletePuzzle
    grid={puzzle.grid}
    rowTargets={puzzle.rowTargets}
    colTargets={puzzle.colTargets}
    onSolved={onSolved}
  />
)

registerPuzzle({
  family: "sumplete",
  generate: (seed, settings): SumpleteGrid =>
    generateSumplete(["expert", "master", "wizard"].includes(settings.difficulty ?? "starter") ? 4 : 3, seed, {
      allowZeroTargets: settings.difficulty === "wizard",
    }),
  Component: SumpleteComponent as FC<{ puzzle: unknown; settings: PuzzleSettings; onSolved: () => void }>,
})
