import { useCallback, useEffect, useState, type ReactNode } from "react"
import clsx from "clsx"
import { useTranslation } from "react-i18next"
import { useTimeout } from "@/support/useTimeout"
import { useHintAvailability } from "./useHintAvailability"

export type PuzzleShellApi = {
  /** Call when the board reaches its solved state. */
  solved: () => void
  /** Call on every player action, so the idle nudge and the stale hint clear. */
  reportInput: () => void
  /** True while the hint is on screen — families highlight the cells it names. */
  hintVisible: boolean
}

type Props = {
  onSolved: () => void
  onCancel: () => void
  /** For families whose win state is derived from the board rather than raised as an event. */
  solved?: boolean
  /** Restores the board's start state. Omit for families with nothing to reset. */
  onReset?: () => void
  /** The next step, already phrased. Recomputed by the family as the board changes. */
  hint?: string
  /** The rules of this puzzle, shown under the board — scrolled to, never popped up. */
  rules?: ReactNode
  children: (api: PuzzleShellApi) => ReactNode
}

// The chrome every puzzle family wears: back, reset, hint (with its cooldown and idle nudge), the
// completed banner, and the rules below the board. Families supply the board and their own hint text;
// none of them reimplement the controls (docs/instructions/puzzle-screens.md §3).
export const PuzzleFamilyShell = ({ onSolved, onCancel, solved, onReset, hint, rules, children }: Props) => {
  const { t } = useTranslation("common")
  const [solvedBanner, setSolvedBanner] = useState(false)
  const [scheduleSolve, cancelSolve] = useTimeout()
  const { revealed, cooling, nudging, reveal, reportInput } = useHintAvailability()

  const handleSolved = useCallback(() => {
    scheduleSolve(800, () => {
      setSolvedBanner(true)
      scheduleSolve(1500, onSolved)
    })
  }, [scheduleSolve, onSolved])

  useEffect(() => {
    if (solved) handleSolved()
  }, [solved, handleSolved])

  return (
    <>
      {!solvedBanner && (
        <div className="flex w-full items-center gap-2">
          <button
            onClick={() => {
              cancelSolve()
              onCancel()
            }}
            className="rounded px-2 py-1 text-sm text-stone-300 hover:bg-stone-800"
          >
            ← {t("ui.backToMap")}
          </button>
          <div className="flex-1" />
          {onReset && (
            <button
              onClick={() => {
                reportInput()
                onReset()
              }}
              className="rounded px-2 py-1 text-sm text-stone-300 hover:bg-stone-800"
            >
              {t("ui.resetPuzzle")}
            </button>
          )}
          {hint && (
            <button
              onClick={reveal}
              disabled={cooling}
              className={clsx("rounded px-2 py-1 text-sm", {
                "bg-amber-700 text-amber-100 hover:bg-amber-600": !cooling && !nudging,
                "bg-amber-700 text-amber-100 ring-2 ring-amber-300 motion-safe:animate-pulse": nudging && !cooling,
                "bg-stone-800 text-stone-500": cooling,
              })}
            >
              💡 {t("ui.hint")}
            </button>
          )}
        </div>
      )}
      {children({ solved: handleSolved, reportInput, hintVisible: revealed && !!hint })}
      {revealed && hint && !solvedBanner && (
        <p className="max-w-xs rounded border border-amber-800 bg-amber-950/60 p-2 text-center text-sm text-amber-200">
          {hint}
        </p>
      )}
      {rules && !solvedBanner && (
        <div className="max-w-xs border-t border-stone-700 pt-3 text-sm text-stone-400">
          <h3 className="mb-1 font-pyramid text-stone-300">{t("ui.howToPlay")}</h3>
          {rules}
        </div>
      )}
      {solvedBanner && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-stone-900/90">
          <p className="font-pyramid text-xl text-amber-300">{t("ui.puzzleCompleted")}</p>
        </div>
      )}
    </>
  )
}
