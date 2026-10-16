import { useCallback } from "react"
import { useModState } from "@/app/state/useModState"
import { boardFingerprint } from "@/mods/core/app/puzzleState"

/** The puzzle mod's own saved slice: where the player left the bars of each procession door's board. */
type PuzzleModState = { doorBoards?: Record<string, { board: string; starts: number[] }> }

const INITIAL: PuzzleModState = {}

/**
 * WHERE THE BARS OF ONE DOOR'S BOARD WERE LEFT, by the door's sequence, so walking off to free a bar costs no drag.
 * Read only while it was left on this board; losing it costs a drag, never progress (the read is the journey's).
 */
export const useDoorBoardStarts = (
  key: string,
  board: unknown
): [readonly number[] | undefined, (starts: number[]) => void] => {
  const [state, setState] = useModState<PuzzleModState>("puzzle", INITIAL)
  const stamp = boardFingerprint(board)
  const saved = state.doorBoards?.[key]
  const save = useCallback(
    (starts: number[]) =>
      setState(prev => ({ ...prev, doorBoards: { ...(prev.doorBoards ?? {}), [key]: { board: stamp, starts } } })),
    [setState, key, stamp]
  )
  return [saved?.board === stamp ? saved.starts : undefined, save]
}
