import clsx from "clsx"
import type { ComponentProps, FC, PropsWithChildren } from "react"

export const Header: FC<PropsWithChildren<ComponentProps<"div">>> = ({ className, children, ...props }) => {
  return (
    <div
      {...props}
      className={clsx(
        "flex w-full flex-row justify-between gap-4 px-4 pt-[calc(env(safe-area-inset-top,_0)_+_var(--spacing)_*_2)] pb-2",
        className
      )}
    >
      {children}
    </div>
  )
}
