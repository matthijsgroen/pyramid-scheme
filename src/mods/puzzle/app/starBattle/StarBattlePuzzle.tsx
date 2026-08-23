import clsx from "clsx"
import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { useCelebration } from "@/mods/core/app/useCelebration"
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
import { skinFor } from "./skins"
import { StarBattleBoard } from "./StarBattleBoard"
import { StarBattleRules } from "./StarBattleRules"

type Props = {
  puzzle: StarBattlePuzzleWithAnswer
  difficulty?: Difficulty
  /** The pool this room was drawn from — which place it is (docs/instructions/puzzle-screens.md §2). */
  role?: string | string[]
  /** The ambience its site authored, or a skin named outright. */
  theme?: string
  onSolved: () => void
  onCancel: () => void
}

export const StarBattlePuzzle: FC<Props> = ({ puzzle, difficulty, role, theme, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const [state, setState] = useState(() => createStarBattleState(puzzle))
  // Which place this room is. The board, the goal, the rules and every hint sentence are all drawn from it,
  // so it is resolved once.
  const skin = skinFor(role, theme)

  /**
   * Whether the player has asked for a hint, which is what gates deriving one.
   *
   * The top rung sweeps every pair of regions against every pair of lines. Derived as the board changed,
   * that lands on **every tap** for a string nobody asked to read — the cost lightbeam paid for once.
   */
  const [asked, setAsked] = useState(false)

  const hint = useMemo(() => (asked ? buildStarBattleHint(puzzle, state) : undefined), [asked, puzzle, state])

  /**
   * The board finishes itself before the shell is told, one answer at a time.
   *
   * The shell freezes the board and starts its banner the moment it hears "solved", so the celebration has to
   * happen BEFORE that word is said (`puzzle-screens.md` §3) — the family reports the solve a beat later.
   * Input is refused for that beat, or a tap could clear a star mid-run and the solve would land on a board
   * that is no longer solved.
   */
  const finished = starBattleSolved(puzzle, state)
  // The answers in reading order, so the run lights them across the board the way it is read.
  const stars = state.marks.flatMap((value, cell) => (value === "star" ? [cell] : []))
  const celebration = useCelebration(finished, stars.length)
  const celebrated = new Set(stars.slice(0, Math.round(celebration.progress * stars.length)))

  /**
   * A function rather than a string, so the shell only reaches for the text once the hint is on screen.
   *
   * Two lines: the reason, then what to do about it. The blank line between them is why the shell keeps its
   * hint text pre-line — a reason and an imperative read as one wall of text run together.
   */
  const hintText = useCallback(() => {
    if (!hint) return undefined
    // The glyph in the sentence is the place's own token, so a hint says the thing standing in the square
    // rather than naming it — and the sentences themselves are keyed per place (§4.3), because a shared
    // template with a noun in a slot breaks on the first locale that inflects around it.
    const params = { ...hint.params, token: skin.token }
    const reason = t(`starBattle.hint.${skin.name}.${hint.key}`, params)
    if (!hint.action) return reason
    return `${reason}\n${t(`starBattle.hint.${skin.name}.action.${hint.action}`, { ...params, count: hint.settles })}`
  }, [hint, skin, t])

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => setState(createStarBattleState(puzzle))}
      hint={hintText}
      onHintRevealed={() => setAsked(true)}
      idleMs={hintIdleDelay(difficulty)}
      goal={t(`starBattle.goal.${skin.name}`, { count: puzzle.quota })}
      rules={<StarBattleRules skin={skin.name} />}
    >
      {({ reportInput, hintVisible }) => (
        <>
          <StarBattleBoard
            puzzle={puzzle}
            state={state}
            skin={skin}
            highlighted={hintVisible ? hint?.cells : undefined}
            decided={hintVisible ? hint?.decided : undefined}
            focus={hintVisible ? hint?.focus : undefined}
            celebrated={celebrated}
            onTapCell={cell => {
              if (finished) return // the board is finishing; nothing may change under the celebration
              reportInput()
              setState(cycleStarBattleCell(state, cell))
            }}
            onSweepCells={cells => {
              if (finished) return
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
            disabled={!canUndoStarBattle(state) || finished}
            className={clsx(
              "flex h-11 min-w-11 items-center justify-center gap-1 rounded border px-2 text-sm transition-colors",
              canUndoStarBattle(state) && !finished
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
