import { use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { findPath, getCell, getOwnedKeys } from "@/game/gridNavigation"
import { getFamilyPlugin, resolveEncounter, type FamilyContext } from "@/app/families/familyRegistry"
import { hashString } from "@/support/hashString"
import { useTimeout } from "@/support/useTimeout"
import type { SiteConfig, TreasureReward } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { SiteMapView } from "./SiteMapView"
import { useAssembledFloor, encodeEdge, decodeEdge } from "./useAssembledFloor"
import { RewardFlow } from "./RewardFlow"
import { useApplyReward } from "./applyReward"
import { useJourneys } from "@/app/state/useJourneys"
import { useProgression } from "@/app/state/useProgression"
import { useDetector } from "@/app/state/useDetector"
import { useInventory } from "@/app/Inventory/useInventory"
import { DevelopContext } from "@/contexts/DevelopMode"
import { allItems } from "@/data/inventory"
import { ALL_SELLABLES } from "@/data/sellables"
import { EntranceTransitionOverlay } from "@/ui/atoms/EntranceTransitionOverlay"
import { hudWidgets } from "@/app/SiteMap/hudRegistry"
import { useMergedRewardContributions } from "@/app/SiteMap/rewardContributions"
import { ShopBalance } from "@/ui/atoms/ShopBalance"
import { DetectorPanel } from "@/ui/atoms/DetectorPanel"
import { BackButton } from "@/ui/atoms/BackButton"
import { FloorBadge } from "@/ui/atoms/FloorBadge"
import { SiteHudBar } from "@/ui/atoms/SiteHudBar"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
// Side-effect: registers every mod's family plugin
import "@/mods/registerAllFamilies"

type Props = {
  journeyId: string
  siteConfig: SiteConfig
  seed: number
  onSiteComplete: () => void
  onCancel: () => void
  /** Called when a puzzle room is tapped on a non-sumplete floor. Return null to use default SumpleteBoard. */
  renderPuzzle?: (floor: number, onSolved: () => void, onCancel: () => void) => ReactNode
}

export const SiteMapScreen = ({ journeyId, siteConfig, seed, onSiteComplete, onCancel, renderPuzzle }: Props) => {
  const { t } = useTranslation(["common", "inventory", "sellables"])
  const { isDevelopMode } = use(DevelopContext)
  const journeys = useJourneys()
  const progression = useProgression()
  const rewardContributions = useMergedRewardContributions()
  const inventory = useInventory()
  const detector = useDetector(progression, journeys)
  const allEdges = journeys.getExploredSections(journeyId)
  const journeyState = journeys.getJourney(journeyId)
  const wardKeys = progression.tombKeyIds

  const [currentFloor, setCurrentFloor] = useState(() => {
    const pos = journeyState?.position
    if (!pos) return 0
    const [floor] = decodeEdge(pos)
    return Math.min(floor, siteConfig.length - 1)
  })
  const floorConfig = siteConfig[Math.min(currentFloor, siteConfig.length - 1)]

  const { grid, explorerPos } = useAssembledFloor(
    journeyId,
    floorConfig,
    seed,
    currentFloor,
    allEdges,
    journeyState?.position,
    progression.perks.detectionLevel
  )
  // Keys the player already holds for THIS floor's gates: this floor's own completed
  // tomb-key treasures, union'd with ward keys owned entering the site (progression's
  // global tombKeyIds, above). Same union completeCell used to gate reachability before
  // gating went soft — now purely a "is this gate satisfied" read, for the gate family's
  // own precondition and the map's locked/unlocked gate coloring.
  const ownedKeys = useMemo(() => (grid ? new Set([...getOwnedKeys(grid), ...wardKeys]) : wardKeys), [grid, wardKeys])

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
    onCollect: () => void
  } | null>(null)
  const [exiting, setExiting] = useState(false)

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
      price: cell?.type === "room" ? cell.shopPrice : undefined,
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

  const useRenderPuzzleFallback = activeEncounter != null && encounterFamily == null && renderPuzzle != null

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
      // Inventory-as-truth: fragment already collected elsewhere → skip the popup
      const alreadyCollected =
        reward.type === "hieroglyphFragment" && progression.hasFragment(reward.hieroglyphId, reward.pieceIndex)
      if (alreadyCollected) return
      const packFull = !rewardContributions.canAccept(reward)
      if (packFull) {
        journeys.markConsumableSkipped(edgeId)
        setPendingReward({ reward, consumableFull: true, onCollect: () => {} })
        return
      }
      setPendingReward({ reward, onCollect: () => applyReward(reward) })
    },
    [grid, journeys, currentFloor, progression, rewardContributions, applyReward]
  )

  const handleEncounterCancel = useCallback(() => setActiveEncounter(null), [])

  const handleEncounterSolved = useCallback(() => {
    if (activeEncounter) genericHandleSolved(activeEncounter.pos)
  }, [activeEncounter, genericHandleSolved])

  // Family-absence pass-through: a room whose family isn't registered — e.g. a gating mod toggled
  // off with its encounter still authored — has no puzzle to render. Resolve it immediately (mark
  // explored, offer whatever generic loot the slot got) so the player isn't stuck on a dead room.
  // The legacy tomb `renderPuzzle` path, when present, still owns the render.
  useEffect(() => {
    if (activeEncounter && encounterFamily == null && !useRenderPuzzleFallback) genericHandleSolved(activeEncounter.pos)
  }, [activeEncounter, encounterFamily, useRenderPuzzleFallback, genericHandleSolved])

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!grid) return
      const cell = getCell(grid, row, col)
      if (!cell || cell.type === "empty") return
      if (cell.state !== "reachable" && cell.state !== "completed") return

      const edgeId = encodeEdge(currentFloor, row, col)
      const sectionHash = cell.sectionHash ?? ""

      // Completed cells just reposition the player, except a still-buyable shop or an
      // unfitted consumable, which reopen.
      if (cell.state === "completed") {
        const alreadyStandingHere = explorerPos[0] === row && explorerPos[1] === col
        journeys.updatePosition(journeyId, edgeId)
        if (cell.type === "room" && cell.reward && cell.shopPrice != null) {
          scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
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
          scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () => {
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
        scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
          setActiveEncounter({ pos: [row, col], freshArrival: true })
        )
      } else if (cell.roomType === "portal") {
        if (cell.stairId) {
          // Find the peer stairhead across floors and teleport there
          journeys.markCellExplored(sectionHash, edgeId)
          const stairId = cell.stairId
          for (let fi = 0; fi < siteConfig.length; fi++) {
            if (fi === currentFloor) continue
            const result = assembleFloor(journeyId, siteConfig[fi], seed + fi, resolveEncounter)
            if (!result.success) continue
            const peerPos = result.grid.staircases[stairId]
            if (peerPos) {
              journeys.updatePosition(journeyId, encodeEdge(fi, peerPos[0], peerPos[1]))
              setCurrentFloor(fi)
              break
            }
          }
        } else if (row === grid.entrancePos[0] && col === grid.entrancePos[1]) {
          journeys.markCellExplored(sectionHash, edgeId)
          journeys.updatePosition(journeyId, edgeId)
        } else {
          journeys.updatePosition(journeyId, edgeId)
          scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
            setExiting(true)
          )
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
          pendingCells={pendingConsumableCells}
          ownedKeys={ownedKeys}
          className="h-full w-full"
        />
      </div>
      <SiteHudBar>
        {(progression.perks.compassLevel > 0 ||
          progression.perks.consumableDetectorLevel > 0 ||
          progression.perks.detectionLevel > 0) && (
          <DetectorPanel
            activeDetector={detector.activeDetector}
            compassLevel={progression.perks.compassLevel}
            consumableDetectorLevel={progression.perks.consumableDetectorLevel}
            detectionLevel={progression.perks.detectionLevel}
            compassTarget={detector.compassTarget}
            compassResults={detector.compassResults}
            consumableResults={detector.consumableResults}
            onSetDetector={detector.setDetector}
            onSetCompassTarget={detector.setCompassTarget}
            availableHieroglyphs={[]}
          />
        )}
        <div className="flex items-center gap-4">
          {/* Mod-contributed HUD widgets (e.g. trap's health + consumables) — core names none. */}
          {hudWidgets().map(({ id, Component }) => (
            <Component key={id} />
          ))}
          <ShopBalance amount={progression.money} label={t("money.label")} />
          {isDevelopMode && <DeveloperButton onClick={() => progression.addMoney(1000)} label="+1000 Coins" />}
          {isDevelopMode && (
            <DeveloperButton
              onClick={() => {
                ALL_SELLABLES.slice(0, 5).forEach(item => inventory.addItem(item.id, 1))
                inventory.addItem(ALL_SELLABLES[0].id, 1) // second copy, to see the ×N badge
              }}
              label="+Junk"
            />
          )}
          {isDevelopMode && (
            <DeveloperButton
              onClick={() => allItems.forEach(item => inventory.addItem(item.id, 20))}
              label="+Hieroglyphs"
            />
          )}
        </div>
      </SiteHudBar>
      {exiting && (
        <EntranceTransitionOverlay
          origin="50% 50%"
          // A non-last floor's "exit" is a pause, not a completion — its ward-path shortcut
          // (once its key is held) is the real way onward; only the true last floor's exit
          // finishes the site. Leaving here must not touch levelNr/trigger the hieroglyph
          // minigame the way onSiteComplete does — onCancel already does exactly that.
          onComplete={currentFloor === siteConfig.length - 1 ? onSiteComplete : onCancel}
        />
      )}
      {useRenderPuzzleFallback &&
        activeEncounter &&
        renderPuzzle!(currentFloor, () => genericHandleSolved(activeEncounter.pos), handleEncounterCancel)}
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
      <RewardFlow
        pendingReward={pendingReward}
        hieroglyphProgress={progression.hieroglyphProgress}
        onDismiss={() => setPendingReward(null)}
      />
    </div>
  )
}
