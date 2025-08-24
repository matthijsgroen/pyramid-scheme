import type { FC, PropsWithChildren } from "react"

export const Badge: FC<PropsWithChildren<{ count: number }>> = ({
  count,
  children,
}) => {
  return (
    <div className="relative inline-block w-fit">
      {children}
      {count > 0 && (
        <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">
          {count}
        </div>
      )}
    </div>
  )
}
