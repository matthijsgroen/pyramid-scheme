import { useEffect, type FC } from "react"
import type { PyramidLevel } from "@/game/types"
import { PyramidDisplay } from "@/app/PyramidLevel/PyramidDisplay"
import { isValid } from "@/game/state"
import { LevelCompletedOverlay } from "@/app/PyramidLevel/LevelCompletedOverlay"
import { useGameStorage } from "@/support/useGameStorage"

export const Level: FC<{
  content: PyramidLevel
  storageKey?: string
  onComplete?: () => void
  decorationOffset?: number
}> = ({ content, storageKey, onComplete, decorationOffset = 0 }) => {
  const [storedAnswers, setAnswers] = useGameStorage<{
    key: string
    values: Record<string, number | undefined>
  }>("levelAnswers", { key: storageKey ?? "dummy", values: {} })

  const answers =
    storedAnswers.key === storageKey && storageKey ? storedAnswers.values : {}

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
          decorationOffset={decorationOffset}
          values={answers}
          onAnswer={
            storageKey
              ? (blockId: string, value: number | undefined) => {
                  setAnswers((prev) => {
                    if (prev.key !== storageKey) {
                      return { key: storageKey, values: { [blockId]: value } }
                    }
                    return {
                      key: storageKey,
                      values: { ...prev.values, [blockId]: value },
                    }
                  })
                }
              : undefined
          }
        />
      </div>
      {completed && <LevelCompletedOverlay />}
    </div>
  )
}
