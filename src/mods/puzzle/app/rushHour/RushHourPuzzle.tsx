import { useCallback, useRef, type FC } from "react"
import { usePuzzleState } from "@/mods/core/app/puzzleState"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { useFrozenHint } from "@/mods/core/app/useFrozenHint"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import {
  createRushHourState,
  rushHourSolved,
  slidePiece,
  stateKey,
  type RushHourPuzzle as RushHourPuzzleData,
  type RushHourState,
} from "@/mods/puzzle/game/rushHour/rushHour"
import { buildRushHourHint } from "./rushHourHint"
import { RushHourBoard } from "./RushHourBoard"
import { RushHourRules } from "./RushHourRules"
import { useRushHourControls } from "./rushHourControls"
import { skinFor } from "./skins"

type Props = {
  puzzle: RushHourPuzzleData
  difficulty?: Difficulty
  /** The pool this room was drawn from — which place it is (docs/instructions/puzzle-screens.md). */
  role?: string | string[]
  /** The ambience its site authored, or a skin named outright. */
  theme?: string
  /** Which room this is, so an undressed one still draws a face of its own (faceFor.ts). */
  room?: string
  onSolved: () => void
  onCancel: () => void
}

export const RushHourPuzzle: FC<Props> = ({ puzzle, difficulty, role, theme, room, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const skin = skinFor(role, theme, 0, room)
  const controls = useRushHourControls()
  /**
   * Every position the player has stood in, the current one last.
   *
   * **A stack rather than a single state, because undo is the control this family actually needs.** A move
   * here is a commitment three moves deep — you shove a piece aside to free another and find you have
   * pinned the one you wanted — and the alternative to stepping back is resetting a board the player has
   * spent two minutes on.
   */
  const [past, setPast] = usePuzzleState<RushHourState[]>(() => [createRushHourState(puzzle)], puzzle)
  const state = past[past.length - 1]
  /**
   * Where the piece in hand stands in its move: just taken, or already shoved. Every slide from taking a piece to
   * letting it go is one move, a drag's and a held key's alike, so one undo takes the whole of it back.
   */
  const gesture = useRef<"none" | "open" | "moved">("none")

  /**
   * The hint as it was when the player asked, which is also what gates the search: nothing is built
   * before the ask. It names one slide and any slide ends it, so it is never rebuilt while it is shown.
   */
  const { hint, freeze, drop } = useFrozenHint(() => buildRushHourHint(puzzle, state))

  /**
   * The player's piece drives out before the shell is told.
   *
   * The shell freezes the board and starts its banner the moment it hears "solved"
   * (`puzzle-screens.md`: a completion animation runs before "solved"), so the piece has to leave BEFORE that
   * word is said. One beat, one piece — the run this family has is the thing the whole board was about.
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
      onReset={() => {
        gesture.current = "none"
        setPast([createRushHourState(puzzle)])
      }}
      undo={{
        onPress: () => {
          gesture.current = "none"
          setPast(stack => (stack.length > 1 ? stack.slice(0, -1) : stack))
        },
        enabled: past.length > 1 && !finished,
      }}
      hint={hintText}
      onHintRevealed={freeze}
      onHintHidden={drop}
      idleMs={hintIdleDelay(difficulty)}
      title={t(`rushHour.name.${skin.name}`)}
      goal={t(`rushHour.goal.${skin.name}`)}
      rules={<RushHourRules skin={skin.name} />}
      controls={controls}
    >
      {({ reportInput, hintVisible, boardInput }) => (
        <RushHourBoard
          puzzle={puzzle}
          state={state}
          skin={skin}
          hintPiece={hintVisible ? hint?.move.index : undefined}
          hintCells={hintVisible ? hint?.cells : undefined}
          leaving={finished}
          boardInput={boardInput}
          onGrab={() => {
            gesture.current = "open"
          }}
          onSlide={(index, offset) => {
            if (finished) return // the piece is leaving; nothing may change under the run
            const moved = slidePiece(puzzle, state, index, offset)
            if (moved === state) return
            reportInput()
            // Decided now, not inside the updater: React may run that after the gesture has moved on.
            const sameMove = gesture.current === "moved"
            if (gesture.current === "open") gesture.current = "moved"
            setPast(stack => (sameMove ? [...stack.slice(0, -1), moved] : [...stack, moved]))
          }}
          onRelease={() => {
            // A piece put back where it was taken from made no move.
            if (gesture.current === "moved")
              setPast(stack =>
                stack.length > 1 && stateKey(stack[stack.length - 1]) === stateKey(stack[stack.length - 2])
                  ? stack.slice(0, -1)
                  : stack
              )
            gesture.current = "none"
          }}
        />
      )}
    </PuzzleFamilyShell>
  )
}
