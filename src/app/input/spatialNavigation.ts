import type { Direction } from "@/game/siteTypes"

export type Rect = { left: number; top: number; width: number; height: number }

const centre = (rect: Rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })

// Straying sideways counts double, so the control straight ahead wins over a nearer one off to the side.
const SIDEWAYS_WEIGHT = 2

/**
 * The candidate a move in `dir` lands on from `from`: the nearest whose centre lies beyond `from`'s centre in
 * that direction. Returns its index, or undefined when nothing lies that way.
 */
export const nearestInDirection = (from: Rect, candidates: readonly Rect[], dir: Direction): number | undefined => {
  const origin = centre(from)
  let best: number | undefined
  let bestScore = Infinity
  candidates.forEach((rect, index) => {
    const { x, y } = centre(rect)
    const dx = x - origin.x
    const dy = y - origin.y
    const ahead = dir === "e" ? dx : dir === "w" ? -dx : dir === "s" ? dy : -dy
    const sideways = dir === "e" || dir === "w" ? Math.abs(dy) : Math.abs(dx)
    if (ahead <= 0) return
    const score = ahead + sideways * SIDEWAYS_WEIGHT
    if (score < bestScore) {
      bestScore = score
      best = index
    }
  })
  return best
}
