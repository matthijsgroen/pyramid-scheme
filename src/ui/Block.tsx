import clsx from "clsx"
import type { FC, PropsWithChildren } from "react"

export type BlockFeedback = "correct" | "incorrect" | "pending"

export const Block: FC<PropsWithChildren<{ className?: string; selected?: boolean; feedback?: BlockFeedback }>> = ({
  children,
  selected,
  feedback,
  className = "",
}) => {
  return (
    <div
      className={clsx(
        "ml-[-1px] flex h-10 w-15 items-center justify-center rounded text-center",
        {
          "border-2": selected || !!feedback,
          border: !selected && !feedback,
          "animate-magic-flow": feedback === "pending",
          "border-green-500": feedback === "correct",
          "border-red-500": feedback === "incorrect",
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
