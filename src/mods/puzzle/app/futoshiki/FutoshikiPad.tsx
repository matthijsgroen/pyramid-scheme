import clsx from "clsx"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

type Props = {
  size: number
  /** True while numbers go in as pencilled notes rather than as answers. */
  pencil: boolean
  canUndo: boolean
  /** Numbers already written into every row — nothing left to place. */
  exhausted: ReadonlySet<number>
  /** No cell is picked, so a number has nowhere to go yet. */
  disabled: boolean
  onNumber: (value: number) => void
  onErase: () => void
  onTogglePencil: () => void
  onUndo: () => void
}

// Every control is at least a thumb wide (docs/instructions/puzzle-screens.md §1), and the pad wraps
// rather than shrinking, so a 7-number pad still fits a 360px screen.
const buttonCls = "flex h-11 min-w-11 items-center justify-center rounded border px-2 text-lg transition-colors"

// Six numbers is what a 360px screen fits in one row, so a seventh wraps — split evenly rather than
// stranding it alone, which reads as a layout fault instead of a row that ran out of room.
const padColumns = (size: number) => Math.ceil(size / Math.ceil(size / 6))

export const FutoshikiPad: FC<Props> = ({
  size,
  pencil,
  canUndo,
  exhausted,
  disabled,
  onNumber,
  onErase,
  onTogglePencil,
  onUndo,
}) => {
  const { t } = useTranslation("common")
  return (
    <div className="flex w-full max-w-[min(56vh,26rem)] flex-col items-center gap-2">
      <div
        className="grid justify-center gap-1.5"
        style={{ gridTemplateColumns: `repeat(${padColumns(size)}, minmax(2.75rem, 3.25rem))` }}
      >
        {Array.from({ length: size }, (_, index) => index + 1).map(value => (
          <button
            key={value}
            onClick={() => onNumber(value)}
            disabled={disabled}
            className={clsx(buttonCls, {
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
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          onClick={onTogglePencil}
          aria-pressed={pencil}
          className={clsx(buttonCls, "gap-1 text-sm", {
            "border-sky-500 bg-sky-900 text-sky-100": pencil,
            "border-stone-600 bg-stone-800 text-stone-300": !pencil,
          })}
        >
          ✏️ {t("futoshiki.notes")}
        </button>
        <button
          onClick={onErase}
          disabled={disabled}
          className={clsx(buttonCls, "gap-1 text-sm", {
            "border-stone-600 bg-stone-800 text-stone-300": !disabled,
            "border-stone-700 bg-stone-900 text-stone-600": disabled,
          })}
        >
          🧽 {t("futoshiki.erase")}
        </button>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={clsx(buttonCls, "gap-1 text-sm", {
            "border-amber-700 bg-amber-950/60 text-amber-200": canUndo,
            "border-stone-700 bg-stone-900 text-stone-600": !canUndo,
          })}
        >
          ↩ {t("futoshiki.undo")}
        </button>
      </div>
    </div>
  )
}
