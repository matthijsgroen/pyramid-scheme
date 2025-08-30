import { useState, useCallback } from "react"
import type { PyramidBlock } from "@/game/types"
import { getFloorAndIndex } from "./support"

export const usePyramidNavigation = (
  floorStartIndices: number[],
  floorCount: number,
  blocks: PyramidBlock[],
  onAnswer?: (blockId: string, value: number | undefined) => void
) => {
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number>(0)
  const [focusInput, setFocusInput] = useState(false)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const { floor, index } = getFloorAndIndex(selectedBlockIndex, floorStartIndices)
      if (e.key === "ArrowLeft" && index > 0) {
        setSelectedBlockIndex(selectedBlockIndex - 1)
        setFocusInput(false)
        e.preventDefault()
      } else if (e.key === "ArrowRight" && index < floor) {
        setSelectedBlockIndex(selectedBlockIndex + 1)
        setFocusInput(false)
        e.preventDefault()
      } else if (e.key === "ArrowUp" && floor > 0) {
        const aboveStart = floorStartIndices[floor - 1]
        const aboveIndex = aboveStart + Math.min(index, floor - 1)
        setSelectedBlockIndex(aboveIndex)
        setFocusInput(false)
        e.preventDefault()
      } else if (e.key === "ArrowDown" && floor < floorCount - 1) {
        const belowStart = floorStartIndices[floor + 1]
        const belowIndex = belowStart + Math.min(index, floor + 1)
        setSelectedBlockIndex(belowIndex)
        setFocusInput(false)
        e.preventDefault()
      } else if (e.key === "Enter") {
        setFocusInput(true)
        e.preventDefault()
      } else if (/^\d$/.test(e.key) && !focusInput) {
        const value = parseInt(e.key, 10)
        onAnswer?.(blocks[selectedBlockIndex].id, value)
        setFocusInput(true)
        e.preventDefault()
      }
    },
    [selectedBlockIndex, focusInput, floorStartIndices, floorCount, blocks, onAnswer]
  )

  return {
    selectedBlockIndex,
    setSelectedBlockIndex,
    focusInput,
    setFocusInput,
    handleKeyDown,
  }
}
