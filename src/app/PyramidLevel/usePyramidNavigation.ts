import { useState } from "react"
import type { InputHandler } from "@/app/input/actions"
import type { PyramidBlock } from "@/game/types"
import { getFloorAndIndex } from "@/game/pyramidBlocks"

/**
 * The tableau's cursor for keys and pad: a direction steps along a floor or onto the floor above or below
 * (each floor one block longer than the last), confirm opens the block's field for typing, a digit fills
 * the block and opens it, erase empties it, and `prev`/`next` count its value down or up for a pad that has no
 * digits.
 */
export const usePyramidNavigation = (
  floorStartIndices: number[],
  floorCount: number,
  blocks: PyramidBlock[],
  onAnswer?: (blockId: string, value: number | undefined) => void,
  values: Record<string, number | undefined> = {}
) => {
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number>(0)
  const [focusInput, setFocusInput] = useState(false)

  const select = (blockIndex: number) => {
    setSelectedBlockIndex(blockIndex)
    setFocusInput(false)
  }

  const handle: InputHandler = ({ action, repeat, released }) => {
    if (released) return false
    const { floor, index } = getFloorAndIndex(selectedBlockIndex, floorStartIndices)
    const block = blocks[selectedBlockIndex]
    switch (action.kind) {
      case "move":
        if (action.dir === "w" && index > 0) select(selectedBlockIndex - 1)
        else if (action.dir === "e" && index < floor) select(selectedBlockIndex + 1)
        else if (action.dir === "n" && floor > 0) select(floorStartIndices[floor - 1] + Math.min(index, floor - 1))
        else if (action.dir === "s" && floor < floorCount - 1) select(floorStartIndices[floor + 1] + index)
        return true
      case "confirm":
        if (!repeat) setFocusInput(true)
        return true
      case "value":
        if (focusInput) return false
        if (!repeat) {
          onAnswer?.(block.id, action.value)
          setFocusInput(true)
        }
        return true
      case "erase":
        if (!onAnswer || !block.isOpen) return false
        if (!repeat) onAnswer(block.id, undefined)
        return true
      case "prev":
      case "next": {
        if (!onAnswer || !block.isOpen) return false
        const now = values[block.id]
        if (action.kind === "next") onAnswer(block.id, (now ?? 0) + 1)
        else onAnswer(block.id, now === undefined || now <= 1 ? undefined : now - 1)
        return true
      }
      default:
        return false
    }
  }

  return {
    selectedBlockIndex,
    setSelectedBlockIndex,
    focusInput,
    setFocusInput,
    handle,
  }
}
