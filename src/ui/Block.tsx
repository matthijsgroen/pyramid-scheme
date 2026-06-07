import clsx from "clsx"
import type { FC, PropsWithChildren } from "react"

export type BlockFeedback = "correct" | "incorrect" | "pending"

export const Block: FC<
  PropsWithChildren<{
    className?: string
    selected?: boolean
    feedback?: BlockFeedback
    unlockable?: boolean
    onClick?: () => void
  }>
> = ({ children, selected, feedback, unlockable, onClick, className = "" }) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "ml-[-1px] flex h-10 w-15 items-center justify-center rounded text-center",
        {
          "border-2": selected || !!feedback || unlockable,
          border: !selected && !feedback && !unlockable,
          "animate-magic-flow": feedback === "pending",
          "border-green-500": feedback === "correct",
          "border-red-500": feedback === "incorrect",
          "animate-unlock-glow cursor-pointer": unlockable && !feedback,
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
