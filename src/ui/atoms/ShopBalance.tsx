import type { FC } from "react"

type Props = {
  amount: number
  label: string
}

export const ShopBalance: FC<Props> = ({ amount, label }) => (
  <div
    className="flex items-center gap-1.5 rounded-full bg-stone-800/80 px-3 py-1 text-amber-200"
    role="status"
    aria-label={`${label}: ${amount}`}
  >
    <span aria-hidden>🪙</span>
    <span className="font-pyramid text-sm font-bold">{amount}</span>
  </div>
)
