import { createContext, use, useCallback, useState, type Dispatch, type SetStateAction } from "react"
import { useGameStorage } from "@/support/useGameStorage"

// One slot, one board: storage holds the in-progress state of the single room that is open, tagged
// with the room it belongs to. Any other room reads it as "nothing started here" — the same shape
// the exterior board's answers use (src/app/PyramidLevel/useLevelAnswers.ts).
const STORAGE_KEY = "puzzleState"
const NO_ROOM = ""
const EMPTY: StoredPuzzleState = { room: NO_ROOM, state: null }

export type StoredPuzzleState = { room: string; state: unknown }

/**
 * Which room's board is on screen, set by core where the encounter renders.
 *
 * Passed through context rather than as a prop because a family's board component takes the puzzle
 * and nothing about where it is standing — and the room is core's business, not the family's. A
 * board rendered outside a room (the lab, Storybook) sees `undefined` and keeps its state in memory.
 */
export const PuzzleRoomContext = createContext<string | undefined>(undefined)

/**
 * `useState` for a puzzle's in-progress state, persisted for as long as the board is unsolved —
 * a partly filled board survives backing out, and a refresh.
 *
 * Solving clears the slot (core does it, see useClearPuzzleState): a solved room is never reopened,
 * so keeping its moves would only leave the next board to overwrite them.
 */
export const usePuzzleState = <T,>(create: () => T): [T, Dispatch<SetStateAction<T>>] => {
  const room = use(PuzzleRoomContext)
  const [stored, setStored] = useGameStorage<StoredPuzzleState>(STORAGE_KEY, EMPTY)
  const [local, setLocal] = useState(create)

  const setState = useCallback<Dispatch<SetStateAction<T>>>(
    update => {
      if (!room) {
        setLocal(update)
        return
      }
      setStored(prev => {
        // The stored state is what the move applies to, not this render's copy: the read that restores a
        // board can land between a tap and the write it causes.
        const current = prev.room === room ? (prev.state as T) : create()
        return { room, state: typeof update === "function" ? (update as (prev: T) => T)(current) : update }
      })
    },
    [room, setStored, create]
  )

  // The storage read lands a beat after mount; until it does — and for a board that has never been
  // touched — the freshly created state is what shows.
  return [room && stored.room === room ? (stored.state as T) : local, setState]
}

/** Drops the saved board. Core calls it the moment a room resolves. */
export const useClearPuzzleState = (): (() => void) => {
  const [, setStored] = useGameStorage<StoredPuzzleState>(STORAGE_KEY, EMPTY)
  return useCallback(() => {
    setStored(EMPTY)
  }, [setStored])
}
