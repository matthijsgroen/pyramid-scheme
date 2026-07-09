import type { FC, ReactNode } from "react"
import { ShopBalance } from "@/ui/atoms/ShopBalance"

type Props = {
  isOpen: boolean
  title: string
  balance: number
  balanceLabel: string
  dismissLabel: string
  onDismiss: () => void
  children: ReactNode
}

export const ShopPanel: FC<Props> = ({ isOpen, title, balance, balanceLabel, dismissLabel, onDismiss, children }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onDismiss} />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-2xl border border-amber-700/50 bg-stone-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-pyramid text-lg font-bold text-amber-100">{title}</h2>
          <ShopBalance amount={balance} label={balanceLabel} />
        </div>
        <div className="flex flex-col gap-2">{children}</div>
        <button
          onClick={onDismiss}
          className="mt-4 w-full rounded-lg bg-stone-700 py-2 text-sm font-medium text-stone-200 hover:bg-stone-600"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  )
}
