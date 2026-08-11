import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { findPath, getCell, getOwnedKeys } from "@/game/gridNavigation"
import { floorKeyRing } from "@/game/floorKeys"
import { getFamilyPlugin, type FamilyContext } from "@/app/families/familyRegistry"
import { hashString } from "@/support/hashString"
import { useTimeout } from "@/support/useTimeout"
import type { KeyColor, SiteConfig, TreasureReward } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"
import { useAssembledFloor, encodeEdge } from "./useAssembledFloor"
import { floorOfPosition, stairPeerPosition } from "./stairTravel"
import { computeFloorExploration } from "./floorExploration"
import { RewardFlow } from "./RewardFlow"
import { useApplyReward } from "./applyReward"
import { useJourneys } from "@/app/state/useJourneys"
import { useProgression } from "@/app/state/useProgression"
import { useDetector } from "@/app/state/useDetector"
import { useInventory } from "@/app/Inventory/useInventory"
import { EntranceTransitionOverlay } from "@/ui/atoms/EntranceTransitionOverlay"
import { hudWidgets } from "@/app/SiteMap/hudRegistry"
import { useMergedRewardContributions } from "@/app/SiteMap/rewardContributions"
import { useMergedHeldKeys } from "@/app/SiteMap/keyProviders"
import { useCompassTargetLabel } from "@/app/SiteMap/compassTarget"
import { useJourneyTranslations } from "@/app/translations/useJourneyTranslations"
import { useMergedDetectorLevels } from "@/app/SiteMap/detectorLevels"
import { DetectorPanel } from "@/ui/atoms/DetectorPanel"
import { DetectorToggles } from "@/ui/atoms/DetectorToggles"
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
  // Player-facing labels for the detector readout: the hunted item's glyph (mod-owned, via the seam)
  // and each journey's localized name, so it reads "Papyrus Merchant's Route 2" rather than
  // "starter_2". useJourneyTranslations is called ONCE and reduced to a lookup — the per-id
  // useJourneyTranslation is a hook and can't be called per result.
  const compassTargetLabel = useCompassTargetLabel()
  const translatedJourneys = useJourneyTranslations()
  const journeyName = useMemo(() => {
    const names: Record<string, string> = Object.fromEntries(translatedJourneys.map(j => [j.id, j.name]))
    return (id: string) => names[id] ?? id
  }, [translatedJourneys])

  const currentFloor = floorOfPosition(journeyState?.position, siteConfig.length)
  const floorConfig = siteConfig[currentFloor]

  // Reveal set = the hidden corridors already found (§7.2). Reaching a corridor's bordering junction
  // both marks it found (the effect below) AND reveals it: fed to useAssembledFloor as revealedSections,
  // a found corridor unmasks → its cells become walkable and its optional loot collectible. Keyed on a
  // stable content string (like hiddenHashKey) so the mask memo — and the found-marking effect that
  // reads junctionSections — don't churn every render (foundSet is a fresh Set each render).
  const foundKey = [...journeys.getFoundHiddenCorridors(journeyId)].sort().join(",")
  const foundCorridors = useMemo(() => new Set(foundKey ? foundKey.split(",") : []), [foundKey])

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

  // Corridor detector, found = noticed via proximity (§7.2). Every floor the player views makes its
  // hidden corridors "known"; standing on a hidden junction (detector-forced reachable at L1) marks
  // the corridor it borders "found". Outstanding = known \ found feeds the L3/L4 markers.
  const hiddenHashKey = useMemo(() => [...hiddenSectionHashes].sort().join(","), [hiddenSectionHashes])
  useEffect(() => {
    if (hiddenHashKey) journeys.registerHiddenCorridors(hiddenHashKey.split(","))
    // journeys is a fresh object each render; the reducer no-ops when nothing is added, so keying the
    // effect on the stable hash string (not journeys) is what stops a write loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenHashKey, journeyId, currentFloor])
  useEffect(() => {
    if (detectorLevels.corridor < 1) return
    const bordered = junctionSections.get(`${explorerPos[0]},${explorerPos[1]}`)
    if (bordered) for (const hash of bordered) journeys.markCorridorFound(hash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explorerPos, junctionSections, detectorLevels.corridor])

  const floorHasHiddenCorridor = useMemo(
    () => [...hiddenSectionHashes].some(h => !foundCorridors.has(h)),
    [hiddenSectionHashes, foundCorridors]
  )
  const pyramidHiddenCorridorCount = journeys.getOutstandingHiddenCorridorCount(journeyId)
  // Keys the player already holds for THIS floor's gates: this floor's own completed
  // tomb-key treasures, union'd with ward keys owned entering the site (progression's
  // global tombKeyIds, above). Gating is soft, so this union is purely a "is this gate
  // satisfied" read, for the gate family's own precondition and the map's locked/unlocked
  // gate coloring.
  const ownedKeys = useMemo(() => (grid ? new Set([...getOwnedKeys(grid), ...wardKeys]) : wardKeys), [grid, wardKeys])

  // What the HUD key ring shows: this floor's coloured keys in hand, and the colours of doors the
  // player has already seen here and can't open yet (fogged ones stay secret — see floorKeys.ts).
  const keyRing = useMemo(() => (grid ? floorKeyRing(grid, ownedKeys) : { held: [], needed: [] }), [grid, ownedKeys])

  // Per-floor "still stuff to find here" summary for the Travel marker. The pure classification
  // (loot nodes / key-gated nodes / fogged corridors, keys-and-gates only, no mod names) lives in
  // floorExploration.ts and is unit-tested there.
  //
  // Persist it when the player LEAVES the floor (switches floor or exits the interior), read from a
  // ref in the cleanup — NOT reactively on every grid change. A reactive write fed a render loop:
  // writing re-rendered SiteMapScreen → the grid recomputed (getExploredSections returns a fresh
  // object each render, so useAssembledFloor rebuilds) → the effect could re-fire while the exit
  // chamber was mid-reveal, pegging the CPU (flicker, input starvation). Recording on-leave captures
  // the floor's final state (exactly what "still stuff to find" means) and can never re-enter render.
  const floorExploration = useMemo(() => (grid ? computeFloorExploration(grid) : null), [grid])
  const floorExplorationRef = useRef(floorExploration)
  floorExplorationRef.current = floorExploration
  // Latest register fn (journeyId passed explicitly, so it records even after the journey goes
  // inactive on completion — the interior unmounts right after completeJourney).
  const recordExploration = useRef<(floor: number, open: boolean, keySets: string[][]) => void>(() => {})
  recordExploration.current = (floor, open, keySets) =>
    journeys.registerFloorExploration(journeyId, floor, open, keySets)
  useEffect(() => {
    const floor = currentFloor
    return () => {
      const fe = floorExplorationRef.current
      if (fe) recordExploration.current(floor, fe.open, fe.keySets)
    }
  }, [currentFloor, journeyId])

  const pendingConsumableCells = useMemo(() => {
    const prefix = `${currentFloor}:`
    const result = new Set<string>()
    for (const edgeId of journeys.getSkippedConsumables(journeyId)) {
      if (edgeId.startsWith(prefix)) result.add(edgeId.slice(prefix.length))
    }
    return result
  }, [journeys, journeyId, currentFloor])

  // Which room's encounter is open, plus whether this is a fresh arrival vs. a re-click
  // while already standing here (shop's stock-reset rule cares).
  const [activeEncounter, setActiveEncounter] = useState<{
    pos: readonly [number, number]
    freshArrival: boolean
  } | null>(null)
  const [pendingReward, setPendingReward] = useState<{
    reward: TreasureReward
    consumableFull?: boolean
    keyColors?: readonly KeyColor[]
    onCollect: () => void
  } | null>(null)
  const [exiting, setExiting] = useState(false)
  const [exitPrompt, setExitPrompt] = useState(false)

  const [scheduleArrival] = useTimeout()

  const encounterFamily = useMemo(() => {
    if (!activeEncounter || !grid) return null
    const cell = getCell(grid, activeEncounter.pos[0], activeEncounter.pos[1])
    const family = cell?.type === "room" ? cell.family : undefined
    return family ? getFamilyPlugin(family) : null
  }, [activeEncounter, grid])

  const encounterCtx = useMemo((): FamilyContext | null => {
    if (!activeEncounter || !grid) return null
    const [row, col] = activeEncounter.pos
    const cell = getCell(grid, row, col)
    const sectionHash = cell && cell.type !== "empty" ? (cell.sectionHash ?? "") : ""
    const edgeId = encodeEdge(currentFloor, row, col)
    return {
      journeyId,
      edgeId,
      sectionHash,
      freshArrival: activeEncounter.freshArrival,
      difficulty: floorConfig.difficulty,
      reward: cell?.type === "room" ? cell.reward : undefined,
      stock: cell?.type === "room" ? cell.stock : undefined,
      pathIndex: cell?.type === "room" ? cell.pathIndex : undefined,
      encounterArgs: cell?.type === "room" ? cell.encounterArgs : undefined,
      requiredKeyId: cell?.type === "room" ? cell.requiredKeyId : undefined,
      gateVariant: cell?.type === "room" ? cell.gateVariant : undefined,
      keyColor: cell?.type === "room" ? cell.keyColor : undefined,
      ownedKeys,
    }
  }, [activeEncounter, grid, currentFloor, journeyId, floorConfig.difficulty, ownedKeys])

  const generatedPuzzle = useMemo(() => {
    if (!encounterFamily || !encounterCtx) return null
    return encounterFamily.generate(hashString(journeyId + encounterCtx.edgeId), encounterCtx)
  }, [encounterFamily, encounterCtx, journeyId])

  // Applies a claimed reward to game state; pack-full/dedup checks happen at each call site.
  const applyReward = useApplyReward(progression, inventory, journeyId)

  // The one thing core does on any solved encounter, for every family alike: mark the room
  // explored and offer its reward, if it has one.
  const genericHandleSolved = useCallback(
    (pos: readonly [number, number]) => {
      if (!grid) return
      const [row, col] = pos
      const edgeId = encodeEdge(currentFloor, row, col)
      const cell = getCell(grid, row, col)
      const sectionHash = cell && cell.type !== "empty" ? (cell.sectionHash ?? "") : ""
      journeys.markCellExplored(sectionHash, edgeId)
      setActiveEncounter(null)

      const reward = cell?.type === "room" ? cell.reward : undefined
      if (!reward) return
      // A key-host chest wears the colour(s) of the doors its key opens; carry that into the popup so
      // the reveal says WHICH key this was, not just "a key".
      const keyColors =
        cell?.type === "room" ? (cell.keyColors ?? (cell.keyColor ? [cell.keyColor] : undefined)) : undefined
      // A mod may silently ignore a reward (nothing to do — e.g. an already-collected hieroglyph
      // fragment): no popup, no side effect, not remembered. Distinct from a refusal below.
      if (rewardContributions.skip(reward)) return
      // canAccept merges every mod's "refused for now, come back" rule (e.g. trap when its pack is
      // full): show the come-back popup and remember the skip. Core dispatches, naming no mod.
      const packFull = !rewardContributions.canAccept(reward)
      if (packFull) {
        journeys.markConsumableSkipped(edgeId)
        setPendingReward({ reward, consumableFull: true, onCollect: () => {} })
        return
      }
      setPendingReward({ reward, keyColors, onCollect: () => applyReward(reward) })
    },
    [grid, journeys, currentFloor, rewardContributions, applyReward]
  )

  const handleEncounterCancel = useCallback(() => setActiveEncounter(null), [])

  const handleEncounterSolved = useCallback(() => {
    if (activeEncounter) genericHandleSolved(activeEncounter.pos)
  }, [activeEncounter, genericHandleSolved])

  // Family-absence pass-through: a room whose family isn't registered — e.g. a gating mod toggled
  // off with its encounter still authored — has no puzzle to render. Resolve it immediately (mark
  // explored, offer whatever generic loot the slot got) so the player isn't stuck on a dead room.
  useEffect(() => {
    if (activeEncounter && encounterFamily == null) genericHandleSolved(activeEncounter.pos)
  }, [activeEncounter, encounterFamily, genericHandleSolved])

  // How long the explorer dot takes to walk from where it stands to the clicked cell — anything
  // that happens "on arrival" waits this out (ExplorerDot's own step duration is 120ms).
  const walkDelay = useCallback(
    (row: number, col: number) =>
      grid ? Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100 : 0,
    [grid, explorerPos]
  )

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!grid) return
      const cell = getCell(grid, row, col)
      if (!cell || cell.type === "empty") return
      if (cell.state !== "reachable" && cell.state !== "completed") return

      const edgeId = encodeEdge(currentFloor, row, col)
      const sectionHash = cell.sectionHash ?? ""

      // A staircase carries the player between floors regardless of the cell's state — handled
      // BEFORE the completed-cell block below. The entrance stairhead you arrive on (and any
      // up-staircase after its first use) is marked "completed", so without this the completed
      // block would just reposition the player and swallow the click, blocking back-travel down a
      // staircase. The walk to the stairhead runs first; the floor only changes once the explorer
      // has actually reached the stairs.
      if (cell.type === "room" && cell.roomType === "portal" && cell.stairId) {
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
        const stairId = cell.stairId
        scheduleArrival(walkDelay(row, col), () => {
          const peer = stairPeerPosition(journeyId, siteConfig, seed, stairId, currentFloor)
          if (peer) journeys.updatePosition(journeyId, encodeEdge(peer.floor, peer.pos[0], peer.pos[1]))
        })
        return
      }

      // Completed cells just reposition the player, except a shop with unbought stock or an
      // unfitted consumable, which reopen.
      if (cell.state === "completed") {
        const alreadyStandingHere = explorerPos[0] === row && explorerPos[1] === col
        journeys.updatePosition(journeyId, edgeId)
        const shopHasUnclaimedStock =
          cell.type === "room" &&
          !!cell.stock?.some((item, j) => item && !journeys.getPurchasedShopSlots(journeyId).has(`${edgeId}#${j}`))
        if (shopHasUnclaimedStock) {
          scheduleArrival(walkDelay(row, col), () =>
            setActiveEncounter({ pos: [row, col], freshArrival: !alreadyStandingHere })
          )
          return
        }
        if (
          cell.type === "room" &&
          cell.reward?.type === "consumable" &&
          journeys.getSkippedConsumables(journeyId).has(edgeId)
        ) {
          const reward = cell.reward
          scheduleArrival(walkDelay(row, col), () => {
            if (!rewardContributions.canAccept(reward)) {
              setPendingReward({ reward, consumableFull: true, onCollect: () => {} })
              return
            }
            setPendingReward({
              reward,
              onCollect: () => {
                applyReward(reward)
                journeys.clearConsumableSkipped(edgeId)
              },
            })
          })
        }
        return
      }

      if (cell.type === "corridor") {
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
        return
      }

      if (cell.type !== "room") return

      if (cell.roomType === "fork") {
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
      } else if (cell.roomType === "encounter") {
        journeys.updatePosition(journeyId, edgeId)
        scheduleArrival(walkDelay(row, col), () => setActiveEncounter({ pos: [row, col], freshArrival: true }))
      } else if (cell.roomType === "portal") {
        // Staircase portals (with a stairId) are handled by the early teleport guard above; here a
        // portal is either this floor's own entrance (reposition only) or a real exit (leave the site).
        if (row === grid.entrancePos[0] && col === grid.entrancePos[1]) {
          journeys.markCellExplored(sectionHash, edgeId)
          journeys.updatePosition(journeyId, edgeId)
        } else {
          // An exit is a chamber the player steps into, not a trapdoor: arriving asks whether to
          // leave, so walking into one that was off-screen doesn't end the expedition by itself.
          journeys.updatePosition(journeyId, edgeId)
          scheduleArrival(walkDelay(row, col), () => setExitPrompt(true))
        }
      }
    },
    [
      grid,
      journeys,
      journeyId,
      currentFloor,
      rewardContributions,
      applyReward,
      explorerPos,
      walkDelay,
      scheduleArrival,
      seed,
      siteConfig,
    ]
  )

  const ActiveEncounterComponent = encounterFamily?.Component ?? null

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
          onCellClick={handleCellClick}
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
          labels={{
            pickTarget: t("common:detector.pickTarget"),
            lookingFor: symbol => t("common:detector.lookingFor", { symbol }),
            allCollected: t("common:detector.allCollected"),
            access: {
              open: t("common:detector.access.open"),
              locked: t("common:detector.access.locked"),
              hidden: t("common:detector.access.hidden"),
              unknown: t("common:detector.access.unknown"),
            },
            more: count => t("common:detector.more", { count }),
            noSkippedChests: t("common:detector.noSkippedChests"),
            corridorNearby: level => t("common:detector.corridorNearby", { level }),
            corridorOnFloor: t("common:detector.corridorOnFloor"),
            corridorPyramidCount: count => t("common:detector.corridorPyramidCount", { count }),
          }}
          activeDetector={detector.activeDetector}
          compassLevel={detectorLevels.compass}
          consumableDetectorLevel={detectorLevels.supplies}
          detectionLevel={detectorLevels.corridor}
          compassTarget={detector.compassTarget}
          compassTargetLabel={compassTargetLabel}
          journeyName={journeyName}
          compassResults={detector.compassResults}
          consumableResults={detector.consumableResults}
          floorHasHiddenCorridor={floorHasHiddenCorridor}
          pyramidHiddenCorridorCount={pyramidHiddenCorridorCount}
        />
        {/* pointer-events-auto: opts this row back into hit-testing inside SiteHudBar's
            non-hit-testing band (the detector toggles and mod widgets below are clickable). */}
        <div className="pointer-events-auto flex items-center gap-4">
          {/* Detector buttons ride along in this row rather than claiming one of their own. */}
          <DetectorToggles
            activeDetector={detector.activeDetector}
            compassLevel={detectorLevels.compass}
            consumableDetectorLevel={detectorLevels.supplies}
            detectionLevel={detectorLevels.corridor}
            titles={{
              compass: t("common:detector.compassTitle"),
              consumable: t("common:detector.consumableTitle"),
              hiddenPassageway: t("common:detector.corridorTitle"),
            }}
            onSetDetector={detector.setDetector}
          />
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
        isOpen={exitPrompt}
        title={t("ui.leaveSiteTitle")}
        message={t("ui.leaveSiteMessage")}
        confirmText={t("ui.leaveSiteConfirm")}
        cancelText={t("ui.leaveSiteCancel")}
        confirmButtonClass="bg-amber-600 hover:bg-amber-700"
        onConfirm={() => {
          setExitPrompt(false)
          setExiting(true)
        }}
        onCancel={() => setExitPrompt(false)}
      />
      {exiting && (
        <EntranceTransitionOverlay
          origin="50% 50%"
          // Any exit portal finishes the site and advances the journey. Floors past the exit stay
          // reachable on a later revisit (with keys); the interior is a persistent, stable-seed site.
          onComplete={onSiteComplete}
        />
      )}
      {activeEncounter && ActiveEncounterComponent && encounterCtx && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="relative flex flex-col items-center gap-4 rounded-lg border border-amber-900 bg-stone-900 p-4">
            <ActiveEncounterComponent
              puzzle={generatedPuzzle}
              ctx={encounterCtx}
              progression={progression}
              journeys={journeys}
              inventory={inventory}
              applyReward={applyReward}
              onSolved={handleEncounterSolved}
              onCancel={handleEncounterCancel}
            />
          </div>
        </div>
      )}
      <RewardFlow pendingReward={pendingReward} onDismiss={() => setPendingReward(null)} />
    </div>
  )
}
