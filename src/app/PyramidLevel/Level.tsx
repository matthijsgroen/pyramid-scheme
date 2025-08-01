import { useEffect, useState, type FC } from "react"
import type { PyramidLevel } from "../../game/types"
import { PyramidDisplay } from "./PyramidDisplay"
import { isValid } from "../../game/state"
import { LevelCompletedOverlay } from "./LevelCompletedOverlay"

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

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="flex w-full flex-1 items-center justify-center py-8">
        <PyramidDisplay
          levelNr={content.levelNr}
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
