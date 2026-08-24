import { useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import { computeBalanceLines, isBalanceSolved } from "@/mods/puzzle/game/balanceScale/balanceStatus"
import {
  applySwap,
  createBalanceState,
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

type Props = {
  puzzle: BalancePuzzleData
  difficulty?: Difficulty
  onSolved: () => void
  onCancel: () => void
}

export const BalancePuzzle: FC<Props> = ({ puzzle, difficulty, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const { glyphs, scales, maxValue, solution, techniqueCap } = puzzle
  const [state, setState] = useState(() => createBalanceState(glyphs))

  const lines = computeBalanceLines(scales, state.values)
  const board = useMemo(
    () => ({ glyphs, scales, maxValue, cancelling: puzzle.cancelling }),
    [glyphs, scales, maxValue, puzzle.cancelling]
  )
  // What this board lets the player do, which the tier decides: cancelling is off where taking
  // things off both pans would do the puzzle's own arithmetic (design doc §5).
  const moves = { cancelling: puzzle.cancelling !== false, swapping: techniqueCap === "swap" }

  const hint = useMemo(
    () => buildBalanceHint(board, state.values, state.notes, solution, techniqueCap),
    [board, state.values, state.notes, solution, techniqueCap]
  )

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

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => setState(createBalanceState(glyphs))}
      hint={hint && t(`balance.hint.${hint.key}`, hint.params)}
      idleMs={hintIdleDelay(difficulty)}
      title={t("balance.name")}
      goal={t("balance.goal")}
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
          swapSources={sources.map(source => source.ref)}
          celebrated={celebrated}
          swapPrompt={
            state.pending &&
            t(sources.length ? "balance.swap.pick" : "balance.swap.none", { glyph: state.pending.glyph })
          }
          onSelectGlyph={glyph => {
            if (finished) return // the board is finishing; nothing may change under the celebration
            reportInput()
            setState(prev => selectGlyph(prev, glyph))
          }}
          onPickWeight={value => {
            if (finished) return
            reportInput()
            setState(prev => setWeight(prev, glyphs, value))
          }}
          onTapPiece={(ref, pan, index) => {
            if (finished) return
            reportInput()
            setState(prev => tapPiece(prev, board, ref, pan, index))
          }}
          onTapRow={ref => {
            if (finished) return
            const source = sources.find(
              candidate => candidate.ref.kind === ref.kind && candidate.ref.index === ref.index
            )
            if (!source) return
            reportInput()
            setState(prev => applySwap(prev, source.note))
          }}
          onRemoveNote={index => {
            if (finished) return
            reportInput()
            setState(prev => removeNote(prev, index))
          }}
        />
      )}
    </PuzzleFamilyShell>
  )
}
