import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { findPath, getCell } from "@/game/gridNavigation"
import { getPuzzlePlugin } from "@/game/puzzleRegistry"
import { hashString } from "@/support/hashString"
import { useTimeout } from "@/support/useTimeout"
import type { SiteConfig, TreasureReward } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { SiteMapView } from "./SiteMapView"
import { useAssembledFloor, encodeEdge, decodeEdge } from "./useAssembledFloor"
import { ChestRewardFlow } from "./ChestRewardFlow"
import { TrapEncounter } from "@/app/TrapFamilies/TrapEncounter"
import { TrapWarningScreen } from "./TrapWarningScreen"
import { useJourneys } from "@/app/state/useJourneys"
import { useProgression } from "@/app/state/useProgression"
import { useDetector } from "@/app/state/useDetector"
import { EntranceTransitionOverlay } from "@/ui/atoms/EntranceTransitionOverlay"
import { HealthDisplay } from "@/ui/atoms/HealthDisplay"
import { ConsumableBar } from "@/ui/atoms/ConsumableBar"
import { DetectorPanel } from "@/ui/atoms/DetectorPanel"
import { BackButton } from "@/ui/atoms/BackButton"
import { FloorBadge } from "@/ui/atoms/FloorBadge"
import { SiteHudBar } from "@/ui/atoms/SiteHudBar"
// Side-effect: registers puzzle plugins
import "@/app/PuzzleFamilies/Sumplete/plugin"
import "@/app/PuzzleFamilies/Tableau/plugin"
import "@/app/PuzzleFamilies/Crocodile/plugin"

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
  const { t } = useTranslation("common")
  const journeys = useJourneys()
  const progression = useProgression()
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
    wardKeys,
    journeyState?.position,
    progression.perks.detectionLevel
  )
  const pendingConsumableCells = useMemo(() => {
    const prefix = `${currentFloor}:`
    const result = new Set<string>()
    for (const edgeId of journeys.getSkippedConsumables(journeyId)) {
      if (edgeId.startsWith(prefix)) result.add(edgeId.slice(prefix.length))
    }
    return result
  }, [journeys, journeyId, currentFloor])

  const [activePuzzlePos, setActivePuzzlePos] = useState<readonly [number, number] | null>(null)
  const [trapWarningPos, setTrapWarningPos] = useState<readonly [number, number] | null>(null)
  const [activeTrapPos, setActiveTrapPos] = useState<readonly [number, number] | null>(null)
  const [puzzleSolved, setPuzzleSolved] = useState(false)
  const [pendingReward, setPendingReward] = useState<{
    reward: TreasureReward
    consumableFull?: boolean
    onCollect: () => void
  } | null>(null)
  const [exiting, setExiting] = useState(false)

  const [scheduleArrival] = useTimeout()
  const [schedulePuzzle, cancelPuzzle] = useTimeout()

  const puzzlePlugin = useMemo(() => {
    if (!activePuzzlePos || !grid) return null
    const cell = getCell(grid, activePuzzlePos[0], activePuzzlePos[1])
    const family = cell?.type === "room" ? (cell.family ?? "sumplete") : "sumplete"
    return getPuzzlePlugin(family) ?? null
  }, [activePuzzlePos, grid])

  const useRenderPuzzleFallback = activePuzzlePos != null && puzzlePlugin == null && renderPuzzle != null

  const activePuzzle = useMemo(() => {
    if (!activePuzzlePos || !puzzlePlugin) return null
    const edgeId = encodeEdge(currentFloor, activePuzzlePos[0], activePuzzlePos[1])
    return puzzlePlugin.generate(hashString(journeyId + edgeId), { difficulty: floorConfig.difficulty })
  }, [activePuzzlePos, puzzlePlugin, journeyId, currentFloor, floorConfig.difficulty])

  const handlePuzzleSolved = useCallback(() => {
    if (!activePuzzlePos || !grid) return
    const [row, col] = activePuzzlePos
    const edgeId = encodeEdge(currentFloor, row, col)
    const cell = getCell(grid, row, col)
    const sectionHash = cell && cell.type !== "empty" ? (cell.sectionHash ?? "") : ""
    journeys.markCellExplored(sectionHash, edgeId)
    setActivePuzzlePos(null)
    setPuzzleSolved(false)
  }, [activePuzzlePos, grid, journeys, currentFloor])

  const handlePuzzleComplete = useCallback(() => {
    schedulePuzzle(800, () => {
      setPuzzleSolved(true)
      schedulePuzzle(1500, handlePuzzleSolved)
    })
  }, [handlePuzzleSolved, schedulePuzzle])

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!grid) return
      const cell = getCell(grid, row, col)
      if (!cell || cell.type === "empty") return
      if (cell.state !== "reachable" && cell.state !== "completed") return

      const edgeId = encodeEdge(currentFloor, row, col)
      const sectionHash = cell.sectionHash ?? ""

      // Completed cells: just reposition the player, unless it's a chest we couldn't fit before —
      // offer it again, showing whether there's room for it now or still not.
      if (cell.state === "completed") {
        journeys.updatePosition(journeyId, edgeId)
        if (
          cell.type === "room" &&
          cell.roomType === "treasure" &&
          cell.reward?.type === "consumable" &&
          journeys.getSkippedConsumables(journeyId).has(edgeId)
        ) {
          const reward = cell.reward
          scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () => {
            const stillFull =
              progression.consumables.bandage + progression.consumables.oil + progression.consumables.trapTool >=
              progression.consumableCarryCap
            if (stillFull) {
              setPendingReward({ reward, consumableFull: true, onCollect: () => {} })
              return
            }
            setPendingReward({
              reward,
              onCollect: () => {
                progression.addConsumable(reward.consumable)
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

      if (cell.roomType === "entrance") {
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
      } else if (cell.roomType === "trap") {
        journeys.updatePosition(journeyId, edgeId)
        scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
          setTrapWarningPos([row, col])
        )
      } else if (cell.roomType === "puzzle") {
        journeys.updatePosition(journeyId, edgeId)
        scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
          setActivePuzzlePos([row, col])
        )
      } else if (cell.roomType === "fork") {
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
      } else if (cell.roomType === "stairhead") {
        journeys.markCellExplored(sectionHash, edgeId)
        if (cell.stairId) {
          // Find the peer stairhead across floors and teleport there
          const stairId = cell.stairId
          for (let fi = 0; fi < siteConfig.length; fi++) {
            if (fi === currentFloor) continue
            const result = assembleFloor(journeyId, siteConfig[fi], seed + fi)
            if (!result.success) continue
            const peerPos = result.grid.staircases[stairId]
            if (peerPos) {
              journeys.updatePosition(journeyId, encodeEdge(fi, peerPos[0], peerPos[1]))
              setCurrentFloor(fi)
              break
            }
          }
        } else {
          journeys.updatePosition(journeyId, edgeId)
          setCurrentFloor(f => f + 1)
        }
      } else if (cell.roomType === "exit") {
        journeys.updatePosition(journeyId, edgeId)
        scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
          setExiting(true)
        )
      } else if (cell.roomType === "treasure") {
        // Always mark the room explored so corridors past it keep unfolding, even if a consumable
        // reward inside can't be picked up right now — that's tracked separately below.
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
        if (cell.reward) {
          const reward = cell.reward
          // Inventory-as-truth: fragment already collected → skip overlay
          const alreadyCollected =
            reward.type === "hieroglyphFragment" && progression.hasFragment(reward.hieroglyphId, reward.pieceIndex)
          if (!alreadyCollected) {
            // Consumables need a room check up front: a full pack leaves the reward for a later visit
            // instead of silently losing it.
            const packFull =
              reward.type === "consumable" &&
              progression.consumables.bandage + progression.consumables.oil + progression.consumables.trapTool >=
                progression.consumableCarryCap
            scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () => {
              if (packFull) {
                journeys.markConsumableSkipped(edgeId)
                setPendingReward({ reward, consumableFull: true, onCollect: () => {} })
                return
              }
              setPendingReward({
                reward,
                onCollect: () => {
                  if (reward.type === "hieroglyphFragment")
                    progression.addFragment(reward.hieroglyphId, reward.pieceIndex)
                  else if (reward.type === "mapPiece") progression.collectMapPiece(reward.tombId)
                  else if (reward.type === "tombKey") {
                    progression.addTombKey(reward.keyId)
                    progression.applyTreasurePerk(reward.keyId)
                  } else if (reward.type === "mosaicPiece") progression.collectMosaicPiece()
                  else if (reward.type === "consumable") progression.addConsumable(reward.consumable)
                },
              })
            })
          }
        }
      }
    },
    [grid, journeys, journeyId, currentFloor, progression, explorerPos, scheduleArrival, seed, siteConfig]
  )

  const ActivePuzzleComponent = puzzlePlugin?.Component ?? null

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
          <HealthDisplay currentHealth={progression.currentHealth} maxHealth={progression.maxHealth} />
          <ConsumableBar consumables={progression.consumables} />
        </div>
      </SiteHudBar>
      {exiting && <EntranceTransitionOverlay origin="50% 50%" onComplete={onSiteComplete} />}
      {useRenderPuzzleFallback && renderPuzzle!(currentFloor, handlePuzzleSolved, () => setActivePuzzlePos(null))}
      {!!activePuzzle && ActivePuzzleComponent && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="relative flex flex-col items-center gap-4 rounded-lg border border-amber-900 bg-stone-900 p-4">
            <ActivePuzzleComponent
              puzzle={activePuzzle}
              settings={{ difficulty: floorConfig.difficulty }}
              onSolved={handlePuzzleComplete}
            />
            {!puzzleSolved && (
              <button
                onClick={() => {
                  cancelPuzzle()
                  setActivePuzzlePos(null)
                }}
                className="text-sm text-stone-400 hover:text-stone-200"
              >
                {t("ui.cancel")}
              </button>
            )}
            {puzzleSolved && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-stone-900/90">
                <p className="font-pyramid text-xl text-amber-300">{t("ui.puzzleCompleted")}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {trapWarningPos && (
        <TrapWarningScreen
          currentHealth={progression.currentHealth}
          maxHealth={progression.maxHealth}
          canAttempt={progression.canAttemptTrap()}
          trapToolCount={progression.consumables.trapTool}
          onAttempt={() => {
            setActiveTrapPos(trapWarningPos)
            setTrapWarningPos(null)
          }}
          onTurnAround={() => setTrapWarningPos(null)}
          onDisable={() => {
            const [tr, tc] = trapWarningPos
            const edgeId = encodeEdge(currentFloor, tr, tc)
            const trapCell = grid && getCell(grid, tr, tc)
            const trapSectionHash = trapCell && trapCell.type !== "empty" ? (trapCell.sectionHash ?? "") : ""
            progression.useConsumable("trapTool")
            journeys.markTrapDisabled(trapSectionHash, edgeId)
            setTrapWarningPos(null)
          }}
        />
      )}
      {activeTrapPos && (
        <TrapEncounter
          family="arithmetic-reflex"
          seed={hashString(journeyId + encodeEdge(currentFloor, activeTrapPos[0], activeTrapPos[1]))}
          difficulty={floorConfig.difficulty}
          trapInsightStacks={progression.perks.trapInsightStacks}
          onPass={() => {
            const [tr, tc] = activeTrapPos
            const edgeId = encodeEdge(currentFloor, tr, tc)
            const trapCell = grid && getCell(grid, tr, tc)
            const trapSectionHash = trapCell && trapCell.type !== "empty" ? (trapCell.sectionHash ?? "") : ""
            journeys.markCellExplored(trapSectionHash, edgeId)
            setActiveTrapPos(null)
          }}
          onFail={() => {
            progression.takeTrapDamage(progression.perks.armorStacks)
            setActiveTrapPos(null)
          }}
        />
      )}
      <ChestRewardFlow
        pendingReward={pendingReward}
        hieroglyphProgress={progression.hieroglyphProgress}
        onDismiss={() => setPendingReward(null)}
      />
    </div>
  )
}
