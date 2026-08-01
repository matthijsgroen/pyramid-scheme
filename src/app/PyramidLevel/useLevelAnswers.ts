import { useCallback, useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { createPyramidAnswers, setBlockAnswer, type PyramidAnswers } from "@/game/state"

// One slot, one board: storage holds the answers of a single exterior board, tagged with the board
// they belong to. Any other board reads them as "nothing filled in yet".
const STORAGE_KEY = "levelAnswers"
// Tags an empty slot — matches no board's storage key.
const NO_BOARD = ""
const NO_ANSWERS: PyramidAnswers = {}

export type StoredLevelAnswers = { key: string; values: PyramidAnswers }

export type LevelAnswersAPI = {
  answers: PyramidAnswers
  loaded: boolean
  setAnswer: (blockId: string, value: number | undefined) => void
  clearAnswers: () => void
}

/**
 * In-progress answers for one exterior pyramid board, persisted so backing out mid-solve and
 * coming back keeps what was typed. `storageKey` identifies the board; pass none for a board
 * that is only being rendered as scenery.
 */
export const useLevelAnswers = (storageKey?: string): LevelAnswersAPI => {
  const initialValue = useMemo<StoredLevelAnswers>(
    () => ({ key: storageKey ?? NO_BOARD, values: createPyramidAnswers() }),
    [storageKey]
  )
  const [stored, setStored, loaded] = useGameStorage<StoredLevelAnswers>(STORAGE_KEY, initialValue)

  const setAnswer = useCallback(
    (blockId: string, value: number | undefined) => {
      if (!storageKey) return
      setStored(prev => {
        const values = prev.key === storageKey ? prev.values : createPyramidAnswers()
        return { key: storageKey, values: setBlockAnswer(values, blockId, value) }
      })
    },
    [setStored, storageKey]
  )

  // Written rather than deleted: `removeItem` doesn't notify the store's subscribers, so the other
  // instances mounted on this key would keep showing the answers we just dropped.
  const clearAnswers = useCallback(() => {
    setStored({ key: NO_BOARD, values: createPyramidAnswers() })
  }, [setStored])

  return {
    answers: storageKey && stored.key === storageKey ? stored.values : NO_ANSWERS,
    loaded,
    setAnswer,
    clearAnswers,
  }
}
