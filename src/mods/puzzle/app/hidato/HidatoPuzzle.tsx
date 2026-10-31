import { useMemo, type FC } from "react"
import { usePuzzleState } from "@/mods/core/app/puzzleState"
import { useTranslation } from "react-i18next"
import { HidatoBoard } from "@/mods/puzzle/app/hidato/HidatoBoard"
import { HidatoRules } from "@/mods/puzzle/app/hidato/HidatoRules"
import { buildHidatoHint } from "@/mods/puzzle/app/hidato/hidatoHint"
import type { HidatoPuzzle as HidatoPuzzleData } from "@/mods/puzzle/game/hidato/generateHidato"
import {
  armHidato,
  canUndoHidato,
  carriedTo,
  createHidatoState,
  eraseHidato,
  isHidatoSolved,
  pickUpHidato,
  stepHidato,
  undoHidato,
  type HidatoState,
} from "@/mods/puzzle/game/hidato/hidatoState"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { useFrozenHint } from "@/mods/core/app/useFrozenHint"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import type { Difficulty } from "@/data/difficultyLevels"
import { skinFor } from "./skins"

type Props = {
  puzzle: HidatoPuzzleData
  difficulty?: Difficulty
  /** The pool this room was drawn from — which place it is. */
  role?: string | string[]
  /** The ambience its site authored, or a skin named outright. */
  theme?: string
  /** Which room this is, so an undressed one still draws a face of its own (faceFor.ts). */
  room?: string
  onSolved: () => void
  onCancel: () => void
}

export const HidatoPuzzle: FC<Props> = ({ puzzle, difficulty, role, theme, room, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  // Which place this room is. The board, the goal, the rules and every hint sentence are drawn from it.
  const skin = skinFor(role, theme, 0, room)
  const [state, setState] = usePuzzleState(() => createHidatoState(puzzle), puzzle)
  const last = puzzle.cells.length

  // Derived on every change: whether there is a hint at all is what shows the button. What the player is
  // shown is the one from the moment they asked, held until a move that changes a number ends it.
  const available = useMemo(
    () => buildHidatoHint(puzzle, state.values, puzzle.solution, puzzle.pruning),
    [puzzle, state.values]
  )
  const { hint, freeze, drop } = useFrozenHint(() => available)

  /**
   * The run flies the comb before the shell is told: 1 lights, then 2, then 3, to the last cell — the
   * order the player just proved, read back along the path they drew.
   *
   * The shell freezes the board and starts its banner the moment it hears "solved"
   * (`puzzle-screens.md` §3), so the flight has to happen before that word is said, and no tap may land
   * while it runs or a number pulled back out would report a solve on a board that is no longer solved.
   * `lit` reads off `progress` rather than `done`, which is what keeps reduced motion honest: a skipped
   * run reports done with progress still at 0, so nothing lights and the board is simply the answer.
   */
  const finished = isHidatoSolved(puzzle, state)
  const celebration = useCelebration(finished, last)
  const lit = celebration.progress > 0 ? Math.round(celebration.progress * last) : undefined

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => setState(createHidatoState(puzzle))}
      undo={{ onPress: () => setState(undoHidato), enabled: canUndoHidato(state) && !finished }}
      hint={
        (available ?? hint) &&
        (() =>
          hint &&
          [
            t(`hidato.hint.${skin.name}.reason.${hint.key}`, hint.params),
            hint.place !== undefined && t(`hidato.hint.${skin.name}.action.place`, { value: hint.place }),
          ]
            .filter(Boolean)
            .join("\n"))
      }
      onHintRevealed={freeze}
      onHintHidden={drop}
      idleMs={hintIdleDelay(difficulty)}
      title={t(`hidato.name.${skin.name}`)}
      goal={t(`hidato.goal.${skin.name}`, { last })}
      rules={<HidatoRules skin={skin.name} />}
    >
      {({ reportInput, hintVisible }) => (
        <HidatoBoard
          puzzle={puzzle}
          skin={skin}
          values={state.values}
          pen={state.pen}
          // The whole channel once the board is done: the light runs the length of it (design doc §7.1).
          carried={finished ? undefined : carriedTo(state)}
          hatched={hintVisible ? hint?.cell : undefined}
          marked={hintVisible ? hint?.evidence : undefined}
          lit={lit}
          onPickUp={key => {
            if (finished) return
            reportInput("look")
            // A press picks the run up and decides nothing else: what the touch meant is known only
            // once it lifts, and reading it as a tap here rubbed out the very number a drag was
            // starting from (design doc §6.5).
            setState(prev => pickUpHidato(prev, key))
          }}
          onTap={(key, wasPen) => {
            if (finished) return // the run is flying; nothing may change under it
            // Which of the three a tap is follows from what the cell holds and whether the run was
            // ALREADY standing there. Tapping the number the run is on takes it back off — backing out
            // of a wrong turn is the same gesture as walking into it — but a given can only be put
            // down, never taken off, and a cell the press has just picked the run up at is done.
            const decide = (from: HidatoState) =>
              from.values[key] === undefined
                ? stepHidato(from, key, puzzle)
                : !wasPen
                  ? from
                  : puzzle.givens[key] === undefined
                    ? eraseHidato(from, key, puzzle)
                    : armHidato(from, key)
            // Arming the run on a number only picks it up: no value changed, so a hint stays. Unlike a click,
            // a tap is two pointer events and a drag a stream of them, which can land in one batch, so the
            // update goes through the latest board while the hint is judged on the board as drawn.
            reportInput(decide(state).values === state.values ? "look" : "move")
            setState(decide)
          }}
          onDrag={key => {
            if (finished) return
            // A drag that goes nowhere writes nothing, so a hint stays through it.
            reportInput(stepHidato(state, key, puzzle).values === state.values ? "look" : "move")
            // Every reading a drag has is the board's own: carrying the run on, passing through what
            // is already written, and backing out of the last turn are all one step along the run
            // (stepHidato), which is the only thing that knows which way it is being counted.
            setState(prev => stepHidato(prev, key, puzzle))
          }}
        />
      )}
    </PuzzleFamilyShell>
  )
}
