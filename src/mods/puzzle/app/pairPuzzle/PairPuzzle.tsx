import { useCallback, type FC } from "react"
import { useTranslation } from "react-i18next"
import { usePuzzleState } from "@/mods/core/app/puzzleState"
import type { Difficulty } from "@/data/difficultyLevels"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import { useFrozenHint } from "@/mods/core/app/useFrozenHint"
import { classifyMarkMove, openDecisions, openFocus, type MarkVocabulary } from "@/mods/core/app/markMoveEffect"
import {
  canUndoPair,
  createPairState,
  cyclePairCell,
  pairingOf,
  pairSolved,
  sweepPairCells,
  undoPair,
} from "@/mods/puzzle/game/pairPuzzle/pairPuzzle"
import type { PairMark } from "@/mods/puzzle/game/pairPuzzle/pairPuzzle"
import type { PairPuzzleWithAnswer } from "@/mods/puzzle/game/pairPuzzle/generatePairPuzzle"
import { buildPairHint } from "./pairPuzzleHint"
import { pairSkinFor } from "./skins"
import { PairPuzzleBoard } from "./PairPuzzleBoard"
import { PairPuzzleRules } from "./PairPuzzleRules"

const MARKS: MarkVocabulary<PairMark> = { place: "piece", ruleOut: "empty" }

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

  // A hint is derived only once asked for (the top rungs hypothesise square by square) and held as it was
  // until a move ends it, so one that names several squares keeps naming the same ones.
  const { hint, freeze, drop } = useFrozenHint(() => buildPairHint(puzzle, state))
  const open = hint ? openDecisions(hint, MARKS, state.marks) : undefined

  // The board finishes itself before the shell hears "solved", one piece at a time (puzzle-screens.md);
  // input is refused for that beat so a tap cannot undo a piece mid-run.
  const finished = pairSolved(puzzle, state)
  const pieces = state.marks.flatMap((value, cell) => (value === "piece" ? [cell] : []))
  const celebration = useCelebration(finished, pieces.length)
  const celebrated = new Set(pieces.slice(0, Math.round(celebration.progress * pieces.length)))
  // Where each piece walks to in that run. A solved board always has a pairing; which one is drawn does not
  // matter when there are several, the answer is where the pieces stand.
  const pairing = finished
    ? pairingOf(
        puzzle,
        state.marks.map(mark => mark === "piece")
      )
    : undefined

  // Two lines: the reason, then what to do about it.
  const hintText = useCallback(() => {
    if (!hint) return undefined
    const { params } = hint
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
      onHintRevealed={freeze}
      onHintHidden={drop}
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
          decided={hintVisible ? open : undefined}
          focus={hintVisible && hint && open ? openFocus(hint.focus, open) : undefined}
          celebrated={celebrated}
          pairing={pairing}
          onTapCell={cell => {
            if (finished) return
            const next = cyclePairCell(state, cell, puzzle)
            reportInput(hint ? classifyMarkMove(hint, MARKS, "tap", state.marks, next.marks) : "move")
            setState(next)
          }}
          onSweepCells={cells => {
            if (finished) return
            const next = sweepPairCells(state, cells, puzzle)
            reportInput(hint ? classifyMarkMove(hint, MARKS, "sweep", state.marks, next.marks) : "move")
            setState(next)
          }}
        />
      )}
    </PuzzleFamilyShell>
  )
}
