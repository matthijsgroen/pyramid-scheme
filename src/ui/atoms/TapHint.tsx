import clsx from "clsx"
import type { FC, ReactNode } from "react"

type Props = {
  /** Whether the hand is drawn; the target underneath renders either way. */
  show: boolean
  children: ReactNode
  className?: string
}

/**
 * A pointing hand tapping over its target, until the player has tapped it themselves.
 *
 * Wordless, so it carries the "where" a line of dialogue should not have to, and it never takes the tap
 * itself: the hand ignores the pointer and the target underneath gets every tap.
 */
export const TapHint: FC<Props> = ({ show, children, className }) => (
  <div className={clsx("relative", className)}>
    {children}
    {show && (
      <span
        data-testid="tap-hint"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 text-5xl drop-shadow-lg select-none"
      >
        <span className="inline-block animate-tap motion-reduce:animate-none">👆</span>
      </span>
    )}
  </div>
)
