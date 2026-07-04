import { clsx } from "clsx"
import type { FC, PropsWithChildren } from "react"

export const Page: FC<PropsWithChildren<{ snap: "start" | "center" | "end"; className?: string }>> = ({
  children,
  snap = "start",
  className,
}) => {
  return (
    <div
      className={clsx(className, "flex w-screen max-w-screen shrink-0 snap-always flex-nowrap md:w-4/5", {
        "snap-start": snap === "start",
        "snap-center": snap === "center",
        "snap-end": snap === "end",
      })}
    >
      {children}
    </div>
  )
}
