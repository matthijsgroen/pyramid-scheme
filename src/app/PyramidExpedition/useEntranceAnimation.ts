import { useEffect, useState } from "react"

// The board's arrival animation: the entrance block zooms open, and the board stays untouchable
// until it finishes, so a tap meant for the animation doesn't land on a puzzle block.
//
// Only meaningful when the board is actually shown — dropping straight into a restored interior
// skips it.
export const useEntranceAnimation = (active: boolean, durationMs = 900): { entering: boolean } => {
  const [entering, setEntering] = useState(active)

  useEffect(() => {
    if (!entering) return
    const timer = setTimeout(() => setEntering(false), durationMs)
    return () => clearTimeout(timer)
  }, [entering, durationMs])

  return { entering }
}
