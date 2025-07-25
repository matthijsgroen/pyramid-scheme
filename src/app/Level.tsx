import { useEffect, useState, type FC } from "react"
import type { PyramidLevel } from "../game/types"
import { PyramidDisplay } from "./PyramidDisplay"
import { isValid } from "../game/state"
import { LevelCompletedOverlay } from "./LevelCompletedOverlay"
import { mulberry32 } from "../game/random"
import clsx from "clsx"

const decorationEmoji = ["🐫", "🐪", "🐐", "🌴", "🪨"]

const getPosition = (
  levelNr: number
): "left" | "left-mirror" | "right" | "right-mirror" => {
  return ["left", "left-mirror", "right", "right-mirror"][
    Math.floor(mulberry32(levelNr)() * 4)
  ]
}

export const Level: FC<{ content: PyramidLevel; onComplete?: () => void }> = ({
  content,
  onComplete,
}) => {
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({})

  const completed = isValid({
    levelNr: content.levelNr,
    pyramid: content.pyramid,
    values: answers,
  })
  // Placeholder for Level component logic
  useEffect(() => {
    if (completed) {
      const stopTimeout = setTimeout(() => {
        onComplete?.()
      }, 2000)
      return () => clearTimeout(stopTimeout)
    }
  }, [completed, onComplete])
  const position = getPosition(content.levelNr)

  return (
    <div className="relative level-container flex flex-col w-full">
      <div
        className={clsx(
          "absolute bottom-0 pb-10 text-5xl -z-10",
          position === "right" && "right-[90%]",
          position === "right-mirror" && "rotate-y-180 right-[10%]",
          position === "left" && "left-0",
          position === "left-mirror" && "rotate-y-180 left-0"
        )}
      >
        {decorationEmoji[content.levelNr % decorationEmoji.length]}
      </div>
      <div className="flex-1 flex items-center justify-center py-8 w-full">
        <PyramidDisplay
          pyramid={content.pyramid}
          values={answers}
          onAnswer={(blockId: string, value: number | undefined) => {
            setAnswers((prev) => ({ ...prev, [blockId]: value }))
          }}
        />
      </div>
      {completed && <LevelCompletedOverlay />}
    </div>
  )
}
