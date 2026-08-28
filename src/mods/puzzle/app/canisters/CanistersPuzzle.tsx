import { useMemo, useState, type FC } from "react"
import { Trans, useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import {
  applyMove,
  volumeKey,
  type CanistersPuzzle as CanistersPuzzleData,
} from "@/mods/puzzle/game/canisters/canisters"
import { CANISTERS_LEVELS } from "@/mods/puzzle/game/canisters/canistersConfig"
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
  const levels = CANISTERS_LEVELS[difficulty ?? "starter"]
  const [state, setState] = useState(() => createCanistersState(puzzle))

  const solved = isCanistersSolved(puzzle, state)
  const left = movesLeft(puzzle, state)

  /**
   * The states this line has already stood in, which is what makes a pour not worth making (§4). Kept here
   * rather than in the board state because it is a fact about the hint, not about the puzzle.
   */
  const seen = useMemo(() => {
    const keys = new Set<string>()
    let volumes = [...puzzle.start]
    keys.add(volumeKey(volumes))
    for (const move of state.poured) {
      volumes = [...applyMove(puzzle.capacities, volumes, move)]
      keys.add(volumeKey(volumes))
    }
    return keys
  }, [state.poured, puzzle.capacities, puzzle.start])

  const hint = useMemo(() => buildCanistersHint(puzzle, state.volumes, seen, left), [puzzle, state.volumes, seen, left])

  // One tick a leg: what the player measured lights in the order it was claimed, which is the board saying
  // back what was done rather than a generic flourish (puzzle-screens.md §3).
  const celebration = useCelebration(solved, puzzle.targets.length)

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => setState(createCanistersState(puzzle))}
      hint={t(`canisters.hint.${hint.key}`)}
      idleMs={hintIdleDelay(difficulty)}
      title={t(`canisters.name.${skin.name}`)}
      // The amount asked for is the one number on this screen the player must not misread, so it is set
      // apart rather than left in the run of the sentence. `Trans` keeps where it falls the translator's
      // call: Dutch puts it before the verb and English after it.
      goal={
        <Trans
          i18nKey={`canisters.goal.${skin.name}`}
          values={{ target: puzzle.targets[Math.min(state.measured, puzzle.targets.length - 1)] }}
          components={{ amount: <strong className="text-amber-200" /> }}
        />
      }
      rules={<CanistersRules skin={skin.name} legs={puzzle.targets.length} levels={levels} />}
    >
      {({ reportInput, hintVisible }) => (
        <div className="flex flex-col items-center gap-3">
          <CanistersBoard
            capacities={puzzle.capacities}
            volumes={state.volumes}
            held={state.held}
            claimed={state.claimed}
            lit={hintVisible ? hint.move : undefined}
            celebrating={celebration.progress > 0}
            levels={levels}
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
            {puzzle.targets.length > 1 && (
              <span className="text-stone-400">
                {t("canisters.legs", { done: state.measured, total: puzzle.targets.length })}
              </span>
            )}
            <button onClick={() => setState(undoPour)} className="text-stone-300 underline underline-offset-2">
              {t("canisters.undo")}
            </button>
          </div>
        </div>
      )}
    </PuzzleFamilyShell>
  )
}
