import type { FC, ReactNode } from "react"
import clsx from "clsx"

type Props = {
  itemName: string
  itemDescription?: string
  icon: ReactNode
  sellValue: number
  ownedCount: number
  onSell: () => void
  sellLabel: string
}

export const SellItemCard: FC<Props> = ({
  itemName,
  itemDescription,
  icon,
  sellValue,
  ownedCount,
  onSell,
  sellLabel,
}) => {
  const disabled = ownedCount <= 0
  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-xl border border-amber-700/40 bg-stone-800/70 p-3",
        disabled && "opacity-50"
      )}
    >
      <div className="relative text-3xl" aria-hidden>
        {icon}
        {ownedCount > 1 && (
          <span className="absolute -right-1 -bottom-1 rounded-full bg-stone-900 px-1 text-[0.6rem] font-bold text-amber-200">
            ×{ownedCount}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-pyramid text-sm font-bold text-amber-100">{itemName}</p>
        {itemDescription && <p className="text-xs text-stone-300">{itemDescription}</p>}
      </div>
      <button
        onClick={onSell}
        disabled={disabled}
        aria-label={`${sellLabel} ${itemName}`}
        className={clsx(
          "shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors",
          disabled
            ? "cursor-not-allowed bg-stone-700 text-stone-400"
            : "bg-emerald-700 text-emerald-50 hover:bg-emerald-600"
        )}
      >
        +🪙 {sellValue}
      </button>
    </div>
  )
}
