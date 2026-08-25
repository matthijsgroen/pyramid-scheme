import clsx from "clsx"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { SudokuSkin } from "./skins"

type Props = {
  size: number
  /** Which place this room is — the pad stands on the same ground the board does. */
  skin: SudokuSkin
  /** True while values go in as pencilled notes rather than as answers. */
  pencil: boolean
  canUndo: boolean
  /** Values already written into every row — nothing left to place. */
  exhausted: ReadonlySet<number>
  /** No square is picked, so a value has nowhere to go yet. */
  disabled: boolean
  onValue: (value: number) => void
  onErase: () => void
  onTogglePencil: () => void
  onUndo: () => void
}

// Every control is at least a thumb wide (docs/instructions/puzzle-screens.md §1), and the pad wraps
// rather than shrinking, so it still fits a 360px screen.
const buttonCls = "flex h-11 min-w-11 items-center justify-center rounded border px-2 text-lg transition-colors"

export const SudokuPad: FC<Props> = ({
  size,
  skin,
  pencil,
  canUndo,
  exhausted,
  disabled,
  onValue,
  onErase,
  onTogglePencil,
  onUndo,
}) => {
  const { t } = useTranslation("common")
  return (
    <div className="flex w-full max-w-[min(56vh,26rem)] flex-col items-center gap-2">
      <div
        className="grid justify-center gap-1.5"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(2.75rem, 3.25rem))` }}
      >
        {Array.from({ length: size }, (_unused, index) => index + 1).map(value => (
          <button
            key={value}
            onClick={() => onValue(value)}
            disabled={disabled}
            // Named by the character the key shows, so a reader hears what the eye reads.
            aria-label={skin.token(value)}
            // Set by the face rather than by the pad: a sign is written larger than a figure wherever it
            // stands, and a key is one of the three places it stands (`SudokuSkin.size`).
            style={{ fontSize: skin.size.key }}
            className={clsx(
              buttonCls,
              disabled ? skin.pad.disabledKey : pencil ? skin.pad.pencilKey : skin.pad.key,
              // A value with every square of its own already spoken for is dimmed, not removed: the
              // pad must not reshuffle under a finger mid-solve.
              exhausted.has(value) && !disabled && "opacity-40"
            )}
          >
            <skin.Glyph value={value} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          onClick={onTogglePencil}
          aria-pressed={pencil}
          className={clsx(buttonCls, "gap-1 text-sm", pencil ? skin.pad.controlOn : skin.pad.control)}
        >
          ✏️ {t("sudoku.notes")}
        </button>
        <button
          onClick={onErase}
          disabled={disabled}
          className={clsx(buttonCls, "gap-1 text-sm", disabled ? skin.pad.controlOff : skin.pad.control)}
        >
          🧽 {t("sudoku.erase")}
        </button>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={clsx(buttonCls, "gap-1 text-sm", canUndo ? skin.pad.control : skin.pad.controlOff)}
        >
          ↩ {t("sudoku.undo")}
        </button>
      </div>
    </div>
  )
}
