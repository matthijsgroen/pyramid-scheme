import { type FC, useEffect, useRef } from "react"
import type { PyramidLevel } from "@/game/types"
import { PyramidDisplay } from "@/app/PyramidLevel/PyramidDisplay"
import { isValid } from "@/game/state"
import { useLevelAnswers } from "@/app/PyramidLevel/useLevelAnswers"
import type { DayNightCycleStep } from "@/ui/atoms/backdropSelection"

export const Level: FC<{
  content: PyramidLevel
  storageKey?: string
  onComplete?: () => void
  decorationOffset?: number
  dayTime?: DayNightCycleStep
  entranceBlockId?: string
  interactive?: boolean
}> = ({ content, storageKey, onComplete, decorationOffset = 0, dayTime, entranceBlockId, interactive = true }) => {
  const { answers, loaded, setAnswer, clearAnswers } = useLevelAnswers(storageKey)

  const completed = isValid({
    levelNr: content.levelNr,
    pyramid: content.pyramid,
    values: answers,
  })

  // Whether the player has entered anything on this board during this visit. Distinguishes a
  // solution they just finished from one restored out of storage.
  const answeredThisVisitRef = useRef(false)

  // Track previous completion state to only trigger when it changes
  const prevCompletedRef = useRef(false)

  // Trigger completion callback when level is completed
  useEffect(() => {
    if (completed && !prevCompletedRef.current && answeredThisVisitRef.current && onComplete) {
      onComplete()
    }
    prevCompletedRef.current = completed
  }, [completed, onComplete])

  // A board restored from storage already solved is never useful — every input ends up `disabled`
  // and every block deselected, so the player can't touch it. Re-entering a pyramid means
  // re-solving its exterior board (see Travel's revisit path), so drop the stale solution and hand
  // them an empty one. Only a *finished* solution is dropped; a partial one is what the slot is for.
  // `storageKey` first: a board rendered as scenery owns no slot and must never write to the one
  // the playable board is using.
  useEffect(() => {
    if (!storageKey || !loaded || !completed || answeredThisVisitRef.current) return
    clearAnswers()
  }, [storageKey, loaded, completed, clearAnswers])

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="flex w-full flex-1 items-center justify-center">
        <PyramidDisplay
          levelNr={content.levelNr}
          pyramid={content.pyramid}
          dayTime={dayTime}
          decorationOffset={decorationOffset}
          values={answers}
          completed={completed}
          entranceBlockId={entranceBlockId}
          interactive={interactive}
          onAnswer={
            storageKey
              ? (blockId: string, value: number | undefined) => {
                  answeredThisVisitRef.current = true
                  setAnswer(blockId, value)
                }
              : undefined
          }
        />
      </div>
    </div>
  )
}
