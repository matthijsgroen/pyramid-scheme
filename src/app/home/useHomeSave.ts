import { useMemo } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import type { TreasureReward } from "@/game/siteTypes"
import { addToHaul, clearHaul, emptyHomeSave, markChapter, readHomeSave, updateHomeSave } from "@/game/homeSave"
import { useGameStorage } from "@/support/useGameStorage"

export type HomeSaveActions = {
  addToHaul: (reward: TreasureReward) => Promise<unknown>
  clearHaul: () => Promise<unknown>
  markChapter: (tier: Difficulty) => Promise<unknown>
}

export type HomeSaveAPI = HomeSaveActions & {
  haul: readonly TreasureReward[]
  chapter?: Difficulty
  loaded: boolean
}

// Core's home store. Every read goes through readHomeSave, so a stored value of another shape shows as
// the empty home; every change goes through updateHomeSave from the latest stored value, which leaves
// such a value untouched. The actions keep their identity across writes, so a caller can hand one on
// as a callback without re-creating its own.
export const useHomeSave = (): HomeSaveAPI => {
  const [stored, setStored, loaded] = useGameStorage<unknown>("homecoming", emptyHomeSave)

  const actions = useMemo<HomeSaveActions>(
    () => ({
      addToHaul: reward => setStored((prev: unknown) => updateHomeSave(prev, save => addToHaul(save, reward))),
      clearHaul: () => setStored((prev: unknown) => updateHomeSave(prev, clearHaul)),
      markChapter: tier => setStored((prev: unknown) => updateHomeSave(prev, save => markChapter(save, tier))),
    }),
    [setStored]
  )

  return useMemo(() => {
    const save = readHomeSave(stored)
    return { haul: save.haul, chapter: save.chapter, loaded, ...actions }
  }, [stored, loaded, actions])
}
