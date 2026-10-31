import type { FC } from "react"

// The 10 px accent dot that says "something here you have not looked at". With a label it is an image the
// screen reader names; without one it is decoration.
export const NoticeDot: FC<{ label?: string }> = ({ label }) => (
  <span
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    className="size-2.5 shrink-0 rounded-full bg-camp-accent"
  />
)
