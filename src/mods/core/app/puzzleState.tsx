import { createContext, use, useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { useGameStorage } from "@/support/useGameStorage"

// One slot, one board: storage holds the in-progress state of the single room that is open, tagged
// with the room it belongs to. Any other room reads it as "nothing started here" — the same shape
// the exterior board's answers use (src/app/PyramidLevel/useLevelAnswers.ts).
const STORAGE_KEY = "puzzleState"
const NO_ROOM = ""
const EMPTY: StoredPuzzleState = { room: NO_ROOM, state: null }

export type StoredPuzzleState = {
  room: string
  state: unknown
  /** Which board `state` was played on (see `boardFingerprint`). Unset on a record written before boards were stamped, which is never trusted. */
  board?: string
}

/**
 * What a board is, in a few characters: a hash of its data.
 *
 * The room key outlives the board under it — a regenerated world hands the same room a different board —
 * and the stored state is shaped by the board it was played on (a mirror per mirror, a cell per cell).
 * Comparing this against the stamp on the record tells a state that no longer fits from one that does,
 * without any family having to say what "fits" means for its own state.
 */
export const boardFingerprint = (board: unknown): string => {
  const text = JSON.stringify(board) ?? ""
  let hash = 0x811c9dc5
  for (let at = 0; at < text.length; at++) hash = Math.imul(hash ^ text.charCodeAt(at), 0x01000193)
  return `${text.length.toString(36)}-${(hash >>> 0).toString(36)}`
}

/**
 * Which room's board is on screen, set by core where the encounter renders.
 *
 * Passed through context rather than as a prop because a family's board component takes the puzzle
 * and nothing about where it is standing — and the room is core's business, not the family's. A
 * board rendered outside a room (the lab, Storybook) sees `undefined` and keeps its state in memory.
 */
export const PuzzleRoomContext = createContext<string | undefined>(undefined)

// The one rule for whether a stored record is this room's state on this board. A record from before boards
// were stamped cannot be shown to fit this board, and a state that does not fit crashes the family that takes it,
// so an unstamped record is read as "nothing started here" like a mismatched one.
const holds = (record: StoredPuzzleState, room: string | undefined, stamp: string): boolean =>
  room !== undefined && room !== "" && record.room === room && record.board === stamp

/**
 * `useState` for a puzzle's in-progress state, persisted for as long as the board is unsolved —
 * a partly filled board survives backing out, and a refresh.
 *
 * `board` is the data the state is played on. A record stamped with a different board is read as "nothing
 * started here", on every read and not only the first mount, so a state shaped for another board is never
 * handed to this one. It is required so that no family can skip it.
 *
 * Solving clears the slot (core does it, see useClearPuzzleState): a solved room is never reopened,
 * so keeping its moves would only leave the next board to overwrite them.
 */
export const usePuzzleState = <T,>(create: () => T, board: unknown): [T, Dispatch<SetStateAction<T>>] => {
  const room = use(PuzzleRoomContext)
  const [stored, setStored] = useGameStorage<StoredPuzzleState>(STORAGE_KEY, EMPTY)
  const [local, setLocal] = useState(create)
  const stamp = useMemo(() => boardFingerprint(board), [board])

  const setState = useCallback<Dispatch<SetStateAction<T>>>(
    update => {
      if (!room) {
        setLocal(update)
        return
      }
      setStored(prev => {
        // The stored state is what the move applies to, not this render's copy: the read that restores a
        // board can land between a tap and the write it causes.
        const current = holds(prev, room, stamp) ? (prev.state as T) : create()
        return {
          room,
          board: stamp,
          state: typeof update === "function" ? (update as (prev: T) => T)(current) : update,
        }
      })
    },
    [room, stamp, setStored, create]
  )

  // The storage read lands a beat after mount; until it does — and for a board that has never been
  // touched — the freshly created state is what shows.
  return [holds(stored, room, stamp) ? (stored.state as T) : local, setState]
}

/** Drops the saved board. Core calls it the moment a room resolves. */
export const useClearPuzzleState = (): (() => void) => {
  const [, setStored] = useGameStorage<StoredPuzzleState>(STORAGE_KEY, EMPTY)
  return useCallback(() => {
    setStored(EMPTY)
  }, [setStored])
}
