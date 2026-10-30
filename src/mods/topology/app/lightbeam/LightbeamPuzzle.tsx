import { useCallback, type FC } from "react"
import { usePuzzleState } from "@/mods/core/app/puzzleState"
import { useTranslation } from "react-i18next"
import { LightbeamBoard } from "@/mods/topology/app/lightbeam/LightbeamBoard"
import { LightbeamRules } from "@/mods/topology/app/lightbeam/LightbeamRules"
import { lightbeamHintSteps, pickLightbeamHint } from "@/mods/topology/app/lightbeam/lightbeamHint"
import { isLit } from "@/mods/topology/game/lightbeam/beam"
import type { LightbeamPuzzle as LightbeamPuzzleData } from "@/mods/topology/game/lightbeam/generateLightbeam"
import { createLightbeamState, cycleLightbeamPiece } from "@/mods/topology/game/lightbeam/lightbeamState"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { useFrozenHint } from "@/mods/core/app/useFrozenHint"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import type { Difficulty } from "@/data/difficultyLevels"

type Props = {
  puzzle: LightbeamPuzzleData
  difficulty?: Difficulty
  onSolved: () => void
  onCancel: () => void
}

const stepsCache = new WeakMap<LightbeamPuzzleData, ReturnType<typeof lightbeamHintSteps>>()
const stepsFor = (puzzle: LightbeamPuzzleData) => {
  const known = stepsCache.get(puzzle)
  if (known) return known
  const steps = lightbeamHintSteps(puzzle)
  stepsCache.set(puzzle, steps)
  return steps
}

// One gesture and no undo, which is the whole control scheme: a tap cycles a piece, and tapping round
// again puts it back (design doc §7). There is no pad, no eraser and nothing to take back, so this screen
// is the shell, the board, and nothing in between.
export const LightbeamPuzzle: FC<Props> = ({ puzzle, difficulty, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const [state, setState] = usePuzzleState(() => createLightbeamState(puzzle), puzzle)

  const solved = isLit(puzzle, state.states)

  /**
   * The light runs to the shrine before the shell is told the board is lit.
   *
   * A thicker beam travels the route it just proved, and the shrine flares once it arrives — the board saying
   * what the player did, in the terms the board is already made of. The shell freezes on "solved", so this
   * has to finish first (docs/instructions/puzzle-screens.md §3): sixteen ticks is a smooth enough sweep for
   * a route, and a tap is refused while it runs, or a piece cycled mid-run would unlight the board its own
   * win is travelling along.
   */
  const celebration = useCelebration(solved, 16)

  // The solve is a pure function of the puzzle and a full solve of the top tier costs ~600ms, so it is kept
  // per puzzle and paid for by the first hint only. Nothing is solved before the player asks: deriving a
  // hint as the board changed cost 185ms a tap against 19ms.
  const { hint, freeze, drop } = useFrozenHint(() => pickLightbeamHint(puzzle, stepsFor(puzzle), state.states))

  // A function rather than a string, so the shell only reaches for the text once the hint is on screen — and so
  // the button is offered before there is anything to say (see `PuzzleFamilyShell`'s `hint`).
  const hintText = useCallback(() => hint && t(`lightbeam.hint.${hint.key}`), [hint, t])

  const cycle = useCallback(
    (piece: number) => {
      if (solved) return // the light is on its way to the shrine; nothing may move under it
      setState(prev => cycleLightbeamPiece(prev, puzzle, piece))
    },
    [puzzle, solved, setState]
  )

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => setState(createLightbeamState(puzzle))}
      hint={solved ? undefined : hintText}
      onHintRevealed={freeze}
      onHintHidden={drop}
      idleMs={hintIdleDelay(difficulty)}
      title={t("lightbeam.name")}
      goal={t("lightbeam.goal")}
      rules={<LightbeamRules puzzle={puzzle} />}
    >
      {({ reportInput, hintVisible }) => (
        <LightbeamBoard
          puzzle={puzzle}
          states={state.states}
          highlighted={hintVisible ? hint?.cells : undefined}
          litBeam={hintVisible ? hint?.beam : undefined}
          surge={celebration.progress}
          onCycle={piece => {
            reportInput()
            cycle(piece)
          }}
        />
      )}
    </PuzzleFamilyShell>
  )
}
