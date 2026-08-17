import { useCallback, useState } from "react"
import type { FutoshikiCellRef } from "@/mods/puzzle/game/futoshiki/techniques"

/**
 * Where a number typed on the pad lands, and whether it lands as an answer or as a note. Held apart
 * from the board itself so picking a square and pencilling in options never disturb each other.
 */
export const useFutoshikiEntry = () => {
  const [selected, setSelected] = useState<FutoshikiCellRef>()
  const [pencil, setPencil] = useState(false)

  // Tapping the picked square again lets go of it, so the pad can be put out of reach deliberately.
  const selectCell = useCallback(
    (row: number, col: number) =>
      setSelected(current => (current?.row === row && current?.col === col ? undefined : { row, col })),
    []
  )

  // Not selectCell: that toggles a second tap off, and a hint landing on the square already picked
  // would then unpick it.
  const focusCell = useCallback((row: number, col: number) => setSelected({ row, col }), [])

  const togglePencil = useCallback(() => setPencil(current => !current), [])

  const clearSelection = useCallback(() => setSelected(undefined), [])

  return { selected, pencil, selectCell, focusCell, togglePencil, clearSelection }
}
