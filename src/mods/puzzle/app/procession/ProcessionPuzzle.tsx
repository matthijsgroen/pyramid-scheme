import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import {
  brokenMarks,
  createProcessionState,
  processionSolved,
  slideBar,
  type ProcessionPuzzle as ProcessionPuzzleData,
} from "@/mods/puzzle/game/procession/procession"
import { buildProcessionHint } from "./processionHint"
import { ProcessionBoard } from "./ProcessionBoard"
import { ProcessionRules } from "./ProcessionRules"
import { skinFor } from "./skins"

type Props = {
  puzzle: ProcessionPuzzleData
  difficulty?: Difficulty
  /** The pool this room was drawn from — which place it is (docs/instructions/puzzle-screens.md §2). */
  role?: string | string[]
  /** The ambience its site authored, or a skin named outright. */
  theme?: string
  onSolved: () => void
  onCancel: () => void
}

export const ProcessionPuzzle: FC<Props> = ({ puzzle, difficulty, role, theme, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const skin = skinFor(role, theme)
  /**
   * Where the bars stand, and nothing else.
   *
   * **No move history, deliberately** — the control rush hour needs and this one does not. A shove there is
   * a commitment three moves deep; here a bar is dragged straight back to where it was, so an undo button
   * would be a second way to do what the board already does.
   */
  const [state, setState] = useState(() => createProcessionState(puzzle))
  const [focus, setFocus] = useState<number | undefined>()

  const [asked, setAsked] = useState(false)
  const hint = useMemo(() => (asked ? buildProcessionHint(puzzle, state) : undefined), [asked, puzzle, state])

  const finished = processionSolved(puzzle, state)
  const celebration = useCelebration(finished, 1)

  // Per face where a face has its own words, and the plain day's where it has not — the rungs argue about
  // hours and lengths, which read the same over a burial as over a night sky.
  const hintText = useCallback(() => {
    if (!hint) return undefined
    const line = (id: string) => t([`procession.hint.${skin.name}.${id}`, `procession.hint.default.${id}`])
    return `${line(hint.rung)}\n${line("move")}`
  }, [hint, skin, t])

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => {
        setState(createProcessionState(puzzle))
        setFocus(undefined)
      }}
      hint={hintText}
      onHintRevealed={() => setAsked(true)}
      idleMs={hintIdleDelay(difficulty)}
      title={t(`procession.name.${skin.name}`)}
      goal={t(`procession.goal.${skin.name}`)}
      rules={<ProcessionRules skin={skin.name} />}
    >
      {({ reportInput, hintVisible }) => (
        <ProcessionBoard
          puzzle={puzzle}
          state={state}
          skin={skin}
          broken={brokenMarks(puzzle, state)}
          focus={focus}
          onFocus={mark => {
            reportInput()
            setFocus(mark)
          }}
          hintBar={hintVisible ? hint?.bar : undefined}
          hintTick={hintVisible ? hint?.tick : undefined}
          solved={finished}
          onSlide={(index, start) => {
            if (finished) return
            const moved = slideBar(puzzle, state, index, start)
            if (moved === state) return
            reportInput()
            setState(moved)
          }}
        />
      )}
    </PuzzleFamilyShell>
  )
}
