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
  canUndoPour,
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
  // The board's own shape, so a role with several places picks the same one for this room every time and a
  // different one for the room next door (`skins.ts`).
  const shape = [...puzzle.capacities, ...puzzle.start, ...puzzle.targets].reduce(
    (hash, value) => (hash * 31 + value) | 0,
    7
  )
  const skin = skinFor(role, theme, shape)
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
      // Undo gives the MOVE back as well as the pour (`undoPour`), so on this board it is the way out of a
      // budget spent on a wrong reading — not merely a convenience.
      undo={{ onPress: () => setState(undoPour), enabled: canUndoPour(state) && !solved }}
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
          {/* The budget IS the puzzle (§2), so it is on screen rather than in a menu — and it is board
              state, not a control, which is why it reads as a line under the board and not as part of the
              shell's control row.

              **The warning arrives while it can still be acted on.** It used to turn red at zero, which is
              a board already dead: the pours are spent, and the only moves left are undo and reset. Amber
              from two out says the same thing early enough to change the plan. */}
          <div className="flex flex-col items-center gap-1 text-sm">
            <span className={left <= 0 ? "text-rose-400" : left <= 2 ? "text-amber-300" : "text-stone-200"}>
              {t("canisters.movesLeft", { count: Math.max(left, 0) })}
            </span>
            {/* A spent budget refuses pours in silence (`pourInto`) — a tap that does nothing and says
                nothing. The same sentence the hint gives, said without having to ask for it. */}
            {left <= 0 && !solved && (
              <span className="text-center text-rose-300">{t("canisters.hint.overBudget")}</span>
            )}
          </div>
        </div>
      )}
    </PuzzleFamilyShell>
  )
}
