import { useMemo, useRef, type FC } from "react"
import { usePyramidNavigation } from "./usePyramidNavigation"
import type { Pyramid } from "../game/types"
import { Block } from "../ui/Block"
import { InputBlock } from "../ui/InputBlock"
import { getAnswers, isComplete } from "../game/state"
import clsx from "clsx"
import { mulberry32 } from "../game/random"

const createFloorStartIndices = (floorCount: number): number[] => {
  const indices: number[] = []
  let index = 0
  for (let i = 1; i <= floorCount; i++) {
    indices.push(index)
    index += i
  }
  return indices
}

// prettier-ignore
const hyroglyphs = [
  "𓂀", "𓃭", "𓁼", "𓃗", "𓇡", "𓊑", "𓆣", "𓀀",
  "𓃾", "𓅓", "𓆑", "𓏏", "𓎛", "𓋴", "𓈖", "𓊃",
  "𓉔", "𓄿", "𓂝", "𓃀", "𓅱", "𓆷", "𓎡", "𓎼",
  "𓏲", "𓏤", "𓏇", "𓏭", "𓏴", "𓐍", "𓐏", "𓏡", "𓏢", "𓏣",
]

const decorationEmoji = ["🐫", "🐪", "🐐", "🌴", "🪨"]

const getPosition = (
  levelNr: number
): "left" | "left-mirror" | "right" | "right-mirror" => {
  return ["left", "left-mirror", "right", "right-mirror"][
    Math.floor(mulberry32(levelNr)() * 4)
  ] as "left" | "left-mirror" | "right" | "right-mirror"
}

export const PyramidDisplay: FC<{
  levelNr: number
  pyramid: Pyramid
  values: Record<string, number | undefined>
  onAnswer: (blockId: string, value: number | undefined) => void
}> = ({ pyramid, values, onAnswer, levelNr }) => {
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
  const complete = !focusInput && isComplete({ levelNr: 1, pyramid, values })
  const correctAnswers = useMemo(() => getAnswers(pyramid), [pyramid])
  const position = getPosition(levelNr)

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center focus:outline-none"
      tabIndex={0}
      autoFocus
      onKeyDown={handleKeyDown}
    >
      {floorStartIndices.map((startIndex, floor) => {
        // if complete, check if all answers of this row are correct
        const isCorrect = blocks
          .slice(startIndex, startIndex + floor + 1)
          .filter((block) => block.isOpen)
          .every((block) => values[block.id] === correctAnswers?.[block.id])

        return (
          <div key={floor} className="mb-[-1px] flex justify-center">
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
                  className="border-yellow-600 bg-yellow-200"
                >
                  {block.value !== undefined ? (
                    block.value
                  ) : (
                    <span className="text-xl text-yellow-600">
                      {hyroglyphs[(startIndex + index) % hyroglyphs.length]}
                    </span>
                  )}
                </Block>
              )
            })}
            <div
              className={clsx(
                "ml-6 flex h-10 w-10 items-center justify-center text-lg font-bold transition-opacity delay-200 text-shadow-amber-200 text-shadow-md",
                complete ? "opacity-100" : "opacity-0"
              )}
            >
              {isCorrect ? "✔️" : "❌"}
            </div>
          </div>
        )
      })}
      <div
        className={clsx(
          "absolute bottom-0 -z-10 pb-5 text-5xl",
          position === "right" && "right-0",
          position === "right-mirror" && "right-0 rotate-y-180",
          position === "left" && "left-[-10%]",
          position === "left-mirror" && "left-[-10%] rotate-y-180"
        )}
      >
        {decorationEmoji[levelNr % decorationEmoji.length]}
      </div>
    </div>
  )
}
