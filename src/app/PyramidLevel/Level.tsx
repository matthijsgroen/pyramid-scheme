import { type FC, useEffect, useMemo, useRef } from "react"
import type { PyramidLevel } from "@/game/types"
import { PyramidDisplay } from "@/app/PyramidLevel/PyramidDisplay"
import { getAnswers, isValid } from "@/game/state"
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
  /** A board this journey has already solved: the numbers are shown instead of being asked for again. */
  revealed?: boolean
}> = ({
  content,
  storageKey,
  onComplete,
  decorationOffset = 0,
  dayTime,
  entranceBlockId,
  interactive = true,
  revealed = false,
}) => {
  const { answers: typed, loaded, setAnswer, clearAnswers } = useLevelAnswers(storageKey)

  // A revealed board stores nothing: the pyramid carries the sums, so its solution is derived here
  // rather than remembered from the run that first worked it out.
  const solution = useMemo(() => (revealed ? getAnswers(content.pyramid) : undefined), [revealed, content.pyramid])
  const answers = solution ?? typed

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
  // and every block deselected, so the player can't touch it. Drop the stale solution and hand them
  // an empty one; only a *finished* solution is dropped, a partial one is what the slot is for.
  // `storageKey` first: a board rendered as scenery owns no slot and must never write to the one
  // the playable board is using. A revealed board owns no slot either — its numbers are derived.
  useEffect(() => {
    if (revealed || !storageKey || !loaded || !completed || answeredThisVisitRef.current) return
    clearAnswers()
  }, [revealed, storageKey, loaded, completed, clearAnswers])

  return (
    <div className="relative flex size-full flex-col">
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
            storageKey && !revealed
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
