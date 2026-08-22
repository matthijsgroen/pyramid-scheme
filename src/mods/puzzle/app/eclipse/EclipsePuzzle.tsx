import clsx from "clsx"
import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import {
  canUndoEclipse,
  createEclipseState,
  cycleEclipseCell,
  eclipseSolved,
  undoEclipse,
} from "@/mods/puzzle/game/eclipse/eclipse"
import type { EclipsePuzzleWithAnswer } from "@/mods/puzzle/game/eclipse/generateEclipse"
import { buildEclipseHint } from "./eclipseHint"
import { EclipseBoard } from "./EclipseBoard"
import { EclipseRules } from "./EclipseRules"

type Props = {
  puzzle: EclipsePuzzleWithAnswer
  difficulty?: Difficulty
  /** The skin the site authored for this room; unknown or unset draws the default pair. */
  theme?: string
  onSolved: () => void
  onCancel: () => void
}

export const EclipsePuzzle: FC<Props> = ({ puzzle, difficulty, theme, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const [state, setState] = useState(() => createEclipseState(puzzle))

  /**
   * Whether the player has asked for a hint, which is what gates deriving one.
   *
   * A hint reads the board, and the top rung enumerates every legal filling of every line. Derived as the
   * board changed, that lands on **every tap** for a string nobody asked to read — the same cost lightbeam
   * paid for once and stopped paying.
   */
  const [asked, setAsked] = useState(false)

  const hint = useMemo(
    () => (asked ? buildEclipseHint(puzzle, state, puzzle.solution) : undefined),
    [asked, puzzle, state]
  )

  /**
   * A function rather than a string, so the shell only reaches for the text once the hint is on screen.
   *
   * Two lines: the reason, then the move it asks for (`puzzle-screens.md` §4).
   */
  const hintText = useCallback(() => {
    if (!hint) return undefined
    const reason = t(`eclipse.hint.${hint.key}`, hint.params)
    if (!hint.action) return reason
    const { key, ...params } = hint.action
    return `${reason}\n${t(`eclipse.hint.action.${key}`, params)}`
  }, [hint, t])

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={eclipseSolved(puzzle, state)}
      onReset={() => setState(createEclipseState(puzzle))}
      hint={hintText}
      onHintRevealed={() => setAsked(true)}
      idleMs={hintIdleDelay(difficulty)}
      goal={t("eclipse.goal")}
      rules={<EclipseRules />}
    >
      {({ reportInput, hintVisible }) => (
        <>
          <EclipseBoard
            puzzle={puzzle}
            state={state}
            theme={theme}
            highlighted={hintVisible ? hint?.cells : undefined}
            decided={hintVisible ? hint?.decided : undefined}
            focus={hintVisible ? hint?.focus : undefined}
            onTapCell={cell => {
              reportInput()
              setState(cycleEclipseCell(puzzle, state, cell))
            }}
          />
          {/* The same control futoshiki puts under its board, in the same place and the same shape: a family
              that moves its undo teaches its controls twice. A tap is its own eraser here, so this is for
              stepping back off a run of squares filled on a wrong reading. */}
          <button
            onClick={() => {
              reportInput()
              setState(undoEclipse(state))
            }}
            disabled={!canUndoEclipse(state)}
            className={clsx(
              "flex h-11 min-w-11 items-center justify-center gap-1 rounded border px-2 text-sm transition-colors",
              canUndoEclipse(state)
                ? "border-amber-700 bg-amber-950/60 text-amber-200"
                : "border-stone-700 bg-stone-900 text-stone-600"
            )}
          >
            ↩ {t("eclipse.undo")}
          </button>
        </>
      )}
    </PuzzleFamilyShell>
  )
}
