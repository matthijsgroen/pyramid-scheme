import clsx from "clsx"
import type { FC, PropsWithChildren } from "react"

export const Block: FC<PropsWithChildren<{ className?: string; selected?: boolean }>> = ({
  children,
  selected,
  className = "",
}) => {
  return (
    <div
      className={clsx(
        "ml-[-1px] flex h-10 w-15 items-center justify-center rounded text-center",
        {
          "border-2": selected,
          border: !selected,
        },
        className
      )}
      style={{
        boxShadow: "16px 0px 0px 0px #9b623e",
      }}
    >
      {children}
    </div>
  )
}
