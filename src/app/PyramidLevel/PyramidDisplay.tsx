import { useMemo, useRef, useState, type FC } from "react"
import { usePyramidNavigation } from "@/app/PyramidLevel/usePyramidNavigation"
import type { Pyramid } from "@/game/types"
import { Block } from "@/ui/Block"
import { InputBlock } from "@/ui/InputBlock"
import { HieroglyphUnlockPanel } from "@/ui/HieroglyphUnlockPanel"
import { getAnswers, isComplete } from "@/game/state"
import clsx from "clsx"
import { mulberry32 } from "@/game/random"
import { hieroglyphs } from "@/data/hieroglyphs"
import { createFloorStartIndices } from "./support"
import type { DayNightCycleStep } from "@/ui/backdropSelection"
import type { Difficulty } from "@/data/difficultyLevels"
import { useInventory } from "@/app/Inventory/useInventory"
import { getUnlockArtifactId, getUnlockArtifactIds } from "./hieroglyphUnlockLogic"

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
  errorHighlightCount?: number
  earlyFeedbackBlockIds?: string[]
  hieroglyphUnlockCount?: number
  pyramidDifficulty?: Difficulty
  entranceBlockId?: string
  onAnswer?: (blockId: string, value: number | undefined) => void
}> = ({
  pyramid,
  values,
  completed = false,
  onAnswer,
  levelNr,
  decorationOffset = 0,
  dayTime = "afternoon",
  errorHighlightCount = 0,
  earlyFeedbackBlockIds = [],
  hieroglyphUnlockCount = 0,
  pyramidDifficulty = "starter",
  entranceBlockId,
}) => {
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
  const [checkedBlocks, setCheckedBlocks] = useState<Set<string>>(new Set())
  const [unlockedBlocks, setUnlockedBlocks] = useState<Set<string>>(new Set())
  const [pendingUnlockBlockId, setPendingUnlockBlockId] = useState<string | null>(null)
  const remainingCharges = hieroglyphUnlockCount - unlockedBlocks.size
  const { inventory } = useInventory()
  const artifactId = getUnlockArtifactId(inventory, unlockedBlocks.size)
  const allArtifactIds = getUnlockArtifactIds(inventory)
  const remainingArtifactIds = allArtifactIds.slice(unlockedBlocks.size + 1)
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
              const blockValue = values[block.id]
              const isEarlyFeedback = earlyFeedbackBlockIds.includes(block.id)
              const isChecked = checkedBlocks.has(block.id)
              const blockFeedback = isEarlyFeedback
                ? blockValue === undefined
                  ? "pending"
                  : blockValue === correctAnswers?.[block.id]
                    ? "correct"
                    : "incorrect"
                : isChecked
                  ? blockValue === correctAnswers?.[block.id]
                    ? "correct"
                    : "incorrect"
                  : undefined

              const blockEl = block.isOpen ? (
                <InputBlock
                  value={blockValue}
                  selected={selectedBlockIndex === startIndex + index && !completed}
                  disabled={complete && isCorrect}
                  shouldFocus={selectedBlockIndex === startIndex + index && focusInput}
                  feedback={blockFeedback}
                  onSelect={() => setSelectedBlockIndex(startIndex + index)}
                  onBlur={() => {
                    if (
                      errorHighlightCount > 0 &&
                      !isEarlyFeedback &&
                      blockValue !== undefined &&
                      blockValue !== correctAnswers?.[block.id] &&
                      !isChecked &&
                      checkedBlocks.size < errorHighlightCount
                    ) {
                      setCheckedBlocks(prev => new Set([...prev, block.id]))
                    }
                    setFocusInput(false)
                    containerRef.current?.focus()
                  }}
                  onChange={value => onAnswer?.(block.id, value)}
                />
              ) : block.value === undefined && unlockedBlocks.has(block.id) ? (
                // Hieroglyph block that has been unlocked — behaves as InputBlock
                <InputBlock
                  value={blockValue}
                  selected={selectedBlockIndex === startIndex + index && !completed}
                  disabled={complete && isCorrect}
                  shouldFocus={selectedBlockIndex === startIndex + index && focusInput}
                  feedback={
                    isChecked ? (blockValue === correctAnswers?.[block.id] ? "correct" : "incorrect") : undefined
                  }
                  onSelect={() => setSelectedBlockIndex(startIndex + index)}
                  onBlur={() => {
                    if (
                      errorHighlightCount > 0 &&
                      !isEarlyFeedback &&
                      blockValue !== undefined &&
                      blockValue !== correctAnswers?.[block.id] &&
                      !isChecked &&
                      checkedBlocks.size < errorHighlightCount
                    ) {
                      setCheckedBlocks(prev => new Set([...prev, block.id]))
                    }
                    setFocusInput(false)
                    containerRef.current?.focus()
                  }}
                  onChange={value => onAnswer?.(block.id, value)}
                />
              ) : (
                <Block
                  selected={selectedBlockIndex === startIndex + index}
                  unlockable={block.value === undefined && remainingCharges > 0}
                  onClick={
                    block.value === undefined && remainingCharges > 0
                      ? () => setPendingUnlockBlockId(block.id)
                      : undefined
                  }
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

              return entranceBlockId === block.id ? (
                <div key={block.id} className="animate-stone-bg rounded">
                  <div className="animate-stone-entrance">{blockEl}</div>
                </div>
              ) : (
                <span key={block.id}>{blockEl}</span>
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
      {pendingUnlockBlockId !== null && artifactId && (
        <HieroglyphUnlockPanel
          hieroglyphSymbol={
            hieroglyphs[pyramid.blocks.findIndex(b => b.id === pendingUnlockBlockId) % hieroglyphs.length]
          }
          hieroglyphDifficulty={pyramidDifficulty}
          artifactId={artifactId}
          remainingArtifactIds={remainingArtifactIds}
          onUnlock={() => {
            setUnlockedBlocks(prev => new Set([...prev, pendingUnlockBlockId]))
            setPendingUnlockBlockId(null)
          }}
          onDismiss={() => setPendingUnlockBlockId(null)}
        />
      )}

      <div className="absolute top-full right-12 left-0 z-[-1] h-0 overflow-visible">
        <div
          className={clsx(
            "w-full bg-black/10 [clip-path:polygon(0_0,46%_100%,100%_0)]",
            dayTime === "night" || dayTime === "afternoon" ? "h-10" : "h-20"
          )}
        />
      </div>
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
            dayTime === "morning" && "bottom-6 scale-y-100",
            dayTime === "afternoon" && "bottom-6 scale-y-45",
            dayTime === "night" && "bottom-6 scale-y-25",
            dayTime === "evening" && "bottom-6 scale-y-50",
            dayTime !== "afternoon" && position === "right" && "-skew-x-45",
            dayTime !== "afternoon" && position === "right-mirror" && "skew-x-45",
            dayTime !== "afternoon" && position === "left" && "skew-x-45",
            dayTime !== "afternoon" && position === "left-mirror" && "-skew-x-45",
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
