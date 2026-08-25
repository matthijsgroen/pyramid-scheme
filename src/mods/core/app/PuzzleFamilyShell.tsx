import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import clsx from "clsx"
import { useTranslation } from "react-i18next"
import { useTimeout } from "@/support/useTimeout"
import { useVisibleElapsed } from "@/support/useVisibleElapsed"
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
  /**
   * The next step, already phrased — or a function that phrases it.
   *
   * **Pass a function when deriving the hint is expensive**, and it will only be called once the player asks.
   * A hint comes out of the family's technique solver, and for some families that is a full solve of the board:
   * lightbeam's top tier enumerates tens of thousands of configurations for one, which is half a second on a
   * development machine and much worse on a phone. Computed eagerly on every board change, that lands on every
   * single tap as input lag, for a string nobody has asked to read.
   *
   * Presence still decides whether the button appears, so a family with no hint to give passes `undefined` —
   * a function is always present.
   */
  hint?: string | (() => string | undefined)
  /** How long a still board waits before the hint button asks to be pressed (see hintIdleDelay). */
  idleMs?: number
  /** Fired when the player asks for the hint — families use it to aim the board at what it names. */
  onHintRevealed?: () => void
  /**
   * One sentence: what a finished board looks like, shown above the rules.
   *
   * Split out of the rules list because it answers a different question. The rules say what is allowed and
   * which tap does what; the goal says what the player is trying to end up with, and reading five bullets to
   * work that out is reading five bullets too many. A family whose mechanic wears more than one identity
   * words this per identity — a star map and a haul-road network are not aiming at the same thing, even
   * though the board underneath them is.
   */
  goal?: ReactNode
  /**
   * What this room is CALLED, shown over the board with the tier beside it.
   *
   * A board is recognisable by its shape once it is open, and not at all before that — a floor of rooms,
   * or a list of them, is a set of icons that all mean "a puzzle". The name is what a player says to
   * themselves about a room, and it is worth the line it takes.
   *
   * **Worded per identity, like everything else over the board** (`puzzle-screens.md` §1.1): the family
   * hands over a name, not an id, so the same mechanic dressed as a causeway is called one. Core never
   * learns a family's names — it only knows where to put one.
   *
   * **The tier is deliberately not said here.** Every path is authored to a difficulty already, and that
   * data is for telling a player which kind of area they are walking into while they cross the floor — so
   * a label inside the room states it somewhere it can no longer be acted on.
   */
  title?: string
  /** The rules of this puzzle, shown under the board — scrolled to, never popped up. */
  rules?: ReactNode
  children: (api: PuzzleShellApi) => ReactNode
}

// `1:07`, or `43s` under a minute — short enough to read at a glance, and no words, so it needs no locale.
const formatDuration = (ms: number): string => {
  const seconds = Math.round(ms / 1000)
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}:${`${seconds % 60}`.padStart(2, "0")}`
}

// The chrome every puzzle family wears: back, reset, hint (with its cooldown and idle nudge), the
// completed banner, and the rules below the board. Families supply the board and their own hint text;
// none of them reimplement the controls (docs/instructions/puzzle-screens.md §3).
export const PuzzleFamilyShell = ({
  onSolved,
  onCancel,
  solved,
  onReset,
  hint,
  idleMs,
  onHintRevealed,
  goal,
  title,
  rules,
  children,
}: Props) => {
  const { t } = useTranslation("common")
  const [solvedBanner, setSolvedBanner] = useState(false)
  const [scheduleSolve, cancelSolve] = useTimeout()
  const { revealed, cooling, nudging, hintsUsed, reveal, reportInput } = useHintAvailability(idleMs)

  // Resolved only once revealed, which is the whole point of allowing a function: an unread hint costs nothing.
  const hintText = revealed ? (typeof hint === "function" ? hint() : hint) : undefined

  // The board is frozen the moment it is solved, not when the banner arrives: the pause before it is
  // long enough to tap a cell, and a tap there un-solved the puzzle while the win was already on its
  // way — finishing a board the player had just broken.
  const [finishing, setFinishing] = useState(false)

  // How long the board took, stopped at the solve rather than at the banner, and counting only the time it
  // was actually on screen. This is the instrument for PUZZLE_FAMILIES.md §3.2's solve-time budget — a tier
  // nobody has timed is a tier whose duration is unknown — and the lab plays the real screen, so timing a
  // tier there needs nothing of its own.
  const elapsedMs = useVisibleElapsed()
  const [tookMs, setTookMs] = useState<number>()

  // The banner waits for a tap rather than a timer: the solved board is the reward, and a puzzle that closes
  // itself takes it away before it has been looked at. So the dim is light enough to read the board through and
  // the player says when they are done with it.
  const handleSolved = useCallback(() => {
    setFinishing(true)
    setTookMs(elapsedMs())
    scheduleSolve(800, () => setSolvedBanner(true))
  }, [scheduleSolve, elapsedMs])

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
      {/* Kept in the layout once the board is finishing, not unmounted: dropping the chrome out of the flow
          collapsed the page under the banner, so the whole screen jumped as it landed. Dimmed and inert
          rather than hidden — the controls read as out of use, which is what they are. */}
      <div inert={finishing} className={clsx("flex w-full items-center gap-2", finishing && "opacity-40")}>
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
            onClick={() => {
              reveal()
              onHintRevealed?.()
            }}
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
      {/* On its own line rather than between the buttons: back, reset and hint already fill a 360px row,
          and a name squeezed between them is the first thing to be truncated. */}
      {title && (
        <p className={clsx("w-full text-center text-sm font-semibold text-stone-200", finishing && "opacity-40")}>
          {title}
        </p>
      )}
      <div inert={finishing} className={clsx("flex w-full flex-col items-center gap-4", finishing && "opacity-90")}>
        {children({ solved: handleSolved, reportInput, hintVisible: revealed && hint !== undefined })}
      </div>
      {hintText && (
        <p
          ref={hintRef}
          className={clsx(
            // Pre-line, so a family may give its reason and the move it asks for as two lines rather than
            // one run-together sentence. A family with one line is unaffected.
            "w-full rounded border border-amber-800 bg-amber-950/60 p-2 text-center text-sm whitespace-pre-line text-amber-200",
            solvedBanner && "invisible"
          )}
        >
          {hintText}
        </p>
      )}
      {(goal || rules) && (
        <div
          className={clsx("w-full border-t border-stone-700 pt-3 text-sm text-stone-400", solvedBanner && "invisible")}
        >
          {goal && (
            <>
              <h3 className="mb-1 font-pyramid text-stone-300">{t("ui.goal")}</h3>
              <p className="mb-3">{goal}</p>
            </>
          )}
          {rules && (
            <>
              <h3 className="mb-1 font-pyramid text-stone-300">{t("ui.howToPlay")}</h3>
              {rules}
            </>
          )}
        </div>
      )}
      {solvedBanner && (
        <button
          onClick={onSolved}
          className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-stone-900/40"
        >
          <span className="flex flex-col items-center gap-1 rounded-lg bg-stone-900/90 px-6 py-4">
            <span className="font-pyramid text-xl text-amber-300">{t("ui.puzzleCompleted")}</span>
            {/* Solving it unaided is worth saying out loud — otherwise there is nothing to lose by
                leaning on the hint button, and nothing to notice the day you stop needing it. */}
            <span className="text-sm text-stone-400">
              {hintsUsed === 0 ? t("ui.solvedUnaided") : t("ui.solvedWithHints", { count: hintsUsed })}
            </span>
            {/* Wordless on purpose (P2): a clock face and a duration read the same in every locale. */}
            {tookMs !== undefined && <span className="text-xs text-stone-500">⏱ {formatDuration(tookMs)}</span>}
            <span className="mt-1 text-xs text-stone-500">{t("ui.tapToContinue")}</span>
          </span>
        </button>
      )}
    </>
  )
}
