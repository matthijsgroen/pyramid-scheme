import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import clsx from "clsx"
import { useTranslation } from "react-i18next"
import { useTimeout } from "@/support/useTimeout"
import { HINT_COOLDOWN_MS, useHintAvailability } from "./useHintAvailability"

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
  /** How long a still board waits before the hint button asks to be pressed (see hintIdleDelay). */
  idleMs?: number
  /** The rules of this puzzle, shown under the board — scrolled to, never popped up. */
  rules?: ReactNode
  children: (api: PuzzleShellApi) => ReactNode
}

// The chrome every puzzle family wears: back, reset, hint (with its cooldown and idle nudge), the
// completed banner, and the rules below the board. Families supply the board and their own hint text;
// none of them reimplement the controls (docs/instructions/puzzle-screens.md §3).
export const PuzzleFamilyShell = ({ onSolved, onCancel, solved, onReset, hint, idleMs, rules, children }: Props) => {
  const { t } = useTranslation("common")
  const [solvedBanner, setSolvedBanner] = useState(false)
  const [scheduleSolve, cancelSolve] = useTimeout()
  const { revealed, cooling, nudging, hintsUsed, reveal, reportInput } = useHintAvailability(idleMs)

  // The board is frozen the moment it is solved, not when the banner arrives: the pause before it is
  // long enough to tap a cell, and a tap there un-solved the puzzle while the win was already on its
  // way — finishing a board the player had just broken.
  const [finishing, setFinishing] = useState(false)

  const handleSolved = useCallback(() => {
    setFinishing(true)
    scheduleSolve(800, () => {
      setSolvedBanner(true)
      scheduleSolve(1500, onSolved)
    })
  }, [scheduleSolve, onSolved])

  useEffect(() => {
    if (solved) handleSolved()
  }, [solved, handleSolved])

  // A board that fills the screen pushes the hint under the fold, where pressing the button looks
  // like it did nothing. Scrolled to on reveal only — not on every recomputed hint — so the view
  // never yanks while the player is working.
  const hintRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (revealed) hintRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [revealed])

  return (
    <>
      {!finishing && (
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
              className={clsx("relative overflow-hidden rounded px-2 py-1 text-sm", {
                "bg-amber-700 text-amber-100 hover:bg-amber-600": !cooling && !nudging,
                "bg-amber-700 text-amber-100 ring-2 ring-amber-300 motion-safe:animate-pulse": nudging && !cooling,
                "bg-stone-800 text-stone-500": cooling,
              })}
            >
              {/* The wait made visible: the bar reaches the far edge as the button unlocks. */}
              {cooling && (
                <span
                  className="absolute inset-0 origin-left animate-hint-recharge bg-amber-900"
                  style={{ animationDuration: `${HINT_COOLDOWN_MS}ms` }}
                />
              )}
              <span className="relative">💡 {t("ui.hint")}</span>
            </button>
          )}
        </div>
      )}
      <div inert={finishing} className={clsx("flex w-full flex-col items-center gap-4", finishing && "opacity-90")}>
        {children({ solved: handleSolved, reportInput, hintVisible: revealed && !!hint })}
      </div>
      {revealed && hint && !solvedBanner && (
        <p
          ref={hintRef}
          className="w-full rounded border border-amber-800 bg-amber-950/60 p-2 text-center text-sm text-amber-200"
        >
          {hint}
        </p>
      )}
      {rules && !solvedBanner && (
        <div className="w-full border-t border-stone-700 pt-3 text-sm text-stone-400">
          <h3 className="mb-1 font-pyramid text-stone-300">{t("ui.howToPlay")}</h3>
          {rules}
        </div>
      )}
      {solvedBanner && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-stone-900/90">
          <p className="font-pyramid text-xl text-amber-300">{t("ui.puzzleCompleted")}</p>
          {/* Solving it unaided is worth saying out loud — otherwise there is nothing to lose by
              leaning on the hint button, and nothing to notice the day you stop needing it. */}
          <p className="text-sm text-stone-400">
            {hintsUsed === 0 ? t("ui.solvedUnaided") : t("ui.solvedWithHints", { count: hintsUsed })}
          </p>
        </div>
      )}
    </>
  )
}
