import type { FC } from "react"

const HEART_PATH =
  "M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"

const Heart: FC<{ left: boolean; right: boolean }> = ({ left, right }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
    <path d={HEART_PATH} fill={left ? "#ef4444" : "#6b7280"} style={{ clipPath: "inset(0 50% 0 0)" }} />
    <path d={HEART_PATH} fill={right ? "#ef4444" : "#6b7280"} style={{ clipPath: "inset(0 0 0 50%)" }} />
  </svg>
)

type Props = {
  currentHealth: number // half-hearts
  maxHealth: number // half-hearts
}

export const HealthDisplay: FC<Props> = ({ currentHealth, maxHealth }) => {
  const slots = Math.ceil(maxHealth / 2)
  return (
    <div className="flex gap-0.5" role="img" aria-label={`Health: ${currentHealth} of ${maxHealth} half-hearts`}>
      {Array.from({ length: slots }, (_, i) => (
        <Heart key={i} left={currentHealth > i * 2} right={currentHealth > i * 2 + 1} />
      ))}
    </div>
  )
}
