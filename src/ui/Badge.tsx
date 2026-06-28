import type { FC, PropsWithChildren } from "react"

export const Badge: FC<PropsWithChildren<{ count?: number; label?: string }>> = ({ count, label, children }) => {
  const display = label ?? (count && count > 0 ? String(count) : null)
  return (
    <div className="relative inline-block w-fit">
      {children}
      {display && (
        <div className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-bold text-white shadow-sm">
          {display}
        </div>
      )}
    </div>
  )
}
