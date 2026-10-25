import { useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { ConfirmModal } from "@/ui/atoms/ConfirmModal"
import { JourneyRow } from "@/ui/molecules/JourneyRow"
import { JourneyStops, type JourneyStop } from "@/ui/molecules/JourneyStops"
import { TierHeader } from "@/ui/molecules/TierHeader"
import { JourneyList, type JourneyListGroup } from "@/ui/organisms/JourneyList"
import { useJourneys } from "@/app/state/useJourneys"
import { useMergedDetectorLevels } from "@/app/SiteMap/detectorLevels"
import { useMergedHeldKeys, useMergedKeyDisplay } from "@/app/SiteMap/keyProviders"
import { useJourneyTranslations, type TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import type { Difficulty } from "@/data/difficultyLevels"
import { isWebKey } from "@/game/floorLock"

import { allJourneys, type JourneyRowModel, type TierGroup } from "./allJourneys"
import { journeyCardSlots } from "./journeyCardSlots"
import "@/mods/registerModApps" // populate the journey-card slot registry, as Collection does for its sections
import { comingSoonDifficulty, isTierUnlocked, tierKeyNeed } from "./journeyAvailability"
import { useAvailableJourneyIds } from "./useAvailableJourneyIds"
import { useMergedJourneyContributions } from "./journeyContributions"

// Every journey the player may see in one list, newest tier first. Tapping one goes there; the chevron
// opens its sites. The model (allJourneys) decides what is listed; this draws it and acts on the taps.
export const AllJourneys: FC<{ startGame: () => void; compact?: boolean }> = ({ startGame, compact = false }) => {
  const { t } = useTranslation("common")
  const journeys = useJourneyTranslations()
  const {
    activeJourneyId,
    startJourney,
    visitLevel,
    cancelJourney,
    getJourney,
    getOutstandingHiddenCorridorCount,
    getUnexploredLevels,
  } = useJourneys()
  const heldKeys = useMergedHeldKeys()
  const keyDisplay = useMergedKeyDisplay()
  const corridorDetectorLevel = useMergedDetectorLevels().corridor
  const facts = useMergedJourneyContributions()
  const available = useAvailableJourneyIds(journeys)

  const [tierToggled, setTierToggled] = useState<Partial<Record<Difficulty, boolean>>>({})
  const [stopsOpen, setStopsOpen] = useState<ReadonlySet<string>>(new Set())
  const [pending, setPending] = useState<(() => Promise<void>) | undefined>()

  const completed = (id: string) => (getJourney(id)?.completionCount ?? 0) > 0
  const activeInfo = activeJourneyId ? getJourney(activeJourneyId) : undefined

  // A finished journey is re-entered anywhere, so none of its sites is "where the player is"; otherwise
  // the site in progress is. Sites holding something unseen light a dot, except the one the player is in:
  // that one is lit only by what a web key opened since it was saved.
  const unexploredSites = (id: string): ReadonlySet<number> => {
    const here = completed(id) ? (journeys.find(j => j.id === id)?.levelCount ?? 0) + 1 : (getJourney(id)?.levelNr ?? 1)
    const sites = new Set(getUnexploredLevels(id, heldKeys))
    sites.delete(here)
    for (const level of getUnexploredLevels(id, heldKeys, isWebKey)) if (level === here) sites.add(level)
    return sites
  }

  const model = allJourneys({
    journeys,
    activeJourneyId,
    isInProgress: id => getJourney(id)?.inProgress ?? false,
    completionCount: id => getJourney(id)?.completionCount ?? 0,
    levelNr: id => getJourney(id)?.levelNr ?? 1,
    available,
    hidden: facts.hidden,
    lock: facts.lock,
    news: id =>
      completed(id) &&
      (getUnexploredLevels(id, heldKeys).size > 0 ||
        (corridorDetectorLevel >= 4 && getOutstandingHiddenCorridorCount(id) > 0)),
    tierOpen: tier => isTierUnlocked(tier, heldKeys),
    tierNeeds: tier => {
      const need = tierKeyNeed(tier, heldKeys, keyDisplay, t("journeys.tierNeed"))
      return need ? [need] : []
    },
    comingSoon: comingSoonDifficulty(heldKeys),
  })

  // Another journey under way is dropped first: a pyramid after asking, a tomb without.
  const go = (journey: TranslatedJourney, action: () => Promise<void>) => {
    const other = activeJourneyId && activeJourneyId !== journey.id && activeInfo?.inProgress ? activeInfo : undefined
    if (!other) return void action()
    const run = async () => {
      cancelJourney()
      await action()
    }
    if (other.journey.exterior === "tomb") return void run()
    setPending(() => run)
  }
  const enter = (journey: TranslatedJourney, levelNr: number) =>
    go(journey, async () => {
      // Awaited: the expedition must not mount until every useJourneys() instance sees the level.
      await visitLevel(journey.id, levelNr)
      startGame()
    })
  const tap = (journey: TranslatedJourney, row: JourneyRowModel) => {
    if (row.status === "current") return startGame()
    if (row.status === "open") {
      return go(journey, async () => {
        await startJourney(journey)
        startGame()
      })
    }
    if (row.status === "finished") enter(journey, journey.levelCount)
  }

  const toggleStops = (id: string) =>
    setStopsOpen(prev => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const note = (journey: TranslatedJourney, row: JourneyRowModel): string | undefined => {
    if (row.status === "locked") return journey.mapHint
    if (row.status === "current") {
      return journey.exterior === "tomb"
        ? t("journeys.noteCurrentTomb")
        : t("journeys.noteCurrentPyramid", { level: Math.min(row.levelNr, row.levelCount), count: row.levelCount })
    }
    if (row.status === "finished") return row.news ? t("journeys.noteFinishedNews") : t("journeys.noteFinished")
    if (row.levelNr > 1) {
      return journey.exterior === "tomb"
        ? t("journeys.noteResumeTomb")
        : t("journeys.noteResumePyramid", { level: Math.min(row.levelNr, row.levelCount), count: row.levelCount })
    }
    return t("journeys.noteOpen")
  }

  const stopsFor = (journey: TranslatedJourney, row: JourneyRowModel): JourneyStop[] => {
    const buried = facts.buried(journey.id)
    const unexplored = unexploredSites(journey.id)
    const here = completed(journey.id) ? journey.levelCount + 1 : row.levelNr
    return Array.from({ length: journey.levelCount }, (_, i) => {
      const n = i + 1
      return {
        n,
        label: journey.exterior === "tomb" ? t("journeys.stopTomb") : t("journeys.stopPyramid"),
        state: buried.has(n) ? "buried" : n < here ? "done" : "ahead",
        dot: unexplored.has(n),
        dotLabel: t("journeys.newDot"),
      }
    })
  }

  const renderRow = (row: JourneyRowModel) => {
    const journey = journeys.find(j => j.id === row.journeyId)
    if (!journey) return null
    const locked = row.status === "locked"
    const lockFacts = locked ? facts.lock(journey.id) : undefined
    const lock = lockFacts && lockFacts.found < lockFacts.required ? lockFacts : undefined
    const hasStops = (row.status === "current" || row.status === "finished") && journey.levelCount > 1
    const open = stopsOpen.has(journey.id)
    const info = getJourney(journey.id)
    const name = lock?.labels.title ?? journey.name
    return (
      <JourneyRow
        name={name}
        note={note(journey, row)}
        status={row.status}
        exterior={journey.exterior}
        currentLabel={t("journeys.now")}
        dot={row.news}
        dotLabel={t("journeys.newDot")}
        mark={facts.mark(journey.id)}
        needs={row.needs.map(need => ({
          label: need.progress
            ? t("journeys.needProgress", {
                unit: need.label,
                found: need.progress.found,
                required: need.progress.required,
              })
            : need.label,
          symbols: need.symbols ? [...need.symbols] : undefined,
        }))}
        compact={compact}
        onOpen={() => tap(journey, row)}
        details={
          info ? journeyCardSlots().map(({ id, Component }) => <Component key={id} journeyInfo={info} />) : undefined
        }
        stops={
          hasStops
            ? { label: t("journeys.showStops", { name }), open, onToggle: () => toggleStops(journey.id) }
            : undefined
        }
      >
        <JourneyStops stops={stopsFor(journey, row)} onStop={n => enter(journey, n)} />
      </JourneyRow>
    )
  }

  const groupFor = (group: TierGroup): JourneyListGroup => {
    const title = t(`difficulty.${group.tier}`)
    const open = tierToggled[group.tier] ?? !group.collapsed
    const progress = t("journeys.tierProgress", { done: group.done, total: group.total })
    return {
      key: group.tier,
      open,
      header: (
        <TierHeader
          title={title}
          progress={progress}
          collapsible={
            group.finished && !group.locked
              ? {
                  open,
                  label: t("journeys.toggleTier", { tier: title }),
                  onToggle: () => setTierToggled(prev => ({ ...prev, [group.tier]: !open })),
                }
              : undefined
          }
          dot={group.news && !open}
          dotLabel={t("journeys.newDot")}
        />
      ),
      rows: group.locked
        ? [
            <JourneyRow
              key="locked"
              name={t("journeys.tierLockedName", { tier: title })}
              status="locked"
              exterior="pyramid"
              currentLabel={t("journeys.now")}
              needs={group.needs.map(need => ({
                label: need.label,
                symbols: need.symbols ? [...need.symbols] : undefined,
              }))}
              compact={compact}
            />,
          ]
        : group.rows.map(row => renderRow(row)),
    }
  }

  const comingSoon = model.comingSoon
  return (
    <>
      <JourneyList
        groups={model.groups.map(groupFor)}
        footer={
          comingSoon && (
            <div className="rounded-xl border-2 border-dashed border-[#B8A584] p-3 text-left">
              <div className="mb-1 text-[15px] font-extrabold">
                🚧 {t("ui.tierComingSoonTitle", { tier: t(`difficulty.${comingSoon}`) })}
              </div>
              <p className="text-[13px] text-[#4A3B2A]">
                {t("ui.tierComingSoon", { tier: t(`difficulty.${comingSoon}`) })}
              </p>
            </div>
          )
        }
      />
      <ConfirmModal
        isOpen={!!pending}
        title={t("ui.interruptExpedition")}
        message={t("ui.confirmInterruptExpedition")}
        confirmText={t("ui.interruptExpedition")}
        cancelText={t("ui.cancel")}
        onConfirm={() => {
          const run = pending
          setPending(undefined)
          void run?.()
        }}
        onCancel={() => setPending(undefined)}
      />
    </>
  )
}
