import { useCallback, type FC } from "react"
import { usePuzzleState } from "@/mods/core/app/puzzleState"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import { useFrozenHint } from "@/mods/core/app/useFrozenHint"
import { classifyItemMove, openFocus, openItems, type Decision } from "@/mods/core/app/markMoveEffect"
import {
  canUndoConstellation,
  constellationSolved,
  createConstellationState,
  cycleConstellationLine,
  MAX_LINES,
  undoConstellation,
} from "@/mods/puzzle/game/constellation/constellation"
import type { ConstellationPuzzleWithAnswer } from "@/mods/puzzle/game/constellation/generateConstellation"
import { ConstellationBoard } from "./ConstellationBoard"
import { skinFor } from "./skins"

import { buildConstellationHint, type ConstellationHint } from "./constellationHint"
import { ConstellationRules } from "./ConstellationRules"

/**
 * What a pair is held to. A pair that must be drawn is carried out by lines towards its floor, never past its
 * ceiling. A pair that is only barred or capped holds from the start, so there is nothing to carry out: it
 * stays marked while the hint is up, and any change to it ends the hint.
 */
const decisionFor = ({ min = 0, max = MAX_LINES }: { min?: number; max?: number }): Decision<number> => ({
  holds: lines => lines >= min && lines <= max,
  follows: (before, after) => min > 0 && after > before && after <= max,
})

const toDo = (hint: ConstellationHint) => hint.bounds.filter(bound => (bound.min ?? 0) > 0).map(bound => bound.pair)

type Props = {
  puzzle: ConstellationPuzzleWithAnswer
  difficulty?: Difficulty
  /** The ambience the site authored, or a skin named outright (docs/game-design/puzzles/constellation.md §9). */
  theme?: string
  /** Which room this is, so an undressed one still draws a face of its own (faceFor.ts). */
  room?: string
  /** The role this room was allocated for — what decides which of this family’s places it is. */
  role?: string | string[]
  onSolved: () => void
  onCancel: () => void
}

export const ConstellationPuzzle: FC<Props> = ({ puzzle, difficulty, theme, role, room, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  // Which place this room is. The goal and the rules are both worded from it, so they are resolved once.
  const { name: skin } = skinFor(role, theme, 0, room)
  const [state, setState] = usePuzzleState(() => createConstellationState(puzzle), puzzle)

  // The top rung walks groups across the whole board: derived only once asked for, and held as it was until a
  // move ends it, so a hint that names several lines keeps naming the same ones while they are drawn.
  const { hint, freeze, drop } = useFrozenHint(() => buildConstellationHint(puzzle, state))
  const decisions = new Map((hint?.bounds ?? []).map(bound => [bound.pair, decisionFor(bound)]))
  const open = hint ? openItems(toDo(hint), decisions, pair => state.lines[pair]) : undefined
  // Every pair stays marked except a line already drawn as the hint asked.
  const shown =
    hint && open ? new Set([...hint.pairs].filter(pair => open.has(pair) || !toDo(hint).includes(pair))) : undefined
  const focus = hint && shown ? openFocus(hint.focus, shown) : undefined

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
      // A drag gives one pair back, so undo is for stepping back off a run of lines drawn on a wrong reading.
      undo={{ onPress: () => setState(undoConstellation), enabled: canUndoConstellation(state) && !finished }}
      hint={hintText}
      onHintRevealed={freeze}
      onHintHidden={drop}
      idleMs={hintIdleDelay(difficulty)}
      title={t(`constellation.name.${skin}`)}
      goal={t(`constellation.goal.${skin}`)}
      rules={<ConstellationRules skin={skin} />}
    >
      {({ reportInput, hintVisible }) => (
        <ConstellationBoard
          puzzle={puzzle}
          state={state}
          highlighted={hintVisible ? shown : undefined}
          focus={hintVisible ? focus : undefined}
          litStars={hintVisible ? hint?.stars : undefined}
          theme={theme}
          role={role}
          room={room}
          celebrated={celebrated}
          onDrawLine={pair => {
            if (finished) return // the board is finishing; nothing may change under the celebration
            const next = cycleConstellationLine(puzzle, state, pair)
            reportInput(
              hint
                ? classifyItemMove(
                    toDo(hint),
                    decisions,
                    next.lines[pair] === state.lines[pair] ? [] : [pair],
                    item => state.lines[item],
                    item => next.lines[item]
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
