import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { LightbeamBoard } from "@/mods/puzzle/app/lightbeam/LightbeamBoard"
import { LightbeamRules } from "@/mods/puzzle/app/lightbeam/LightbeamRules"
import { lightbeamHintSteps, pickLightbeamHint } from "@/mods/puzzle/app/lightbeam/lightbeamHint"
import { isLit } from "@/mods/puzzle/game/lightbeam/beam"
import type { LightbeamPuzzle as LightbeamPuzzleData } from "@/mods/puzzle/game/lightbeam/generateLightbeam"
import { createLightbeamState, cycleLightbeamPiece } from "@/mods/puzzle/game/lightbeam/lightbeamState"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import type { Difficulty } from "@/data/difficultyLevels"

type Props = {
  puzzle: LightbeamPuzzleData
  difficulty?: Difficulty
  onSolved: () => void
  onCancel: () => void
}

// One gesture and no undo, which is the whole control scheme: a tap cycles a piece, and tapping round
// again puts it back (design doc §7). There is no pad, no eraser and nothing to take back, so this screen
// is the shell, the board, and nothing in between.
export const LightbeamPuzzle: FC<Props> = ({ puzzle, difficulty, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const [state, setState] = useState(() => createLightbeamState(puzzle))

  const solved = isLit(puzzle, state.states)

  /**
   * Whether the player has asked for a hint, which is what gates deriving one.
   *
   * A hint is a full solve, and the top tier's solve enumerates tens of thousands of configurations. Derived as
   * the board changed, that cost landed on **every tap** — the board took the tap and then sat there, for a
   * string nobody had asked to read. Measured at the time: 185ms a tap against 19ms.
   *
   * Never cleared, and it costs nothing to leave set: the solve does not read the board, so a move can neither
   * make it stale nor trigger another one. The shell hides the hint itself on the next input.
   */
  const [asked, setAsked] = useState(false)

  // The solve, kept for the life of the board. It is a pure function of the puzzle, so the first hint pays for
  // every hint after it — 618ms once at the top tier rather than 618ms a press.
  const steps = useMemo(() => (asked ? lightbeamHintSteps(puzzle) : undefined), [asked, puzzle])

  // Which of those reasons is worth saying, which does depend on the board and costs nothing.
  const hint = useMemo(
    () => (steps ? pickLightbeamHint(puzzle, steps, state.states) : undefined),
    [puzzle, steps, state]
  )

  // A function rather than a string, so the shell only reaches for the text once the hint is on screen — and so
  // the button is offered before there is anything to say (see `PuzzleFamilyShell`'s `hint`).
  const hintText = useCallback(() => hint && t(`lightbeam.hint.${hint.key}`), [hint, t])

  const cycle = useCallback((piece: number) => setState(prev => cycleLightbeamPiece(prev, puzzle, piece)), [puzzle])

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={solved}
      onReset={() => setState(createLightbeamState(puzzle))}
      hint={solved ? undefined : hintText}
      onHintRevealed={() => setAsked(true)}
      idleMs={hintIdleDelay(difficulty)}
      rules={<LightbeamRules puzzle={puzzle} />}
    >
      {({ reportInput, hintVisible }) => (
        <LightbeamBoard
          puzzle={puzzle}
          states={state.states}
          highlighted={hintVisible ? hint?.cells : undefined}
          litBeam={hintVisible ? hint?.beam : undefined}
          onCycle={piece => {
            reportInput()
            cycle(piece)
          }}
        />
      )}
    </PuzzleFamilyShell>
  )
}
