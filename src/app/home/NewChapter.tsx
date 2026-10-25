import { useTranslation } from "react-i18next"
import type { Difficulty } from "@/data/difficultyLevels"
import { useMergedJourneyContributions } from "@/app/pages/journeyContributions"
import { useAvailableJourneyIds } from "@/app/pages/useAvailableJourneyIds"
import { useReport } from "@/app/reactions/useReport"
import { useJourneys } from "@/app/state/useJourneys"
import { useJourneyTranslations } from "@/app/translations/useJourneyTranslations"
import { continueJourney } from "@/app/home/continueJourney"
import { useHomeSave } from "@/app/home/useHomeSave"
import { NewChapterScreen } from "@/ui/organisms/NewChapterScreen"

// A tier opened: the card over the camp offers the tier's first open journey. Setting off and closing
// both mark the tier as seen, so it is announced once.
export const NewChapter = ({
  tier,
  startGame,
  onClose,
}: {
  tier: Difficulty
  startGame: () => void
  onClose: () => void
}) => {
  const { t } = useTranslation("common")
  const { markChapter } = useHomeSave()
  const { startJourney } = useJourneys()
  const report = useReport()
  const journeys = useJourneyTranslations()
  const available = useAvailableJourneyIds(journeys)
  const facts = useMergedJourneyContributions()

  // No journey in progress is named, so the rule picks the first open one, and only among this tier's.
  const offer = continueJourney({
    journeys: journeys.filter(j => j.difficulty === tier),
    isInProgress: () => false,
    completionCount: () => 0,
    levelNr: () => 1,
    available,
    lockOpen: id => {
      const lock = facts.lock(id)
      return !lock || lock.found >= lock.required
    },
    hidden: facts.hidden,
  })
  const journey = journeys.find(j => j.id === offer?.journeyId)
  const tierName = t(`difficulty.${tier}`)

  const close = () => {
    report({ kind: "chapterOpened", tier })
    void markChapter(tier)
    onClose()
  }

  return (
    <NewChapterScreen
      title={t("camp.chapter.title")}
      subtitle={t("camp.chapter.subtitle")}
      body={t("camp.chapter.body", { tier: tierName })}
      journeyName={journey?.name}
      journeyNote={journey && t("camp.chapter.journeyNote", { tier: tierName })}
      setOffLabel={t("camp.continue.setOff")}
      onSetOff={async () => {
        if (!journey) return
        report({ kind: "chapterOpened", tier })
        void markChapter(tier)
        await startJourney(journey)
        startGame()
      }}
      closeLabel={t("camp.chapter.later")}
      onClose={close}
    />
  )
}
