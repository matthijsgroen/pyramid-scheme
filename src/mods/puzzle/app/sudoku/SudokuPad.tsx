import clsx from "clsx"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { SudokuSkin } from "./skins"

type Props = {
  size: number
  /** Which place this room is — the pad stands on the same ground the board does. */
  skin: SudokuSkin
  /** True while values go in as pencilled notes rather than as answers — the keys say so by their colour. */
  pencil: boolean
  /** Values already written into every row — nothing left to place. */
  exhausted: ReadonlySet<number>
  /** No square is picked, so a value has nowhere to go yet. */
  disabled: boolean
  onValue: (value: number) => void
  onErase: () => void
  onTogglePencil: () => void
}

// Every control is at least a thumb wide (docs/instructions/puzzle-screens.md §1), and the pad wraps
// rather than shrinking, so it still fits a 360px screen.
const buttonCls = "flex h-11 min-w-11 items-center justify-center rounded border px-2 text-lg transition-colors"

/**
 * The values, and the two keys that change what pressing one MEANS.
 *
 * **Notes and the eraser are pad furniture, not chrome** (`puzzle-screens.md` §3): they re-aim the keys
 * above them, so they belong in the same grid, cut to the same square. Undo is the shell's, because a step
 * back means the same thing on a board with no pad at all.
 */
export const SudokuPad: FC<Props> = ({ size, skin, pencil, exhausted, disabled, onValue, onErase, onTogglePencil }) => {
  const { t } = useTranslation("common")
  return (
    <div className="flex w-full max-w-[min(56vh,26rem)] flex-col items-center gap-1.5">
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
      <div className="flex items-center gap-1.5">
        {/* Wordless, because it is a key and keys carry marks. The word is in the label a screen reader
            hears; what says the mode is on to everyone else is the face the keys above put on. */}
        <button
          onClick={onTogglePencil}
          aria-pressed={pencil}
          aria-label={t("ui.notes")}
          className={clsx(buttonCls, "w-11", pencil ? "border-sky-500 bg-sky-900" : skin.pad.key)}
        >
          ✏️
        </button>
        <button
          onClick={onErase}
          disabled={disabled}
          aria-label={t("ui.erase")}
          className={clsx(buttonCls, "w-11", disabled ? `${skin.pad.disabledKey} opacity-40` : skin.pad.key)}
        >
          🧽
        </button>
      </div>
    </div>
  )
}
