import clsx from "clsx"
import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import {
  createRushHourState,
  rushHourSolved,
  slidePiece,
  type RushHourPuzzle as RushHourPuzzleData,
  type RushHourState,
} from "@/mods/puzzle/game/rushHour/rushHour"
import { buildRushHourHint } from "./rushHourHint"
import { RushHourBoard } from "./RushHourBoard"
import { RushHourRules } from "./RushHourRules"
import { skinFor } from "./skins"

type Props = {
  puzzle: RushHourPuzzleData
  difficulty?: Difficulty
  /** The pool this room was drawn from — which place it is (docs/instructions/puzzle-screens.md §2). */
  role?: string | string[]
  /** The ambience its site authored, or a skin named outright. */
  theme?: string
  onSolved: () => void
  onCancel: () => void
}

export const RushHourPuzzle: FC<Props> = ({ puzzle, difficulty, role, theme, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const skin = skinFor(role, theme)
  /**
   * Every position the player has stood in, the current one last.
   *
   * **A stack rather than a single state, because undo is the control this family actually needs.** A move
   * here is a commitment three moves deep — you shove a piece aside to free another and find you have
   * pinned the one you wanted — and the alternative to stepping back is resetting a board the player has
   * spent two minutes on.
   */
  const [past, setPast] = useState<RushHourState[]>(() => [createRushHourState(puzzle)])
  const state = past[past.length - 1]

  /** Whether the player has asked for a hint, which is what gates the search (§4). */
  const [asked, setAsked] = useState(false)
  const hint = useMemo(() => (asked ? buildRushHourHint(puzzle, state) : undefined), [asked, puzzle, state])

  /**
   * The player's piece drives out before the shell is told.
   *
   * The shell freezes the board and starts its banner the moment it hears "solved"
   * (`puzzle-screens.md` §3), so the piece has to leave BEFORE that word is said. One beat, one piece —
   * the run this family has is the thing the whole board was about.
   */
  const finished = rushHourSolved(puzzle, state)
  const celebration = useCelebration(finished, 1)

  const hintText = useCallback(() => {
    if (!hint) return undefined
    const reason = t(`rushHour.hint.${skin.name}.${hint.key}`)
    return `${reason}\n${t(`rushHour.hint.${skin.name}.push.${hint.action}`)}`
  }, [hint, skin, t])

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => setPast([createRushHourState(puzzle)])}
      hint={hintText}
      onHintRevealed={() => setAsked(true)}
      idleMs={hintIdleDelay(difficulty)}
      title={t(`rushHour.name.${skin.name}`)}
      goal={t(`rushHour.goal.${skin.name}`)}
      rules={<RushHourRules skin={skin.name} />}
    >
      {({ reportInput, hintVisible }) => (
        <>
          <RushHourBoard
            puzzle={puzzle}
            state={state}
            skin={skin}
            hintPiece={hintVisible ? hint?.move.index : undefined}
            hintCells={hintVisible ? hint?.cells : undefined}
            leaving={finished}
            onSlide={(index, offset) => {
              if (finished) return // the piece is leaving; nothing may change under the run
              const moved = slidePiece(puzzle, state, index, offset)
              if (moved === state) return
              reportInput()
              setPast(stack => [...stack, moved])
            }}
          />
          {/* The same control eclipse, futoshiki and star battle put under their boards, in the same place
              and the same shape. */}
          <button
            onClick={() => {
              reportInput()
              setPast(stack => (stack.length > 1 ? stack.slice(0, -1) : stack))
            }}
            disabled={past.length === 1 || finished}
            className={clsx(
              "flex h-11 min-w-11 items-center justify-center gap-1 rounded border px-2 text-sm transition-colors",
              past.length > 1 && !finished
                ? "border-amber-700 bg-amber-950/60 text-amber-200"
                : "border-stone-700 bg-stone-900 text-stone-600"
            )}
          >
            ↩ {t("rushHour.undo")}
          </button>
        </>
      )}
    </PuzzleFamilyShell>
  )
}
