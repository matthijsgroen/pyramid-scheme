import { useJourneys, type CombinedJourneyState } from "@/app/state/useJourneys"
import { use, useCallback, useEffect, useMemo, useRef, useState, type FC } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { useTranslation } from "react-i18next"
import { TombPuzzle } from "./TombLevel/TombPuzzle"
import { useTableauTranslations } from "@/data/useTableauTranslations"
import { generateNewSeed, mulberry32 } from "@/game/random"
import { buildTombCalculationSettings, generateRewardCalculation } from "@/game/generateRewardCalculation"
import type { TreasureTombJourney } from "@/data/journeys"
import { ComparePuzzle } from "./TombLevel/ComparePuzzle"
import { TombBackdrop } from "@/ui/TombBackdrop"
import { FezContext } from "./fez/context"
import { DeveloperButton } from "@/ui/DeveloperButton"
import { DevelopContext } from "@/contexts/DevelopMode"
import { Header } from "@/ui/Header"
import { SiteMapScreen } from "./SiteMap/SiteMapScreen"
import { useTimeout } from "@/support/useTimeout"

export const TombExpedition: FC<{
  activeJourney: CombinedJourneyState
  onLevelComplete?: () => void
  onJourneyComplete?: () => void
  onClose?: () => void
  onFindHieroglyphs?: () => void
}> = ({ onClose, activeJourney, onLevelComplete, onJourneyComplete, onFindHieroglyphs }) => {
  const { t } = useTranslation("common")
  const tableaux = useTableauTranslations()

  const journey = activeJourney.journey as TreasureTombJourney
  const { completeLevel } = useJourneys()

  const { showConversation } = use(FezContext)
  const { isDevelopMode } = use(DevelopContext)
  const [tombTutorialSeen, setTombTutorialSeen] = useGameStorage<boolean>("tombTutorialSeen", false)
  const tutorialSeenAtMount = useRef(tombTutorialSeen)

  useEffect(() => {
    if (!tutorialSeenAtMount.current) {
      showConversation("tombIntro", () => {
        setTombTutorialSeen(true)
        showConversation("tombTutorial")
      })
    } else {
      showConversation("tombIntro")
    }
  }, [showConversation, setTombTutorialSeen])

  const runTableaus = tableaux.filter(
    tab => tab.tombJourneyId === activeJourney.journeyId && tab.runNumber === activeJourney.completionCount + 1
  )
  const [completing, setCompleting] = useState(false)
  const [scheduleCompleting] = useTimeout()

  const handleLevelComplete = useCallback(() => {
    if (completing) return
    setCompleting(true)
    scheduleCompleting(500, () => {
      completeLevel()
      onLevelComplete?.()
      setCompleting(false)
    })
  }, [completeLevel, onLevelComplete, completing, scheduleCompleting])

  // ── V3: site-map path ─────────────────────────────────────────────────────
  const [showComparePuzzle, setShowComparePuzzle] = useState(false)

  const handleSiteComplete = useCallback(() => {
    completeLevel()
    if (journey.levelSettings.compareAmount > 0) {
      setShowComparePuzzle(true)
    } else {
      onLevelComplete?.()
    }
  }, [completeLevel, journey.levelSettings.compareAmount, onLevelComplete])

  // ── V1 (legacy): hooks must be unconditional, computed regardless of path ──
  const legacySeed = generateNewSeed(activeJourney.randomSeed, activeJourney.levelNr)
  const legacyTableau = runTableaus[activeJourney.levelNr - 1]
  const legacyCalculation = useMemo(() => {
    const random = mulberry32(legacySeed)
    if (!legacyTableau) return null
    return generateRewardCalculation(buildTombCalculationSettings(journey.levelSettings, legacyTableau), random)
  }, [legacySeed, legacyTableau, journey.levelSettings])

  if (journey.siteConfigs) {
    const siteConfig = journey.siteConfigs[0]
    const seed = generateNewSeed(activeJourney.randomSeed, activeJourney.completionCount)

    if (showComparePuzzle) {
      return (
        <TombBackdrop className="relative flex h-dvh flex-col" difficulty={journey.difficulty}>
          <ComparePuzzle activeJourney={activeJourney} onComplete={onJourneyComplete} />
        </TombBackdrop>
      )
    }

    return (
      <TombBackdrop className="relative flex h-dvh flex-col" difficulty={journey.difficulty}>
        <SiteMapScreen
          journeyId={journey.id}
          siteConfig={siteConfig}
          seed={seed}
          onSiteComplete={handleSiteComplete}
          onCancel={onClose ?? (() => {})}
          renderPuzzle={(floor, onSolved, onCancelPuzzle) => {
            const tableau = runTableaus[floor]
            if (!tableau) return null
            const random = mulberry32(generateNewSeed(seed, floor))
            const calculation = generateRewardCalculation(
              buildTombCalculationSettings(journey.levelSettings, tableau),
              random
            )
            if (!calculation) return null
            return (
              <div className="fixed inset-0 z-20">
                <TombPuzzle
                  key={`${journey.id}-floor-${floor}`}
                  tableau={tableau}
                  calculation={calculation}
                  difficulty={journey.difficulty}
                  onComplete={onSolved}
                  onFindHieroglyphs={onFindHieroglyphs}
                />
                <button
                  onClick={onCancelPuzzle}
                  className="absolute top-4 left-4 z-10 rounded bg-stone-800/80 px-3 py-1 text-sm text-amber-200"
                >
                  ← Back
                </button>
              </div>
            )
          }}
        />
      </TombBackdrop>
    )
  }

  // ── V1 (legacy) render ────────────────────────────────────────────────────
  // if there are no run Tableaus, that means there is nothing to discover at this tomb anymore!
  if (legacyTableau === undefined || legacyCalculation === null) {
    return (
      <TombBackdrop
        className="relative flex h-dvh flex-col"
        scale="small"
        zoom={completing}
        fade={completing}
        difficulty={journey.difficulty}
      >
        <div className="flex h-full w-full flex-col">
          <div className="flex-shrink-0 backdrop-blur-xs">
            <Header className="text-white">
              <button onClick={onClose} className="cursor-pointer text-lg font-bold focus:outline-none">
                {t("ui.backArrow")}
              </button>
              <h1 className="pointer-events-none mt-0 inline-block pt-4 font-pyramid font-bold lg:text-2xl">
                {journey.name}
              </h1>
              <span></span>
            </Header>
          </div>
          {/* final puzzle for treasure */}
          <ComparePuzzle activeJourney={activeJourney} onComplete={onJourneyComplete} />
        </div>
      </TombBackdrop>
    )
  }

  return (
    <TombBackdrop
      className="relative flex h-dvh flex-col"
      zoom={completing}
      fade={completing}
      difficulty={journey.difficulty}
    >
      <div className="flex h-full w-full flex-col">
        <div className="flex-shrink-0 backdrop-blur-xs">
          <Header className="text-white">
            <button onClick={onClose} className="cursor-pointer text-lg font-bold focus:outline-none">
              {t("ui.backArrow")}
            </button>
            <h1 className="pointer-events-none mt-0 inline-block font-pyramid font-bold lg:text-2xl">
              {journey.name} {activeJourney.levelNr}/{journey.levelCount}
            </h1>
            <span className="flex items-center gap-2">
              <button
                onClick={() => showConversation("tombTutorial", undefined, { forceReplay: true })}
                className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white hover:bg-white/30"
                aria-label={t("ui.howToPlay")}
              >
                ?
              </button>
              {isDevelopMode && (
                <DeveloperButton
                  onClick={() => {
                    handleLevelComplete()
                  }}
                  label="Complete Level"
                />
              )}
            </span>
          </Header>
        </div>
        <TombPuzzle
          key={activeJourney.journeyId + activeJourney.levelNr}
          tableau={legacyTableau}
          calculation={legacyCalculation}
          difficulty={journey.difficulty}
          onComplete={handleLevelComplete}
          onFindHieroglyphs={onFindHieroglyphs}
        />
      </div>
    </TombBackdrop>
  )
}
