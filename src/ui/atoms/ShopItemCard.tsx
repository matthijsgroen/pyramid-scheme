import type { FC, ReactNode } from "react"
import clsx from "clsx"

type Props = {
  itemName: string
  itemDescription?: string
  icon: ReactNode
  price: number
  affordable: boolean
  soldOut?: boolean
  featured?: boolean
  onBuy: () => void
  buyLabel: string
  soldOutLabel: string
}

export const ShopItemCard: FC<Props> = ({
  itemName,
  itemDescription,
  icon,
  price,
  affordable,
  soldOut = false,
  featured = false,
  onBuy,
  buyLabel,
  soldOutLabel,
}) => {
  const disabled = soldOut || !affordable
  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-xl border p-3",
        featured ? "border-amber-400/70 bg-amber-900/30" : "border-amber-700/40 bg-stone-800/70",
        soldOut && "opacity-50"
      )}
    >
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-pyramid text-sm font-bold text-amber-100">{itemName}</p>
        {itemDescription && <p className="text-xs text-stone-300">{itemDescription}</p>}
      </div>
      <button
        onClick={onBuy}
        disabled={disabled}
        aria-label={`${buyLabel} ${itemName}`}
        className={clsx(
          "shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors",
          disabled ? "cursor-not-allowed bg-stone-700 text-stone-400" : "bg-amber-600 text-amber-50 hover:bg-amber-500"
        )}
      >
        {soldOut ? soldOutLabel : `🪙 ${price}`}
      </button>
    </div>
  )
}
