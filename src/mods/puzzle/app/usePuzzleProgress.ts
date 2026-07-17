import { useMemo } from "react"
import { useModState } from "@/app/state/useModState"
import type { Perk } from "@/app/SiteMap/perkContributions"

// Puzzle-owned progression state: scribes-eye is the only puzzle perk (§8.0.1) — extra tableau hint
// slots, granted by tomb treasures via the perk seam. Lives in the mod's own persisted slice so
// toggling puzzle off drops it and core names none of it. See collection-and-detector-design.md §7.4.

const SCRIBES_EYE_CAP = 3

type PuzzleState = { scribesEyeLevel: number }

const INITIAL: PuzzleState = { scribesEyeLevel: 0 }

export type PuzzleProgressAPI = {
  scribesEyeLevel: number
  grantPerk: (perk: Perk) => void
}

export const usePuzzleProgress = (): PuzzleProgressAPI => {
  const [state, setState] = useModState<PuzzleState>("puzzle", INITIAL)

  return useMemo(
    () => ({
      scribesEyeLevel: state.scribesEyeLevel ?? 0,
      grantPerk: perk =>
        perk.type === "scribes-eye"
          ? setState(prev => ({
              scribesEyeLevel: Math.min(SCRIBES_EYE_CAP, Math.max(prev.scribesEyeLevel ?? 0, perk.level ?? 1)),
            }))
          : undefined,
    }),
    [state, setState]
  )
}
