import type { FC } from "react"

type Labels = {
  title: string
  body: string
  banner: string
  reload: string
  continue: string
  /** Offered once reloading has not helped. */
  reset: string
  confirmReset: string
  confirmResetYes: string
  confirmResetNo: string
}

type Props = {
  /** `notice` asks the player what to do; `banner` is what stays once they chose to play on;
   * `confirmReset` asks once more before the save is deleted. */
  mode: "notice" | "banner" | "confirmReset"
  labels: Labels
  /** Present once reloading has failed often enough that starting over is worth offering. */
  onReset?: () => void
  onReload: () => void
  onContinue: () => void
  onConfirmReset: () => void
  onCancelReset: () => void
}

// The save could not be read: the player reloads to try again, or plays on knowing nothing is kept, and
// when reloading keeps failing may start over. Every screen has a way out, so a browser that never gives
// the save back cannot trap anyone.
export const SaveUnreadable: FC<Props> = ({
  mode,
  labels,
  onReset,
  onReload,
  onContinue,
  onConfirmReset,
  onCancelReset,
}) => {
  if (mode === "banner")
    return (
      <button
        onClick={onReload}
        className="fixed inset-x-0 top-0 z-50 bg-rose-900/90 px-4 py-1 text-center text-xs text-rose-100"
        style={{ paddingTop: "max(0.25rem, env(safe-area-inset-top))" }}
      >
        {labels.banner}
      </button>
    )
  return (
    <div
      role="alertdialog"
      aria-label={labels.title}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-stone-900/95 p-6 text-stone-200"
    >
      <h1 className="text-center font-pyramid text-2xl text-amber-400">{labels.title}</h1>
      {mode === "confirmReset" ? (
        <>
          <p className="max-w-sm text-center text-sm">{labels.confirmReset}</p>
          <button onClick={onConfirmReset} className="rounded-lg bg-rose-800 px-6 py-3 font-bold text-rose-100">
            {labels.confirmResetYes}
          </button>
          <button onClick={onCancelReset} className="text-sm text-stone-400 hover:text-stone-200">
            {labels.confirmResetNo}
          </button>
        </>
      ) : (
        <>
          <p className="max-w-sm text-center text-sm">{labels.body}</p>
          <button onClick={onReload} className="rounded-lg bg-amber-700 px-6 py-3 font-bold text-amber-100">
            {labels.reload}
          </button>
          <button onClick={onContinue} className="text-sm text-stone-400 hover:text-stone-200">
            {labels.continue}
          </button>
          {onReset && (
            <button onClick={onReset} className="text-sm text-rose-400 hover:text-rose-300">
              {labels.reset}
            </button>
          )}
        </>
      )}
    </div>
  )
}
