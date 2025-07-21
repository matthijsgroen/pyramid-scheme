import { useMemo, useRef, type FC } from "react"
import { usePyramidNavigation } from "./usePyramidNavigation"
import type { Pyramid } from "../game/types"
import { Block } from "./Block"
import { InputBlock } from "./InputBlock"
import { getAnswers, isComplete } from "../game/state"
import clsx from "clsx"

const createFloorStartIndices = (floorCount: number): number[] => {
  const indices: number[] = []
  let index = 0
  for (let i = 1; i <= floorCount; i++) {
    indices.push(index)
    index += i
  }
  return indices
}

export const PyramidDisplay: FC<{
  pyramid: Pyramid
  values: Record<string, number | undefined>
  onAnswer: (blockId: string, value: number | undefined) => void
}> = ({ pyramid, values, onAnswer }) => {
  const { blocks } = pyramid

  // Render the pyramid blocks
  const floorCount = pyramid.floorCount
  const floorStartIndices = createFloorStartIndices(floorCount)
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    selectedBlockIndex,
    setSelectedBlockIndex,
    focusInput,
    setFocusInput,
    handleKeyDown,
  } = usePyramidNavigation(floorStartIndices, floorCount, blocks, onAnswer)
  const complete = isComplete({ pyramid, values })
  const correctAnswers = useMemo(() => getAnswers(pyramid), [pyramid])

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center focus:outline-none"
      tabIndex={0}
      autoFocus
      onKeyDown={handleKeyDown}
    >
      {floorStartIndices.map((startIndex, floor) => {
        // if complete, check if all answers of this row are correct
        const isCorrect = blocks
          .slice(startIndex, startIndex + floor + 1)
          .every((block) => values[block.id] === correctAnswers?.[block.id])
        return (
          <div key={floor} className="flex justify-center -mb-[1px]">
            {Array.from({ length: floor + 1 }, (_, index) => {
              const blockIndex = startIndex + index
              const block = blocks[blockIndex]
              return block.isOpen ? (
                <InputBlock
                  key={block.id}
                  value={values[block.id]}
                  selected={selectedBlockIndex === startIndex + index}
                  disabled={complete && isCorrect}
                  shouldFocus={
                    selectedBlockIndex === startIndex + index && focusInput
                  }
                  onSelect={() => setSelectedBlockIndex(startIndex + index)}
                  onBlur={() => {
                    setFocusInput(false)
                    containerRef.current?.focus()
                  }}
                  onChange={(value) => onAnswer(block.id, value)}
                />
              ) : (
                <Block
                  key={block.id}
                  selected={selectedBlockIndex === startIndex + index}
                  className="bg-yellow-200 border-yellow-600"
                >
                  {block.value !== undefined ? block.value : ""}
                </Block>
              )
            })}
            <div
              className={clsx(
                "ml-6 w-10 h-10 flex items-center justify-center text-lg font-bold",
                !complete && "opacity-0"
              )}
            >
              {isCorrect ? "✔️" : "❌"}
            </div>
          </div>
        )
      })}
    </div>
  )
}
