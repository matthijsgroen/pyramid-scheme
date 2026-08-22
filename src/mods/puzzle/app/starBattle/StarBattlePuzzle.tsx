import clsx from "clsx"
import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import {
  canUndoStarBattle,
  createStarBattleState,
  cycleStarBattleCell,
  starBattleSolved,
  sweepStarBattleCells,
  undoStarBattle,
} from "@/mods/puzzle/game/starBattle/starBattle"
import type { StarBattlePuzzleWithAnswer } from "@/mods/puzzle/game/starBattle/generateStarBattle"
import { buildStarBattleHint } from "./starBattleHint"
import { StarBattleBoard } from "./StarBattleBoard"
import { StarBattleRules } from "./StarBattleRules"

type Props = {
  puzzle: StarBattlePuzzleWithAnswer
  difficulty?: Difficulty
  onSolved: () => void
  onCancel: () => void
}

export const StarBattlePuzzle: FC<Props> = ({ puzzle, difficulty, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const [state, setState] = useState(() => createStarBattleState(puzzle))

  /**
   * Whether the player has asked for a hint, which is what gates deriving one.
   *
   * The top rung sweeps every pair of regions against every pair of lines. Derived as the board changed,
   * that lands on **every tap** for a string nobody asked to read — the cost lightbeam paid for once.
   */
  const [asked, setAsked] = useState(false)

  const hint = useMemo(() => (asked ? buildStarBattleHint(puzzle, state) : undefined), [asked, puzzle, state])

  // A function rather than a string, so the shell only reaches for the text once the hint is on screen.
  const hintText = useCallback(() => (hint && t(`starBattle.hint.${hint.key}`, hint.params)) || undefined, [hint, t])

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={starBattleSolved(puzzle, state)}
      onReset={() => setState(createStarBattleState(puzzle))}
      hint={hintText}
      onHintRevealed={() => setAsked(true)}
      idleMs={hintIdleDelay(difficulty)}
      goal={t("starBattle.goal")}
      rules={<StarBattleRules />}
    >
      {({ reportInput, hintVisible }) => (
        <>
          <StarBattleBoard
            puzzle={puzzle}
            state={state}
            highlighted={hintVisible ? hint?.cells : undefined}
            decided={hintVisible ? hint?.decided : undefined}
            focus={hintVisible ? hint?.focus : undefined}
            onTapCell={cell => {
              reportInput()
              setState(cycleStarBattleCell(state, cell))
            }}
            onSweepCells={cells => {
              reportInput()
              setState(sweepStarBattleCells(state, cells))
            }}
          />
          {/* The same control eclipse and futoshiki put under their boards, in the same place and the same
              shape. A tap is its own eraser, so this is for stepping back off a run of squares darkened on a
              wrong reading — which is the mistake a board of mostly-elimination produces. */}
          <button
            onClick={() => {
              reportInput()
              setState(undoStarBattle(state))
            }}
            disabled={!canUndoStarBattle(state)}
            className={clsx(
              "flex h-11 min-w-11 items-center justify-center gap-1 rounded border px-2 text-sm transition-colors",
              canUndoStarBattle(state)
                ? "border-amber-700 bg-amber-950/60 text-amber-200"
                : "border-stone-700 bg-stone-900 text-stone-600"
            )}
          >
            ↩ {t("starBattle.undo")}
          </button>
        </>
      )}
    </PuzzleFamilyShell>
  )
}
