import clsx from "clsx"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

type Props = {
  size: number
  /** True while numbers go in as pencilled notes rather than as answers. */
  pencil: boolean
  /** Numbers already written into every row — nothing left to place. */
  exhausted: ReadonlySet<number>
  /** No cell is picked, so a number has nowhere to go yet. */
  disabled: boolean
  onNumber: (value: number) => void
  onErase: () => void
  onTogglePencil: () => void
}

// Every control is at least a thumb wide (docs/instructions/puzzle-screens.md §1), and the pad wraps
// rather than shrinking, so a 7-number pad still fits a 360px screen.
const keyCls = "flex h-11 min-w-11 items-center justify-center rounded border text-lg transition-colors"

// Six numbers is what a 360px screen fits in one row, so a seventh wraps — split evenly rather than
// stranding it alone, which reads as a layout fault instead of a row that ran out of room.
const padColumns = (size: number) => Math.ceil(size / Math.ceil(size / 6))

/**
 * The numbers, and the two keys that change what pressing one MEANS.
 *
 * **Notes and the eraser are pad furniture, not chrome** (`puzzle-screens.md` §3). They were briefly up in
 * the shell's control row with undo and hint, wearing words, and that read as a toolbar: three labelled
 * buttons of equal weight, one of which silently re-aimed every key above it. Down here, cut to the same
 * square as a number and standing in the same grid, the pencil says what it is — the mode the keys are in.
 */
export const FutoshikiPad: FC<Props> = ({ size, pencil, exhausted, disabled, onNumber, onErase, onTogglePencil }) => {
  const { t } = useTranslation("common")
  return (
    <div className="flex w-full max-w-[min(56vh,26rem)] flex-col items-center gap-1.5">
      <div
        className="grid justify-center gap-1.5"
        style={{ gridTemplateColumns: `repeat(${padColumns(size)}, minmax(2.75rem, 3.25rem))` }}
      >
        {Array.from({ length: size }, (_, index) => index + 1).map(value => (
          <button
            key={value}
            onClick={() => onNumber(value)}
            disabled={disabled}
            className={clsx(keyCls, {
              "border-sky-600 bg-sky-950/60 text-sky-200": pencil && !disabled,
              "border-stone-500 bg-stone-700 text-stone-100": !pencil && !disabled,
              "border-stone-700 bg-stone-900 text-stone-600": disabled,
              // A number with every square of its own already spoken for is dimmed, not removed:
              // the pad must not reshuffle under a finger mid-solve.
              "opacity-40": exhausted.has(value) && !disabled,
            })}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        {/* Wordless, because it is a key and keys carry marks. The word is in the label a screen reader
            hears, and `aria-pressed` is what says the mode is on — the sky the keys above turn says it
            to everyone else, which is the mode showing itself where it acts. */}
        <button
          onClick={onTogglePencil}
          aria-pressed={pencil}
          aria-label={t("ui.notes")}
          className={clsx(
            keyCls,
            "w-11",
            pencil ? "border-sky-500 bg-sky-900" : "border-stone-600 bg-stone-800 hover:bg-stone-700"
          )}
        >
          ✏️
        </button>
        <button
          onClick={onErase}
          disabled={disabled}
          aria-label={t("ui.erase")}
          className={clsx(
            keyCls,
            "w-11",
            disabled ? "border-stone-700 bg-stone-900 opacity-40" : "border-stone-600 bg-stone-800 hover:bg-stone-700"
          )}
        >
          🧽
        </button>
      </div>
    </div>
  )
}
