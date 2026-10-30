import { useMemo, type FC } from "react"
import { usePuzzleState } from "@/mods/core/app/puzzleState"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { useFrozenHint } from "@/mods/core/app/useFrozenHint"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import { computeBalanceLines, isBalanceSolved } from "@/mods/puzzle/game/balanceScale/balanceStatus"
import {
  applySwap,
  createBalanceState,
  type BalanceState,
  removeNote,
  selectGlyph,
  setWeight,
  swapSources,
  tapPiece,
} from "@/mods/puzzle/game/balanceScale/balanceState"
import type { BalancePuzzle as BalancePuzzleData } from "@/mods/puzzle/game/balanceScale/generateBalance"
import { hasTwinnedPiece } from "@/mods/puzzle/game/balanceScale/techniques"
import { BalanceBoard } from "./BalanceBoard"
import { BalanceRules } from "./BalanceRules"
import { buildBalanceHint } from "./balanceHint"
import { skinFor } from "./skins"

type Props = {
  puzzle: BalancePuzzleData
  difficulty?: Difficulty
  /** The pool this room was allocated for — which place it is (`puzzle-screens.md` §2). */
  role?: string | string[]
  /** The hour its site authored. */
  theme?: string
  /** Which room this is, so an undressed one still draws a face of its own (faceFor.ts). */
  room?: string
  onSolved: () => void
  onCancel: () => void
}

/** The hint's only slot is the piece it is about, so this is the whole of dressing a hint. */
const symbolise = (params: { glyph?: string }, symbol: (glyph: string) => string) =>
  params.glyph === undefined ? params : { ...params, glyph: symbol(params.glyph) }

export const BalancePuzzle: FC<Props> = ({ puzzle, difficulty, role, theme, room, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const skin = skinFor(role, theme, 0, room)
  const { glyphs, scales, maxValue, solution, techniqueCap } = puzzle
  const [state, setState] = usePuzzleState(() => createBalanceState(glyphs), puzzle)

  const lines = computeBalanceLines(scales, state.values)
  const board = useMemo(
    () => ({ glyphs, scales, maxValue, cancelling: puzzle.cancelling }),
    [glyphs, scales, maxValue, puzzle.cancelling]
  )
  // What this board lets the player do, which the tier decides: cancelling is off where taking
  // things off both pans would do the puzzle's own arithmetic (design doc §5).
  const moves = { cancelling: puzzle.cancelling !== false, swapping: techniqueCap === "swap" }

  // Derived on every change: whether there is a hint at all is what shows the button. What the player is
  // shown is the one from the moment they asked, held until a move changes a weight or a note.
  const available = useMemo(
    () => buildBalanceHint(board, state.values, state.notes, solution, techniqueCap),
    [board, state.values, state.notes, solution, techniqueCap]
  )
  const { hint, freeze, drop } = useFrozenHint(() => available)

  /**
   * The scales settle one at a time before the shell is told, top to bottom.
   *
   * The shell freezes the board and starts its banner the moment it hears "solved", so the celebration has to
   * happen BEFORE that word is said (`puzzle-screens.md` §3) — the family reports the solve a beat later.
   * Input is refused for that beat, or a weight changed mid-run would land a solve on a board that is no
   * longer solved.
   */
  const finished = isBalanceSolved(glyphs, lines, state.values)
  // One tick per scale, so the beams come level in the order they are read.
  const celebration = useCelebration(finished, scales.length)
  const celebrated = new Set(
    Array.from({ length: Math.round(celebration.progress * scales.length) }, (_unused, index) => index)
  )

  // Which scales and notes can answer the glyph the player tapped — recomputed rather than stored,
  // so the offer can never survive the board changing underneath it.
  const sources = useMemo(() => swapSources(board, state), [board, state])

  // A tap that only arms a piece for a swap, or does nothing, leaves every weight and note as it was, and
  // that is no reason to take a hint down.
  const apply = (reportInput: (effect?: "move" | "look") => void, next: BalanceState) => {
    reportInput(next.values === state.values && next.notes === state.notes ? "look" : "move")
    setState(next)
  }

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => setState(createBalanceState(glyphs))}
      // **The hint names a piece by the symbol the board is drawing**, so it goes through the face too. A
      // sentence that typed the generator's own glyph while the board drew this room's would be pointing at
      // something not on screen — the trap sudoku's signs already paid for.
      hint={available && (() => hint && t(`balance.hint.${hint.key}`, symbolise(hint.params, skin.symbol)))}
      onHintRevealed={freeze}
      onHintHidden={drop}
      idleMs={hintIdleDelay(difficulty)}
      title={t(`balance.name.${skin.name}`)}
      goal={t(`balance.goal.${skin.name}`)}
      rules={
        <BalanceRules
          manyRows={scales.length > 1}
          cancelling={moves.cancelling && scales.some(hasTwinnedPiece)}
          swapping={moves.swapping}
        />
      }
    >
      {({ reportInput, hintVisible }) => (
        <BalanceBoard
          scales={scales}
          lines={lines}
          notes={state.notes}
          glyphs={glyphs}
          values={state.values}
          selected={state.selected}
          maxValue={maxValue}
          highlighted={hintVisible ? hint?.glyph : undefined}
          litRefs={hintVisible ? hint?.refs : undefined}
          pending={state.pending}
          moves={moves}
          symbol={skin.symbol}
          swapSources={sources.map(source => source.ref)}
          celebrated={celebrated}
          swapPrompt={
            state.pending &&
            t(sources.length ? "balance.swap.pick" : "balance.swap.none", { glyph: state.pending.glyph })
          }
          onSelectGlyph={glyph => {
            if (finished) return // the board is finishing; nothing may change under the celebration
            reportInput("look")
            setState(prev => selectGlyph(prev, glyph))
          }}
          onPickWeight={value => {
            if (finished) return
            apply(reportInput, setWeight(state, glyphs, value))
          }}
          onTapPiece={(ref, pan, index) => {
            if (finished) return
            apply(reportInput, tapPiece(state, board, ref, pan, index))
          }}
          onTapRow={ref => {
            if (finished) return
            const source = sources.find(
              candidate => candidate.ref.kind === ref.kind && candidate.ref.index === ref.index
            )
            if (!source) return
            apply(reportInput, applySwap(state, source.note))
          }}
          onRemoveNote={index => {
            if (finished) return
            apply(reportInput, removeNote(state, index))
          }}
        />
      )}
    </PuzzleFamilyShell>
  )
}
