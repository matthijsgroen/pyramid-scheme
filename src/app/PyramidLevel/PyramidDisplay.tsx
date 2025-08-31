import { useMemo, useRef, type FC } from "react"
import { usePyramidNavigation } from "@/app/PyramidLevel/usePyramidNavigation"
import type { Pyramid } from "@/game/types"
import { Block } from "@/ui/Block"
import { InputBlock } from "@/ui/InputBlock"
import { getAnswers, isComplete } from "@/game/state"
import clsx from "clsx"
import { mulberry32 } from "@/game/random"
import { hieroglyphs } from "@/data/hieroglyphs"
import { createFloorStartIndices } from "./support"
import type { DayNightCycleStep } from "@/ui/backdropSelection"

const decorationEmoji = ["🐫", "🐪", "🐐", "🌴", "🪨"]

const getPosition = (levelNr: number): "left" | "left-mirror" | "right" | "right-mirror" => {
  return ["left", "left-mirror", "right", "right-mirror"][Math.floor(mulberry32(levelNr)() * 4)] as
    | "left"
    | "left-mirror"
    | "right"
    | "right-mirror"
}

const dayTimeBlockColors: Record<DayNightCycleStep, string> = {
  night: "border-blue-600 bg-blue-200 text-blue-900",
  morning: "border-orange-600 bg-orange-200 text-orange-900",
  afternoon: "border-yellow-600 bg-yellow-200 text-yellow-900",
  evening: "border-orange-600 bg-orange-200 text-orange-900",
}

const dayTimeHieroglyphColors: Record<DayNightCycleStep, string> = {
  night: "text-blue-600",
  morning: "text-orange-600",
  afternoon: "text-yellow-600",
  evening: "text-orange-600",
}

export const PyramidDisplay: FC<{
  levelNr: number
  pyramid: Pyramid
  decorationOffset?: number
  values: Record<string, number | undefined>
  completed?: boolean
  dayTime?: DayNightCycleStep
  onAnswer?: (blockId: string, value: number | undefined) => void
}> = ({ pyramid, values, completed = false, onAnswer, levelNr, decorationOffset = 0, dayTime = "afternoon" }) => {
  const { blocks } = pyramid

  // Render the pyramid blocks
  const floorCount = pyramid.floorCount
  const floorStartIndices = createFloorStartIndices(floorCount)
  const containerRef = useRef<HTMLDivElement>(null)
  const { selectedBlockIndex, setSelectedBlockIndex, focusInput, setFocusInput, handleKeyDown } = usePyramidNavigation(
    floorStartIndices,
    floorCount,
    blocks,
    onAnswer
  )
  const complete = !focusInput && isComplete({ levelNr: 1, pyramid, values })
  const correctAnswers = useMemo(() => getAnswers(pyramid), [pyramid])
  const decorationNumber = levelNr + decorationOffset
  const position = getPosition(decorationNumber)

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
          .filter(block => block.isOpen)
          .every(block => values[block.id] === correctAnswers?.[block.id])

        return (
          <div key={floor} className="mb-[-1px] flex justify-center">
            {Array.from({ length: floor + 1 }, (_, index) => {
              const blockIndex = startIndex + index
              const block = blocks[blockIndex]
              return block.isOpen ? (
                <InputBlock
                  key={block.id}
                  value={values[block.id]}
                  selected={selectedBlockIndex === startIndex + index && !completed}
                  disabled={complete && isCorrect}
                  shouldFocus={selectedBlockIndex === startIndex + index && focusInput}
                  onSelect={() => setSelectedBlockIndex(startIndex + index)}
                  onBlur={() => {
                    setFocusInput(false)
                    containerRef.current?.focus()
                  }}
                  onChange={value => onAnswer?.(block.id, value)}
                />
              ) : (
                <Block
                  key={block.id}
                  selected={selectedBlockIndex === startIndex + index}
                  className={clsx(dayTimeBlockColors[dayTime], "transition-colors duration-1000")}
                >
                  {block.value !== undefined ? (
                    block.value
                  ) : (
                    <span className={clsx("text-xl", dayTimeHieroglyphColors[dayTime])}>
                      {hieroglyphs[(startIndex + index) % hieroglyphs.length]}
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
          dayTime === "night" && "brightness-50 saturate-80",
          dayTime === "morning" && "brightness-40 saturate-125",
          dayTime === "evening" && "brightness-20 saturate-125",
          "absolute bottom-0 -z-10 pb-5 text-5xl",
          position === "right" && "right-0",
          position === "right-mirror" && "right-0 rotate-y-180",
          position === "left" && "left-[-10%]",
          position === "left-mirror" && "left-[-10%] rotate-y-180"
        )}
      >
        {decorationEmoji[decorationNumber % decorationEmoji.length]}
        <span
          className={clsx(
            "absolute inline-block origin-bottom rotate-x-180 opacity-20 brightness-0",
            dayTime === "morning" && "bottom-6 scale-y-100 -skew-x-45",
            dayTime === "afternoon" && "bottom-6 scale-y-45",
            dayTime === "night" && "bottom-6 scale-y-25 skew-x-45",
            dayTime === "evening" && "bottom-6 scale-y-50 skew-x-45",
            position === "right" && "right-0",
            position === "right-mirror" && "right-0",
            position === "left" && "left-[-10%]",
            position === "left-mirror" && "left-[-10%]"
          )}
        >
          {decorationEmoji[decorationNumber % decorationEmoji.length]}
        </span>
      </div>
    </div>
  )
}
