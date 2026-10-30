import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { usePuzzleState } from "@/mods/core/app/puzzleState"
import type { Difficulty } from "@/data/difficultyLevels"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import {
  canUndoPair,
  createPairState,
  cyclePairCell,
  pairSolved,
  sweepPairCells,
  undoPair,
} from "@/mods/puzzle/game/pairPuzzle/pairPuzzle"
import type { PairPuzzleWithAnswer } from "@/mods/puzzle/game/pairPuzzle/generatePairPuzzle"
import { buildPairHint } from "./pairPuzzleHint"
import { pairSkinFor } from "./skins"
import { PairPuzzleBoard } from "./PairPuzzleBoard"
import { PairPuzzleRules } from "./PairPuzzleRules"

type Props = {
  puzzle: PairPuzzleWithAnswer
  difficulty?: Difficulty
  /** The pool this room was drawn from (docs/instructions/puzzle-screens.md). */
  role?: string | string[]
  theme?: string
  room?: string
  onSolved: () => void
  onCancel: () => void
}

export const PairPuzzle: FC<Props> = ({ puzzle, difficulty, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const [state, setState] = usePuzzleState(() => createPairState(puzzle), puzzle)
  const skin = pairSkinFor()

  // A hint is derived only once asked for: the top rungs hypothesise square by square, and deriving one on
  // every tap would pay for a string nobody asked to read.
  const [asked, setAsked] = useState(false)
  const hint = useMemo(() => (asked ? buildPairHint(puzzle, state) : undefined), [asked, puzzle, state])

  // The board finishes itself before the shell hears "solved", one piece at a time (puzzle-screens.md);
  // input is refused for that beat so a tap cannot undo a piece mid-run.
  const finished = pairSolved(puzzle, state)
  const pieces = state.marks.flatMap((value, cell) => (value === "piece" ? [cell] : []))
  const celebration = useCelebration(finished, pieces.length)
  const celebrated = new Set(pieces.slice(0, Math.round(celebration.progress * pieces.length)))

  // Two lines: the reason, then what to do about it.
  const hintText = useCallback(() => {
    if (!hint) return undefined
    const params = { ...hint.params, token: skin.token }
    const reason = t(`pairPuzzle.hint.${skin.name}.${hint.key}`, params)
    if (!hint.action) return reason
    return `${reason}\n${t(`pairPuzzle.hint.${skin.name}.action.${hint.action}`, { ...params, count: hint.settles })}`
  }, [hint, skin, t])

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => setState(createPairState(puzzle))}
      undo={{ onPress: () => setState(undoPair(state)), enabled: canUndoPair(state) && !finished }}
      hint={hintText}
      onHintRevealed={() => setAsked(true)}
      idleMs={hintIdleDelay(difficulty)}
      title={t(`pairPuzzle.name.${skin.name}`)}
      goal={t(`pairPuzzle.goal.${skin.name}`)}
      rules={<PairPuzzleRules skin={skin.name} />}
    >
      {({ reportInput, hintVisible }) => (
        <PairPuzzleBoard
          puzzle={puzzle}
          state={state}
          skin={skin}
          highlighted={hintVisible ? hint?.cells : undefined}
          decided={hintVisible ? hint?.decided : undefined}
          focus={hintVisible ? hint?.focus : undefined}
          celebrated={celebrated}
          onTapCell={cell => {
            if (finished) return
            reportInput()
            setState(cyclePairCell(state, cell, puzzle))
          }}
          onSweepCells={cells => {
            if (finished) return
            reportInput()
            setState(sweepPairCells(state, cells, puzzle))
          }}
        />
      )}
    </PuzzleFamilyShell>
  )
}
