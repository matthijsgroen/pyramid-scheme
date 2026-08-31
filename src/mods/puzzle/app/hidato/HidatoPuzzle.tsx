import { useMemo, useState, type FC } from "react"
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
} from "@/mods/puzzle/game/hidato/hidatoState"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { useCelebration } from "@/mods/core/app/useCelebration"
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
  onSolved: () => void
  onCancel: () => void
}

export const HidatoPuzzle: FC<Props> = ({ puzzle, difficulty, role, theme, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  // Which place this room is. The board, the goal, the rules and every hint sentence are drawn from it.
  const skin = skinFor(role, theme)
  const [state, setState] = useState(() => createHidatoState(puzzle))
  const last = puzzle.cells.length

  const hint = useMemo(
    () => buildHidatoHint(puzzle, state.values, puzzle.solution, puzzle.pruning),
    [puzzle, state.values]
  )

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
        hint &&
        [
          t(`hidato.hint.${skin.name}.reason.${hint.key}`, hint.params),
          hint.place !== undefined && t(`hidato.hint.${skin.name}.action.place`, { value: hint.place }),
        ]
          .filter(Boolean)
          .join("\n")
      }
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
            reportInput()
            // A press picks the run up and decides nothing else: what the touch meant is known only
            // once it lifts, and reading it as a tap here rubbed out the very number a drag was
            // starting from (design doc §6.5).
            setState(prev => pickUpHidato(prev, key))
          }}
          onTap={(key, wasPen) => {
            if (finished) return // the run is flying; nothing may change under it
            reportInput()
            // Which of the three a tap is follows from what the cell holds and whether the run was
            // ALREADY standing there. Tapping the number the run is on takes it back off — backing out
            // of a wrong turn is the same gesture as walking into it — but a given can only be put
            // down, never taken off, and a cell the press has just picked the run up at is done.
            setState(prev =>
              prev.values[key] === undefined
                ? stepHidato(prev, key, puzzle)
                : !wasPen
                  ? prev
                  : puzzle.givens[key] === undefined
                    ? eraseHidato(prev, key, puzzle)
                    : armHidato(prev, key)
            )
          }}
          onDrag={key => {
            if (finished) return
            reportInput()
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
