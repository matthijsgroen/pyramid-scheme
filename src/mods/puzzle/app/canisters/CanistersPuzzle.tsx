import { useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import type { CanistersPuzzle as CanistersPuzzleData } from "@/mods/puzzle/game/canisters/canisters"
import {
  claimCanister,
  createCanistersState,
  holdCanister,
  isCanistersSolved,
  movesLeft,
  pourInto,
  undoPour,
} from "@/mods/puzzle/game/canisters/canistersState"
import { CanistersBoard } from "./CanistersBoard"
import { CanistersRules } from "./CanistersRules"
import { buildCanistersHint } from "./canistersHint"
import { skinFor } from "./skins"

type Props = {
  puzzle: CanistersPuzzleData
  difficulty?: Difficulty
  /** The pool this room was allocated for — which place it is (`puzzle-screens.md` §2). */
  role?: string | string[]
  /** The hour its site authored. */
  theme?: string
  onSolved: () => void
  onCancel: () => void
}

export const CanistersPuzzle: FC<Props> = ({ puzzle, difficulty, role, theme, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const skin = skinFor(role, theme)
  const [state, setState] = useState(() => createCanistersState(puzzle))

  const solved = isCanistersSolved(puzzle, state)
  const left = movesLeft(puzzle, state)
  /** The amount this leg is asking for; the last one stays up once the board is done. */
  const wanted = puzzle.targets[Math.min(state.measured, puzzle.targets.length - 1)]

  const hint = useMemo(
    () => buildCanistersHint(puzzle, state.volumes, left, wanted),
    [puzzle, state.volumes, left, wanted]
  )

  // One tick a leg: what the player measured lights in the order it was claimed, which is the board saying
  // back what was done rather than a generic flourish (puzzle-screens.md §3).
  const celebration = useCelebration(solved, puzzle.targets.length)

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => setState(createCanistersState(puzzle))}
      hint={t(`canisters.hint.${hint.key}`, hint.params)}
      idleMs={hintIdleDelay(difficulty)}
      title={t(`canisters.name.${skin.name}`)}
      // **The goal says what the board is for; the amount lives above the board.** Naming the number here
      // read as a fixed instruction, and on a board that asks for several in turn the sentence quietly
      // changed under the player. Up there it is a figure that visibly ticks over as each leg is claimed.
      goal={t(`canisters.goal.${skin.name}`, { count: puzzle.targets.length })}
      rules={<CanistersRules skin={skin.name} legs={puzzle.targets.length} />}
    >
      {({ reportInput, hintVisible }) => (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-stone-300">{t("canisters.wanted")}</span>
            <span className="text-3xl leading-none font-semibold text-amber-200">{wanted}</span>
            {puzzle.targets.length > 1 && (
              <span className="text-xs text-stone-400">
                {t("canisters.legs", { done: state.measured, total: puzzle.targets.length })}
              </span>
            )}
          </div>
          <CanistersBoard
            capacities={puzzle.capacities}
            volumes={state.volumes}
            held={state.held}
            claimed={state.claimed}
            lit={hintVisible ? hint.move : undefined}
            celebrating={celebration.progress > 0}
            lastPour={
              state.poured.length > 0
                ? { ...state.poured[state.poured.length - 1], count: state.poured.length }
                : undefined
            }
            skin={skin}
            onHold={canister => {
              reportInput()
              setState(current => holdCanister(current, canister))
            }}
            onPour={to => {
              reportInput()
              setState(current => pourInto(current, puzzle, to))
            }}
            onClaim={canister => {
              reportInput()
              setState(current => claimCanister(current, puzzle, canister))
            }}
          />
          {/* The budget IS the puzzle (§2), so it is on screen rather than in a menu. Every part of this row
              carries its own colour: the shell's ground is dark, and text with no colour of its own comes
              out black on it. */}
          <div className="flex items-center gap-4 text-sm text-stone-300">
            <span className={left <= 0 ? "text-rose-400" : "text-stone-200"}>
              {t("canisters.movesLeft", { count: Math.max(left, 0) })}
            </span>
            <button onClick={() => setState(undoPour)} className="text-stone-300 underline underline-offset-2">
              {t("canisters.undo")}
            </button>
          </div>
        </div>
      )}
    </PuzzleFamilyShell>
  )
}
