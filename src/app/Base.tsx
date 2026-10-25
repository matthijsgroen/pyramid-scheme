import { use, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import "@/mods/registerModApps"
import { TravelPage } from "@/app/pages/Travel"
import { CollectionPage } from "@/app/pages/Collection"
import { useCollectionNews } from "@/app/pages/useCollectionNews"
import { currentChapter } from "@/app/pages/journeyAvailability"
import { useMergedJourneyContributions } from "@/app/pages/journeyContributions"
import { useAvailableJourneyIds } from "@/app/pages/useAvailableJourneyIds"
import { SettingsModal } from "@/app/SettingsModal"
import { hudWidgets } from "@/app/SiteMap/hudRegistry"
import { useHeldKeysLoaded, useMergedHeldKeys } from "@/app/SiteMap/keyProviders"
import { LockEditorHost } from "@/app/dev/LockEditorHost"
import { useSecretTaps } from "@/app/dev/useSecretTaps"
import { FezContext } from "@/app/fez/context"
import { chapterToAnnounce, needsChapterRecord } from "@/game/homeSave"
import { useJourneys } from "@/app/state/useJourneys"
import { useTapHint } from "@/app/state/useTapHint"
import { useJourneyTranslations } from "@/app/translations/useJourneyTranslations"
import { DevelopContext } from "@/contexts/DevelopMode"
import { ComingHome } from "@/app/home/ComingHome"
import { useHomeHooks } from "@/app/home/homeHooks"
import { NewChapter } from "@/app/home/NewChapter"
import { useHomeSave } from "@/app/home/useHomeSave"
import { useCampFound } from "@/app/home/campFoundSource"
import { continueJourney, newToDiscoverCount } from "@/app/home/continueJourney"
import { useElementSize } from "@/app/home/useElementSize"
import { useIsDesktop } from "@/app/home/useIsDesktop"
import { useWindowEntrance } from "@/app/home/useWindowEntrance"
import { CampScene } from "@/ui/atoms/CampScene"
import { TapHint } from "@/ui/atoms/TapHint"
import { CampHud } from "@/ui/molecules/CampHud"
import { ContinueCard } from "@/ui/molecules/ContinueCard"
import { CampHomeLayout } from "@/ui/organisms/CampHomeLayout"
import { CampPopup } from "@/ui/organisms/CampPopup"

// Mounted once the player has settled in (after the coming-home screen), so a mod's hook never speaks behind it.
const HomeHooks = () => {
  useHomeHooks()
  return null
}

type Popup = "collection" | "window" | "journeys"

// Space kept between the card and the scene's lowest piece on a phone.
const CARD_GAP = 16

// The camp is the home screen: the scene with its entrances, a HUD, the "Verder met" card and, from `lg`,
// the journeys beside it. Everything else (collection, a mod's window, the journeys on a phone) opens as a
// popup over it.
export const Base = ({
  startGame,
  cameHome = false,
  onArrived,
}: {
  startGame: () => void
  /** The player just came back from a journey: the coming-home screen shows over the camp until it is done. */
  cameHome?: boolean
  onArrived?: () => void
}) => {
  const { t } = useTranslation("common")
  const { showConversation, speaking } = use(FezContext)
  const { isDevelopMode, setDevelopMode } = use(DevelopContext)
  const isDesktop = useIsDesktop()
  const [popup, setPopup] = useState<Popup | undefined>()
  const [showSettings, setShowSettings] = useState(false)
  const [chapterClosed, setChapterClosed] = useState(false)
  const [setOffHint, setOffTapped] = useTapHint("setOff")

  // Fez greets once the player has unpacked, not behind the coming-home screen.
  useEffect(() => {
    if (!cameHome) showConversation("welcome")
  }, [showConversation, cameHome])

  // Seven taps on the title toggles develop mode, on any build: phone playtesting happens against the
  // deployed one. See useSecretTaps for why seven taps is safe to ship.
  const { tap, remaining } = useSecretTaps(useCallback(() => setDevelopMode(prev => !prev), [setDevelopMode]))

  const [sceneRef, scene] = useElementSize()
  const [hudRef, hud] = useElementSize()
  const [cardRef, card] = useElementSize()
  const heldKeys = useMergedHeldKeys()
  const keysLoaded = useHeldKeysLoaded()
  const found = useCampFound()
  const chapter = currentChapter(heldKeys)
  const home = useHomeSave()
  const homeSave = { version: 1 as const, haul: [...home.haul], chapter: home.chapter }
  // A save with no record takes the chapter it is in without announcing it; only a tier reached after
  // the record is announced, and only once the coming-home screen has gone.
  // The chapter is read off the held keys, which start empty until their saves are read: wait for them too.
  const settled = home.loaded && keysLoaded
  const recordMissing = settled && needsChapterRecord(homeSave)
  const { markChapter } = home
  useEffect(() => {
    if (recordMissing) void markChapter(chapter)
  }, [recordMissing, markChapter, chapter])
  const announced = settled && !cameHome && !chapterClosed ? chapterToAnnounce(homeSave, chapter) : undefined
  const windowEntrance = useWindowEntrance()
  const news = useCollectionNews()

  const journeys = useJourneyTranslations()
  const { activeJourneyId, startJourney, getJourney, getUnexploredLevels } = useJourneys()
  const facts = useMergedJourneyContributions()
  const available = useAvailableJourneyIds(journeys)

  const offer = continueJourney({
    journeys,
    activeJourneyId,
    isInProgress: id => getJourney(id)?.inProgress ?? false,
    completionCount: id => getJourney(id)?.completionCount ?? 0,
    levelNr: id => getJourney(id)?.levelNr ?? 1,
    available,
    lockOpen: id => {
      const lock = facts.lock(id)
      return !lock || lock.found >= lock.required
    },
    hidden: facts.hidden,
  })
  const offered = journeys.find(j => j.id === offer?.journeyId)
  const toDiscover = newToDiscoverCount({
    journeys,
    completionCount: id => getJourney(id)?.completionCount ?? 0,
    unexploredLevels: id => new Set(getUnexploredLevels(id, heldKeys)),
  })

  const setOff = async () => {
    setOffTapped()
    if (!offer || !offered) return
    if (offer.mode === "start") await startJourney(offered)
    startGame()
  }

  const detail =
    offered &&
    (offered.exterior === "tomb"
      ? t("camp.continue.tomb", { tier: offered.difficultyLabel })
      : t("camp.continue.pyramid", {
          level: offer?.levelNr ?? 1,
          count: offer?.levelCount,
          tier: offered.difficultyLabel,
        }))

  const entrances = useMemo(
    () => ({
      chest: {
        label: t("camp.entrance.collection"),
        badge: news.total > 0 ? news.total : undefined,
        onOpen: () => setPopup("collection"),
      },
      window: windowEntrance && {
        label: windowEntrance.label,
        badge: windowEntrance.badge,
        onOpen: () => setPopup("window"),
      },
      mapTable: isDesktop ? undefined : { label: t("camp.entrance.journeys"), onOpen: () => setPopup("journeys") },
    }),
    [t, windowEntrance, isDesktop, news.total]
  )

  const continueCard = (
    <ContinueCard
      heading={t("camp.continue.heading")}
      journeyName={offered?.name}
      detail={detail}
      setOffLabel={t("camp.continue.setOff")}
      onSetOff={setOff}
      allJourneysLabel={t("camp.continue.allJourneys")}
      onAllJourneys={isDesktop ? undefined : () => setPopup("journeys")}
      emptyText={t("camp.continue.empty")}
      hint={
        toDiscover > 0
          ? {
              text: t("camp.hint", { count: toDiscover }),
              onOpen: isDesktop ? undefined : () => setPopup("journeys"),
            }
          : undefined
      }
      setOffSlot={button => <TapHint show={setOffHint && !speaking}>{button}</TapHint>}
    />
  )

  const closePopup = () => setPopup(undefined)
  const popupTitle = {
    collection: t("camp.entrance.collection"),
    window: windowEntrance?.entrance.title(t) ?? "",
    journeys: t("camp.entrance.journeys"),
  }
  const WindowScreen = windowEntrance?.entrance.Screen

  return (
    <>
      <CampHomeLayout
        hud={
          <div ref={hudRef}>
            <CampHud
              title={t("camp.title")}
              onTitleTap={tap}
              tapsLeft={remaining}
              devBadge={isDevelopMode ? "DEV" : undefined}
              settingsLabel={t("ui.settings")}
              onSettings={() => setShowSettings(true)}
            >
              {hudWidgets().map(({ id, Component }) => (
                <Component key={id} />
              ))}
            </CampHud>
          </div>
        }
        sceneRef={sceneRef}
        scene={
          scene.width > 0 && (
            <CampScene
              width={scene.width}
              height={scene.height}
              chapter={chapter}
              found={found}
              insets={{ top: hud.height, bottom: isDesktop ? 0 : card.height + CARD_GAP }}
              entrances={entrances}
            />
          )
        }
        card={<div ref={cardRef}>{continueCard}</div>}
        aside={isDesktop ? <TravelPage startGame={startGame} hints={false} /> : undefined}
      />
      {popup && (
        <CampPopup
          title={popupTitle[popup]}
          closeLabel={t("camp.close")}
          onClose={closePopup}
          fill={popup === "window"}
        >
          {popup === "collection" && <CollectionPage />}
          {popup === "window" && WindowScreen && <WindowScreen />}
          {popup === "journeys" && <TravelPage startGame={startGame} />}
        </CampPopup>
      )}
      {cameHome && <ComingHome onDone={() => onArrived?.()} />}
      {settled && !cameHome && !announced && <HomeHooks />}
      {announced && <NewChapter tier={announced} startGame={startGame} onClose={() => setChapterClosed(true)} />}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} startGame={startGame} />
      {isDevelopMode && <LockEditorHost />}
    </>
  )
}
