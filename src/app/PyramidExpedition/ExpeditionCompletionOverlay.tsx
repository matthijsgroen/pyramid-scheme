import { useJourneyTranslation } from "@/app/translations/useJourneyTranslations"
import { use, useEffect, type FC } from "react"
import { useTranslation } from "react-i18next"
import { journeys as allJourneys, type PyramidJourney } from "@/data/journeys"
import { useJourneys, type CombinedJourneyState } from "../state/useJourneys"
import { useMergedJourneyContributions } from "@/app/pages/journeyContributions"
import { FezContext } from "../fez/context"

export const ExpeditionCompletionOverlay: FC<{
  onJourneyComplete?: () => void
  onStartJourney?: (journeyId: string) => void
  newPyramidJourneyId?: string
  activeJourney: CombinedJourneyState
}> = ({ onJourneyComplete, onStartJourney, newPyramidJourneyId, activeJourney }) => {
  const { t } = useTranslation("common")
  const { getJourney } = useJourneys()
  const { lock } = useMergedJourneyContributions()
  const journey = activeJourney.journey as PyramidJourney
  const { showConversation } = use(FezContext)

  useEffect(() => {
    showConversation("expeditionCompleted")
  }, [showConversation])

  const newPyramidJourneyName = useJourneyTranslation(newPyramidJourneyId ?? "id")?.name

  // The tier's tomb, announced the run its lock comes open — asking the lock itself, so a tomb
  // whose pieces are shared with a sibling tomb is judged on what it actually needs.
  const tombJourney = allJourneys.find(j => j.type === "treasure_tomb" && j.difficulty === journey.difficulty)
  const tombLock = tombJourney ? lock(tombJourney.id) : undefined
  const tombState = tombJourney ? getJourney(tombJourney.id) : undefined
  const newTombJourneyId =
    tombJourney && tombLock && tombLock.found >= tombLock.required && (tombState?.completionCount ?? 0) === 0
      ? tombJourney.id
      : undefined
  const newTombJourneyName = useJourneyTranslation(newTombJourneyId ?? "id")?.name

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="flex flex-col gap-4 rounded-lg bg-white/80 p-4 backdrop-blur-md">
        <span className="text-center font-pyramid text-2xl font-bold text-green-500">
          {t("ui.expeditionCompleted")}
        </span>
        {newPyramidJourneyId && (
          <span className="mt-2 text-center text-yellow-700">
            {t("ui.newExpeditionUnlocked")}: <strong className="font-semibold">{newPyramidJourneyName}</strong>
          </span>
        )}
        {newTombJourneyId && (
          <span className="mt-2 text-center text-yellow-700">
            {t("ui.newTombUnlocked")}: <strong className="font-semibold">{newTombJourneyName}</strong>
          </span>
        )}
        <div className="mt-2 flex flex-col gap-2">
          {newPyramidJourneyId && (
            <button
              className="rounded bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600"
              onClick={() => onStartJourney?.(newPyramidJourneyId)}
            >
              {t("ui.startJourney", { name: newPyramidJourneyName })}
            </button>
          )}
          {newTombJourneyId && (
            <button
              className="rounded bg-stone-600 px-4 py-2 font-semibold text-white hover:bg-stone-700"
              onClick={() => onStartJourney?.(newTombJourneyId)}
            >
              {t("ui.startJourney", { name: newTombJourneyName })}
            </button>
          )}
          <button className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600" onClick={onJourneyComplete}>
            {t("ui.goBackToBase")}
          </button>
        </div>
      </div>
    </div>
  )
}
