import type { FC } from "react"

export const EntranceTransitionOverlay: FC<{
  onComplete?: () => void
  /** CSS position of the zoom origin, e.g. "50% 65%" or "320px 400px". Defaults to center-bottom area. */
  origin?: string
  /** Delay before the animation starts, e.g. "1.2s". */
  delay?: string
}> = ({ onComplete, origin = "50% 65%", delay }) => {
  const [x, y] = origin.split(" ")
  return (
    <div
      className="fixed z-50 size-4 animate-entrance-zoom rounded-full bg-black"
      style={{ left: x, top: y, animationDelay: delay }}
      onAnimationEnd={onComplete}
    />
  )
}
