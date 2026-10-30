import { useCallback, type FC } from "react"
import { usePuzzleState } from "@/mods/core/app/puzzleState"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import { useFrozenHint } from "@/mods/core/app/useFrozenHint"
import { classifyItemMove, openItems, openFocus, type Decision } from "@/mods/core/app/markMoveEffect"
import {
  canUndoEclipse,
  createEclipseState,
  cycleEclipseCell,
  eclipseSolved,
  undoEclipse,
  type Mark,
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

/** The tap cycle runs empty, sun, moon: a moon is reached through a sun, a sun is reached directly. */
const decisionFor = (target: Mark): Decision<Mark | undefined> => ({
  holds: mark => mark === target,
  follows: (_before, after) => after === target || (target === "moon" && after === "sun"),
})

export const EclipsePuzzle: FC<Props> = ({ puzzle, difficulty, theme, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const [state, setState] = usePuzzleState(() => createEclipseState(puzzle), puzzle)

  // A hint reads the board, and the top rung enumerates every legal filling of every line: derived only once
  // asked for, and held as it was until a move ends it, so one that names several squares keeps naming them.
  const { hint, freeze, drop } = useFrozenHint(() => buildEclipseHint(puzzle, state, puzzle.solution))
  const decisions = new Map([...(hint?.targets ?? [])].map(([cell, target]) => [cell, decisionFor(target)]))
  const open = hint ? openItems(hint.decided, decisions, cell => state.marks[cell]) : undefined

  /**
   * The board finishes itself before the shell is told, as one diagonal sweep across it.
   *
   * The shell freezes the board and starts its banner the moment it hears "solved", so the celebration has to
   * happen BEFORE that word is said (`puzzle-screens.md` §3) — the family reports the solve a beat later, and
   * input is refused for that beat, or a tap could change a mark and land the solve on a board that is no
   * longer solved.
   *
   * One tick per DIAGONAL rather than per square: the sweep is what says "the whole board is right", and a
   * board of forty-nine squares given a tick each would spend the run's whole second on a flicker.
   */
  const finished = eclipseSolved(puzzle, state)
  const diagonals = puzzle.size * 2 - 1
  const celebration = useCelebration(finished, diagonals)
  const wave = finished ? Math.round(celebration.progress * diagonals) : undefined

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
      solved={celebration.done}
      onReset={() => setState(createEclipseState(puzzle))}
      // A tap is its own eraser here, so undo is for stepping back off a run of squares filled on a
      // wrong reading — which is the mistake a board read the wrong way round produces.
      undo={{ onPress: () => setState(undoEclipse(state)), enabled: canUndoEclipse(state) && !finished }}
      hint={hintText}
      onHintRevealed={freeze}
      onHintHidden={drop}
      idleMs={hintIdleDelay(difficulty)}
      title={t("eclipse.name")}
      goal={t("eclipse.goal")}
      rules={<EclipseRules signs={puzzle.links.length > 0} />}
    >
      {({ reportInput, hintVisible }) => (
        <EclipseBoard
          puzzle={puzzle}
          state={state}
          theme={theme}
          highlighted={hintVisible ? hint?.cells : undefined}
          decided={hintVisible ? open : undefined}
          focus={hintVisible && hint && open ? openFocus(hint.focus, open) : undefined}
          wave={wave}
          onTapCell={cell => {
            if (finished) return // the board is finishing; nothing may change under the celebration
            const next = cycleEclipseCell(puzzle, state, cell)
            reportInput(
              hint
                ? classifyItemMove(
                    hint.decided,
                    decisions,
                    next.marks[cell] === state.marks[cell] ? [] : [cell],
                    item => state.marks[item],
                    item => next.marks[item]
                  )
                : "move"
            )
            setState(next)
          }}
        />
      )}
    </PuzzleFamilyShell>
  )
}
