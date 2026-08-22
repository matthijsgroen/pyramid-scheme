import clsx from "clsx"
import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { useCelebration } from "@/mods/core/app/useCelebration"
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
import { skinFor } from "./skins"

import { buildConstellationHint } from "./constellationHint"
import { ConstellationRules } from "./ConstellationRules"

type Props = {
  puzzle: ConstellationPuzzleWithAnswer
  difficulty?: Difficulty
  /** The ambience the site authored, or a skin named outright (docs/game-design/puzzles/constellation.md §9). */
  theme?: string
  /** The role this room was allocated for — what decides which of this family’s places it is. */
  role?: string | string[]
  onSolved: () => void
  onCancel: () => void
}

export const ConstellationPuzzle: FC<Props> = ({ puzzle, difficulty, theme, role, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  // Which place this room is. The goal and the rules are both worded from it, so they are resolved once.
  const { name: skin } = skinFor(role, theme)
  const [state, setState] = useState(() => createConstellationState(puzzle))

  /**
   * Whether the player has asked for a hint, which is what gates deriving one.
   *
   * The top rung walks groups across the whole board. Derived as the board changed, that lands on every
   * gesture, for a string nobody asked to read.
   */
  const [asked, setAsked] = useState(false)

  const hint = useMemo(() => (asked ? buildConstellationHint(puzzle, state) : undefined), [asked, puzzle, state])

  /**
   * The board finishes itself before the shell is told, one node at a time.
   *
   * The shell freezes the board and starts its banner the moment it hears "solved", so the celebration has to
   * happen BEFORE that word is said — which needs nothing from core: the family simply reports the solve a
   * beat later. Input is refused for that beat, or a player could pull a line back out mid-run and the solve
   * would land on a board that is no longer solved.
   */
  const finished = constellationSolved(puzzle, state)
  // One tick per star, so the run lights them in board order.
  const celebration = useCelebration(finished, puzzle.stars.length)
  const celebrated = new Set(
    Array.from({ length: Math.round(celebration.progress * puzzle.stars.length) }, (_unused, index) => index)
  )

  /**
   * A function rather than a string, so the shell only reaches for the text once the hint is on screen.
   *
   * Two lines, both spoken in the place this room is: the reason, then the move it asks for
   * (`puzzle-screens.md` §4.1, §4.3). A waterworks board saying "that line would seal these 4 stars off from
   * the rest" is describing something that is not on the screen.
   */
  const hintText = useCallback(() => {
    if (!hint) return undefined
    const reason = t(`constellation.hint.${skin}.${hint.key}`, hint.params)
    if (!hint.action) return reason
    const move = t(`constellation.hint.${skin}.action.${hint.action.key}`, { count: hint.action.count })
    return `${reason}\n${move}`
  }, [hint, skin, t])

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => setState(createConstellationState(puzzle))}
      hint={hintText}
      onHintRevealed={() => setAsked(true)}
      idleMs={hintIdleDelay(difficulty)}
      goal={t(`constellation.goal.${skin}`)}
      rules={<ConstellationRules skin={skin} />}
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
            role={role}
            celebrated={celebrated}
            onDrawLine={pair => {
              if (finished) return // the board is finishing; nothing may change under the celebration
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
            disabled={!canUndoConstellation(state) || finished}
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
