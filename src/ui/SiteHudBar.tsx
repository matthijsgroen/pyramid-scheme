import type { FC, PropsWithChildren } from "react"

export const SiteHudBar: FC<PropsWithChildren> = ({ children }) => (
  <div className="absolute right-0 bottom-safe-bottom left-0 z-10 mb-4 flex flex-col items-center justify-center gap-2">
    {children}
  </div>
)
