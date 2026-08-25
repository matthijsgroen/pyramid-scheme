import { useState, type FC } from "react"
import clsx from "clsx"
import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { formulaToString } from "@/game/formulas/formulas"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import {
  bitten,
  clearBite,
  createCrossingState,
  resetCrossing,
  stepOnto,
} from "@/mods/trap/game/crocodile/crossingState"
import { isSolved, wantedStep, type CrossingPuzzle, type Sign } from "@/mods/trap/game/crocodile/crossingRules"
import { useTrapProgress } from "@/mods/trap/app/useTrapProgress"
import crocodileOpen from "@/assets/crocodile-250.png"
import crocodileClosed from "@/assets/crocodile-closed-250.png"

type Props = {
  puzzle: CrossingPuzzle
  difficulty?: Difficulty
  onSolved: () => void
  onCancel: () => void
}

const BITE_MS = 900

/**
 * Where a row sits and how big it is drawn, measured in rows from the one being answered.
 *
 * The row in front of the player is always at depth 0 — full size, at the front of the stage, and the
 * only one that has to be read. Rows further into the pit converge toward a vanishing point (each step
 * back covers half the remaining distance) and shrink as they go; rows already crossed slide down past
 * the camera and out of the way. So the board does not shrink to fit five rows — it moves.
 */
const SPACING_VH = 30
const DEPTH_STEP = 0.22
const MIN_DEPTH_SCALE = 0.3
const MAX_DEPTH_SCALE = 1.25

const stackOffset = (depth: number) => SPACING_VH * (1 - Math.pow(0.5, depth))
const stackScale = (depth: number) => Math.min(Math.max(1 - depth * DEPTH_STEP, MIN_DEPTH_SCALE), MAX_DEPTH_SCALE)

/**
 * What this crocodile wants, said in sizes rather than in a direction: three bars, and the one it eats
 * is lit. Biggest lights the tall bar, smallest the short one.
 *
 * An arrow was the first attempt and it read as a direction to walk in — which is the one thing it does
 * not mean. Size is what the rule is actually about, so size is what the mark shows (P2: no words on
 * the board, the same in every locale).
 */
const WantMark: FC<{ sign: Sign; dimmed: boolean }> = ({ sign, dimmed }) => (
  <span className={clsx("flex items-end gap-0.5", dimmed && "opacity-40")}>
    {[8, 14, 20].map(height => {
      const eaten = sign === "biggest" ? height === 20 : height === 8
      return (
        <span
          key={height}
          style={{ height }}
          className={clsx("w-2 rounded-t-sm", eaten ? "bg-amber-200" : "bg-amber-200/20")}
        />
      )
    })}
  </span>
)

export const CrocodilePit: FC<Props> = ({ puzzle, difficulty, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const trap = useTrapProgress()
  const [state, setState] = useState(createCrossingState)
  const { path, bittenAt } = state

  const facing = path.length // the column the player stands in front of, one past the last one crossed
  const wanted = wantedStep(puzzle, path)

  const hint = () =>
    wanted === undefined
      ? undefined
      : t(`crocodile.hint.${puzzle.signs[facing]}`, { value: puzzle.columns[facing][wanted].value })

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={isSolved(puzzle, path)}
      onReset={() => setState(resetCrossing)}
      hint={hint}
      idleMs={hintIdleDelay(difficulty)}
      title={t("crocodile.name")}
      goal={t("crocodile.goal")}
      rules={
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("crocodile.rules.want")}</li>
          <li>{t("crocodile.rules.mark")}</li>
          <li>{t("crocodile.rules.bite")}</li>
        </ul>
      }
    >
      {({ reportInput }) => {
        const tapStone = (column: number, stone: number) => {
          reportInput()
          if (bittenAt || column !== facing) return
          if (stone === wanted) return setState(stepOnto(stone))
          trap.takeTrapDamage()
          setState(bitten(column, stone))
          setTimeout(() => setState(clearBite), BITE_MS)
        }

        return (
          <div className="flex w-full flex-col items-center gap-2">
            <p className="font-pyramid text-lg text-red-300" aria-label={`${trap.currentHealth}/${trap.maxHealth}`}>
              {"❤️".repeat(trap.currentHealth)}
              <span className="opacity-30">{"❤️".repeat(Math.max(trap.maxHealth - trap.currentHealth, 0))}</span>
            </p>

            {/* A STAGE of its own height: every row is positioned against its bottom edge rather than
                stacked in flow, which is what lets the whole pit slide forward a row at a time. */}
            <div className="relative h-[48vh] min-h-80 w-full overflow-hidden rounded-lg bg-gradient-to-b from-blue-950 to-blue-800">
              {/* The far bank, at the top of the screen: the crossing runs away from the camera. */}
              <div className="absolute top-2 left-1/6 h-3 w-2/3 rounded-full bg-amber-700/80" />

              {puzzle.columns
                .map((stones, column) => ({ stones, column }))
                .reverse()
                .map(({ stones, column }) => {
                  // Depth is measured from the row being answered, not from the bank: the pit slides so
                  // that whichever row is next stands at the front, full size and readable, with the rest
                  // of the crossing receding behind it.
                  const depth = column - facing
                  return (
                    <div
                      key={column}
                      className={clsx(
                        "absolute bottom-4 flex w-full flex-col items-center transition-all duration-400",
                        depth < 0 && "opacity-50 blur-[2px]"
                      )}
                      style={{
                        transform: `translateY(${-stackOffset(depth)}vh) scale(${stackScale(depth)})`,
                        transformOrigin: "bottom center",
                      }}
                    >
                      <div
                        // Wrapping rather than clipping: a row is authored to fit (see crocodileConfig),
                        // and if a locale or a font ever makes one wider anyway, it folds instead of
                        // running off the screen — no horizontal scroll, ever (puzzle-screens.md §1).
                        className="flex w-full flex-wrap items-center justify-center gap-1.5"
                      >
                        {stones.map((stone, index) => {
                          const crossed = column < path.length && path[column] === index
                          const standing = crossed && column === path.length - 1
                          const offered = column === facing
                          const bittenHere = bittenAt?.column === column && bittenAt.stone === index
                          return (
                            <button
                              key={index}
                              onClick={() => tapStone(column, index)}
                              disabled={!offered}
                              className={clsx(
                                // Sized off the screen rather than off a pixel guess: three stones a row
                                // have to sit side by side on a 360px phone and still be a 44px tap target.
                                // Only the front row is ever at full size, so this is what a sum is read at.
                                "relative min-h-11 rounded-full border-2 px-2.5 py-2 font-pyramid text-[clamp(0.95rem,4.2vw,1.25rem)] whitespace-nowrap",
                                standing && "border-amber-300 bg-amber-700 text-amber-50 ring-2 ring-amber-200",
                                crossed && !standing && "border-emerald-500 bg-emerald-900 text-emerald-100",
                                !crossed && offered && "border-amber-500 bg-stone-700 text-amber-100 active:scale-95",
                                !crossed && !offered && "border-stone-600 bg-stone-800/70 text-amber-200/50"
                              )}
                            >
                              {formulaToString(stone.formula, {}, "no")}
                              {standing && (
                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xl">🧍</span>
                              )}
                              {bittenHere && (
                                <img
                                  src={crocodileClosed}
                                  alt=""
                                  className="absolute -top-6 left-1/2 w-20 -translate-x-1/2 animate-bounce"
                                />
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* The crocodile guarding THIS row, drawn on the near side of it — the one the player
                        is about to feed — with the mark saying which of its stones it wants. */}
                      <div className={clsx("flex items-center justify-center gap-2 pt-1", depth !== 0 && "opacity-60")}>
                        <img src={crocodileOpen} alt="" className="w-14 -scale-x-100" />
                        <WantMark sign={puzzle.signs[column]} dimmed={depth !== 0} />
                      </div>
                    </div>
                  )
                })}

              {/* The near bank the player starts on, and returns to after a bite. */}
              <div className="absolute bottom-0 left-1/6 h-3 w-2/3 rounded-full bg-amber-700/80" />
            </div>
          </div>
        )
      }}
    </PuzzleFamilyShell>
  )
}
