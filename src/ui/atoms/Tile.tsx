import clsx from "clsx"
import type { FC, ReactNode } from "react"

export type TileVariant = "default" | "excluded" | "included"

type Props = {
  value: ReactNode
  variant?: TileVariant
  onClick?: () => void
}

export const Tile: FC<Props> = ({ value, variant = "default", onClick }) => (
  <button
    onClick={onClick}
    className={clsx(
      "flex size-10 items-center justify-center rounded border text-base font-semibold transition-all duration-100",
      {
        "border-stone-500 bg-stone-700 text-stone-200 hover:bg-stone-600": variant === "default",
        "relative border-stone-700 bg-stone-900 text-stone-600": variant === "excluded",
        "border-amber-500 bg-amber-800/70 text-amber-100 shadow shadow-amber-900": variant === "included",
      }
    )}
  >
    {variant === "excluded" ? (
      <>
        <span className="opacity-30">{value}</span>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg text-stone-500">
          ✕
        </span>
      </>
    ) : (
      value
    )}
  </button>
)
