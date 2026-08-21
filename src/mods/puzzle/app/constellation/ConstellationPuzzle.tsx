import clsx from "clsx"
import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import {
  canUndoConstellation,
  constellationSolved,
  createConstellationState,
  cycleConstellationLine,
  undoConstellation,
} from "@/mods/puzzle/game/constellation/constellation"
import type { ConstellationPuzzleWithAnswer } from "@/mods/puzzle/game/constellation/generateConstellation"
import { ConstellationBoard } from "./ConstellationBoard"
import { buildConstellationHint } from "./constellationHint"
import { ConstellationRules } from "./ConstellationRules"

type Props = {
  puzzle: ConstellationPuzzleWithAnswer
  difficulty?: Difficulty
  /** The skin the site authored for this room (docs/game-design/puzzles/constellation.md §9). */
  theme?: string
  onSolved: () => void
  onCancel: () => void
}

export const ConstellationPuzzle: FC<Props> = ({ puzzle, difficulty, theme, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const [state, setState] = useState(() => createConstellationState(puzzle))

  /**
   * Whether the player has asked for a hint, which is what gates deriving one.
   *
   * The top rung walks groups across the whole board. Derived as the board changed, that lands on every
   * gesture, for a string nobody asked to read.
   */
  const [asked, setAsked] = useState(false)

  const hint = useMemo(() => (asked ? buildConstellationHint(puzzle, state) : undefined), [asked, puzzle, state])

  // A function rather than a string, so the shell only reaches for the text once the hint is on screen.
  const hintText = useCallback(() => (hint && t(`constellation.hint.${hint.key}`, hint.params)) || undefined, [hint, t])

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={constellationSolved(puzzle, state)}
      onReset={() => setState(createConstellationState(puzzle))}
      hint={hintText}
      onHintRevealed={() => setAsked(true)}
      idleMs={hintIdleDelay(difficulty)}
      rules={<ConstellationRules />}
    >
      {({ reportInput, hintVisible }) => (
        <>
          <ConstellationBoard
            puzzle={puzzle}
            state={state}
            highlighted={hintVisible ? hint?.pairs : undefined}
            focus={hintVisible ? hint?.focus : undefined}
            litStars={hintVisible ? hint?.stars : undefined}
            theme={theme}
            onDrawLine={pair => {
              reportInput()
              // From the board it replaces rather than from the render's own copy: two fingers releasing
              // inside one batch would otherwise both read the same board, and one of the two lines would be
              // dropped. Undo has the same reason to care — its stack is part of that board.
              setState(previous => cycleConstellationLine(puzzle, previous, pair))
            }}
          />
          {/* The same control futoshiki and eclipse put under their boards, in the same place and the same
              shape. A drag gives one pair back, so this is for stepping back off a run of lines drawn on a
              wrong reading. */}
          <button
            onClick={() => {
              reportInput()
              setState(undoConstellation)
            }}
            disabled={!canUndoConstellation(state)}
            className={clsx(
              "flex h-11 min-w-11 items-center justify-center gap-1 rounded border px-2 text-sm transition-colors",
              canUndoConstellation(state)
                ? "border-amber-700 bg-amber-950/60 text-amber-200"
                : "border-stone-700 bg-stone-900 text-stone-600"
            )}
          >
            ↩ {t("constellation.undo")}
          </button>
        </>
      )}
    </PuzzleFamilyShell>
  )
}
