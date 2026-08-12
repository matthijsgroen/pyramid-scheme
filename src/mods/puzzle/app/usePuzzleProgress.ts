import { useMergedEarnedPerks } from "@/app/SiteMap/perkContributions"
import { perkLevel } from "@/game/perkTotals"

export const SCRIBES_EYE_CAP = 3

export type PuzzleProgressAPI = {
  scribesEyeLevel: number
}

// Scribes-eye (extra tableau hint slots) is derived from the treasures held, not stored: the mod
// keeps no persisted slice of its own for it. See game/perkTotals.ts.
export const usePuzzleProgress = (): PuzzleProgressAPI => ({
  scribesEyeLevel: perkLevel(useMergedEarnedPerks(), "scribes-eye", SCRIBES_EYE_CAP),
})
