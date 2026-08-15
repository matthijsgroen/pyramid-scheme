import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { getOwnedKeys } from "@/game/gridNavigation"
import { floorKeyRing } from "@/game/floorKeys"
import { useCorridorDetection } from "@/app/SiteMap/useCorridorDetection"
import { useFoundCorridors } from "@/app/SiteMap/useFoundCorridors"
import { useDetectorBand } from "@/app/SiteMap/useDetectorBand"
import type { SiteConfig } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"
import { useAssembledFloor } from "./useAssembledFloor"
import { floorOfPosition } from "./stairTravel"
import { useFloorExplorationRecorder } from "./useFloorExplorationRecorder"
import { useEncounter } from "./useEncounter"
import { useRewardOffer } from "./useRewardOffer"
import { useSiteExit } from "./useSiteExit"
import { useSiteNavigation } from "./useSiteNavigation"
import { RewardFlow } from "./RewardFlow"
import { EncounterModal } from "./EncounterModal"
import { useApplyReward } from "./applyReward"
import { useJourneys } from "@/app/state/useJourneys"
import { useProgression } from "@/app/state/useProgression"
import { useDetector } from "@/app/state/useDetector"
import { useInventory } from "@/app/Inventory/useInventory"
import { EntranceTransitionOverlay } from "@/ui/atoms/EntranceTransitionOverlay"
import { hudWidgets } from "@/app/SiteMap/hudRegistry"
import { useMergedRewardContributions } from "@/app/SiteMap/rewardContributions"
import { useMergedHeldKeys } from "@/app/SiteMap/keyProviders"
import { useMergedDetectorLevels } from "@/app/SiteMap/detectorLevels"
import { useDetectorReadout } from "@/app/SiteMap/useDetectorReadout"
import { DetectorPanel } from "@/ui/atoms/DetectorPanel"
import { DetectorButton } from "@/ui/atoms/DetectorButton"
import { BackButton } from "@/ui/atoms/BackButton"
import { ConfirmModal } from "@/ui/atoms/ConfirmModal"
import { FloorBadge } from "@/ui/atoms/FloorBadge"
import { SiteHudBar } from "@/ui/atoms/SiteHudBar"
import { FloorKeyRing } from "@/ui/molecules/FloorKeyRing"
// Side-effect: registers every mod's app contributions (families, HUD, reward effects, …)
import "@/mods/registerModApps"

type Props = {
  journeyId: string
  siteConfig: SiteConfig
  seed: number
  onSiteComplete: () => void
  onCancel: () => void
}

export const SiteMapScreen = ({ journeyId, siteConfig, seed, onSiteComplete, onCancel }: Props) => {
  const { t } = useTranslation(["common", "inventory", "sellables"])
  const journeys = useJourneys()
  const progression = useProgression()
  const rewardContributions = useMergedRewardContributions()
  const inventory = useInventory()
  const detector = useDetector(journeys)
  const allEdges = journeys.getExploredSections(journeyId)
  const journeyState = journeys.getJourney(journeyId)
  const wardKeys = useMergedHeldKeys()
  // Detector levels come from the owning mods (compass←hieroglyph, supplies←trap, corridor←core) via
  // the merged accessor — core names no mod.
  const detectorLevels = useMergedDetectorLevels()
  const readout = useDetectorReadout(detectorLevels)

  const currentFloor = floorOfPosition(journeyState?.position, siteConfig.length)
  const floorConfig = siteConfig[currentFloor]

  const foundCorridors = useFoundCorridors(journeys, journeyId)

  const { grid, explorerPos, hiddenSectionHashes, junctionSections } = useAssembledFloor(
    journeyId,
    floorConfig,
    seed,
    currentFloor,
    allEdges,
    journeyState?.position,
    detectorLevels.corridor,
    foundCorridors
  )

  const corridors = useCorridorDetection({
    journeys,
    journeyId,
    currentFloor,
    detectorLevel: detectorLevels.corridor,
    grid,
    explorerPos,
    hiddenSectionHashes,
    junctionSections,
    foundCorridors,
  })

  // The running detector's closest reading, for the pulsing dot beside the HUD button.
  const detectorBand = useDetectorBand({
    detector,
    levels: detectorLevels,
    corridors,
    grid,
    explorerPos,
    journeyId,
    currentFloor,
    currentLevelIdx: (journeyState?.levelNr ?? 1) - 1,
  })

  // Keys the player already holds for THIS floor's gates: this floor's own completed
  // tomb-key treasures, union'd with ward keys owned entering the site (progression's
  // global tombKeyIds, above). Gating is soft, so this union is purely a "is this gate
  // satisfied" read, for the gate family's own precondition and the map's locked/unlocked
  // gate coloring.
  const ownedKeys = useMemo(() => (grid ? new Set([...getOwnedKeys(grid), ...wardKeys]) : wardKeys), [grid, wardKeys])

  // What the HUD key ring shows: this floor's coloured keys in hand, and the colours of doors the
  // player has already seen here and can't open yet (fogged ones stay secret — see floorKeys.ts).
  const keyRing = useMemo(() => (grid ? floorKeyRing(grid, ownedKeys) : { held: [], needed: [] }), [grid, ownedKeys])

  useFloorExplorationRecorder({ journeys, journeyId, currentFloor, grid })

  const pendingConsumableCells = useMemo(() => {
    const prefix = `${currentFloor}:`
    const result = new Set<string>()
    for (const edgeId of journeys.getSkippedConsumables(journeyId)) {
      if (edgeId.startsWith(prefix)) result.add(edgeId.slice(prefix.length))
    }
    return result
  }, [journeys, journeyId, currentFloor])

  // Applies a claimed reward to game state; whether it reaches the player at all is useRewardOffer's.
  const applyReward = useApplyReward(progression, inventory, journeyId)
  const rewardOffer = useRewardOffer({ journeys, rewardContributions, applyReward })

  const encounter = useEncounter({
    journeys,
    journeyId,
    currentFloor,
    difficulty: floorConfig.difficulty,
    grid,
    ownedKeys,
    onReward: rewardOffer.offerFound,
  })

  const exit = useSiteExit()

  const { onCellClick } = useSiteNavigation({
    journeys,
    journeyId,
    siteConfig,
    seed,
    currentFloor,
    grid,
    explorerPos,
    onEncounter: encounter.open,
    onSkippedConsumable: rewardOffer.offerSkipped,
    onExitReached: exit.arrived,
  })

  const ActiveEncounterComponent = encounter.family?.Component ?? null

  if (!grid) {
    return <div className="p-4 text-red-400">Site layout unavailable.</div>
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center">
      <BackButton onClick={onCancel} label={t("ui.back")} />
      {currentFloor > 0 && <FloorBadge label={t("ui.floor", { number: currentFloor + 1 })} />}
      <div className="relative h-screen w-screen">
        <SiteMapView
          grid={grid}
          onCellClick={onCellClick}
          explorerPos={explorerPos}
          currentFloor={currentFloor}
          pendingCells={pendingConsumableCells}
          ownedKeys={ownedKeys}
          className="size-full"
        />
      </div>
      <SiteHudBar>
        {/* The readout sits on its own row (it's multi-line), but only once a mode is switched on —
            both this and the toggles below self-hide, so no empty row is reserved for them. */}
        <DetectorPanel
          labels={readout.labels}
          activeDetector={detector.readoutOpen ? detector.activeDetector : null}
          compassLevel={detectorLevels.compass}
          consumableDetectorLevel={detectorLevels.supplies}
          detectionLevel={detectorLevels.corridor}
          compassTarget={detector.compassTarget}
          compassTargetLabel={readout.compassTargetLabel}
          journeyName={readout.journeyName}
          compassResults={detector.compassResults}
          consumableResults={detector.consumableResults}
          detectorTitles={readout.titles}
          onSetDetector={mode => {
            detector.setDetector(mode)
            // Tapping the running detector in the switcher stops it; with nothing left to read there
            // is nothing for the readout to show either, so it shuts with it.
            if (!mode) detector.setReadoutOpen(false)
          }}
          corridorNearby={corridors.nearby}
          floorHasHiddenCorridor={corridors.onThisFloor}
          hiddenCorridorOnOtherFloor={corridors.onOtherFloor}
        />
        {/* pointer-events-auto: opts this row back into hit-testing inside SiteHudBar's
            non-hit-testing band (the detector toggles and mod widgets below are clickable). */}
        {/* Wraps rather than clipping: with every detector, a full key ring, six hearts, the supplies
            and the balance, this row outgrows a phone even after folding the detectors into one
            button — and an overflowing row pushed the coin balance off-screen entirely. */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {/* One button for every detector the player owns — it opens the readout, which carries the
              mode switcher. Three buttons here left no room for the rest of the row on a phone. */}
          {readout.available.length > 0 && (
            <DetectorButton
              activeDetector={detector.activeDetector}
              readoutOpen={detector.readoutOpen}
              title={t("common:detector.title")}
              band={detectorBand}
              bandLabel={t(`common:detector.band.${detectorBand}`)}
              onToggle={() => {
                // Opening with nothing running starts the first detector owned; closing leaves it
                // running, which is what the dot reports.
                if (!detector.activeDetector) detector.setDetector(readout.available[0])
                detector.setReadoutOpen(!detector.readoutOpen)
              }}
            />
          )}
          {/* This floor's key ring: coloured keys already in hand, plus the colours of doors seen
              here and still shut. Floor-local, so it resets with the floor. */}
          <FloorKeyRing
            held={keyRing.held}
            needed={keyRing.needed}
            heldLabel={color => t("common:keys.heldTitle", { key: t(`common:keys.${color}`) })}
            neededLabel={color => t("common:keys.neededTitle", { key: t(`common:keys.${color}`) })}
          />
          {/* Mod-contributed HUD widgets (trap's health + consumables, shop's balance) — core names none. */}
          {hudWidgets().map(({ id, Component }) => (
            <Component key={id} />
          ))}
        </div>
      </SiteHudBar>
      {/* ponytail: plain confirm dialog for now — the exit chamber's own artwork (daylight through
          the doorway) can take over this step later without moving the decision. */}
      <ConfirmModal
        isOpen={exit.prompting}
        title={t("ui.leaveSiteTitle")}
        message={t("ui.leaveSiteMessage")}
        confirmText={t("ui.leaveSiteConfirm")}
        cancelText={t("ui.leaveSiteCancel")}
        confirmButtonClass="bg-amber-600 hover:bg-amber-700"
        onConfirm={exit.confirm}
        onCancel={exit.cancel}
      />
      {exit.leaving && (
        <EntranceTransitionOverlay
          origin="50% 50%"
          // Any exit portal finishes the site and advances the journey. Floors past the exit stay
          // reachable on a later revisit (with keys); the interior is a persistent, stable-seed site.
          onComplete={onSiteComplete}
        />
      )}
      {encounter.isOpen && ActiveEncounterComponent && encounter.ctx && (
        <EncounterModal>
          <ActiveEncounterComponent
            puzzle={encounter.puzzle}
            ctx={encounter.ctx}
            progression={progression}
            journeys={journeys}
            inventory={inventory}
            applyReward={applyReward}
            onSolved={encounter.solved}
            onCancel={encounter.cancel}
          />
        </EncounterModal>
      )}
      <RewardFlow pendingReward={rewardOffer.pending} onDismiss={rewardOffer.dismiss} />
    </div>
  )
}
