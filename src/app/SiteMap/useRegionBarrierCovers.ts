import { useEffect, useState } from "react"
import type { RegionBarrierCover } from "@/game/regionBarrierCover"

/** How long a cover takes to fade away once its barrier has opened in front of the player. */
export const REGION_COVER_FADE_OUT_MS = 1000

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

type Seen = { floor: string; shape: string; covers: readonly RegionBarrierCover[] }

/**
 * The covers to draw: the ones the grid shows, plus the ones whose barrier has just opened, kept for
 * their fade-out. A cover is "leaving" only when the same floor held it a moment ago and now has no shut
 * door — never on a floor change, and never when the ground is merely concealed, which keeps the region's
 * door. Under reduced motion nothing is kept, so the cover is gone at once.
 */
export const useRegionBarrierCovers = (
  covers: readonly RegionBarrierCover[],
  floor: string
): { standing: readonly RegionBarrierCover[]; leaving: readonly RegionBarrierCover[] } => {
  // Compared by what is drawn, not by identity: a caller handing in a fresh grid every render would otherwise loop.
  const shape = JSON.stringify(covers)
  const [seen, setSeen] = useState<Seen>({ floor, shape, covers })
  const [leaving, setLeaving] = useState<readonly RegionBarrierCover[]>([])

  if (seen.shape !== shape || seen.floor !== floor) {
    setSeen({ floor, shape, covers })
    if (seen.floor !== floor) setLeaving([])
    else {
      const gone = seen.covers.filter(old => !covers.some(now => now.region === old.region))
      if (gone.length > 0 && !prefersReducedMotion()) setLeaving([...leaving, ...gone])
    }
  }

  useEffect(() => {
    if (leaving.length === 0) return
    const timer = setTimeout(() => setLeaving([]), REGION_COVER_FADE_OUT_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  return { standing: covers, leaving: leaving.filter(old => !covers.some(now => now.region === old.region)) }
}
