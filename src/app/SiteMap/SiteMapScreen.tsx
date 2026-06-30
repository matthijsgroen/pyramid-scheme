import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { findPath, getCell } from "@/game/gridNavigation"
import { getPuzzlePlugin } from "@/game/puzzleRegistry"
import { hashString } from "@/support/hashString"
import { useTimeout } from "@/support/useTimeout"
import type { SiteConfig, TreasureReward } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"
import { useAssembledFloor, encodeEdge } from "./useAssembledFloor"
import { ChestRewardFlow } from "./ChestRewardFlow"
import { useJourneys } from "@/app/state/useJourneys"
import { useProgression } from "@/app/state/useProgression"
import { EntranceTransitionOverlay } from "@/ui/EntranceTransitionOverlay"
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
  const allEdges = journeys.getSolvedEdges(journeyId)
  const journeyState = journeys.getJourney(journeyId)
  const wardKeys = progression.tombKeyIds

  const [currentFloor, setCurrentFloor] = useState(0)
  const floorConfig = siteConfig[Math.min(currentFloor, siteConfig.length - 1)]

  const { grid, explorerPos } = useAssembledFloor(
    journeyId,
    floorConfig,
    seed,
    currentFloor,
    allEdges,
    wardKeys,
    journeyState?.position
  )

  const [activePuzzlePos, setActivePuzzlePos] = useState<readonly [number, number] | null>(null)
  const [puzzleSolved, setPuzzleSolved] = useState(false)
  const [pendingReward, setPendingReward] = useState<{ reward: TreasureReward; onCollect: () => void } | null>(null)
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
    if (!activePuzzlePos) return
    const edgeId = encodeEdge(currentFloor, activePuzzlePos[0], activePuzzlePos[1])
    journeys.markEdgeSolved(edgeId)
    setActivePuzzlePos(null)
    setPuzzleSolved(false)
  }, [activePuzzlePos, journeys, currentFloor])

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
      if (!cell || cell.type === "empty" || cell.state !== "reachable") return

      const edgeId = encodeEdge(currentFloor, row, col)

      if (cell.type === "corridor") {
        journeys.markEdgeSolved(edgeId)
        journeys.updatePosition(journeyId, edgeId)
        return
      }

      if (cell.type !== "room") return

      if (cell.roomType === "entrance") {
        journeys.markEdgeSolved(edgeId)
        journeys.updatePosition(journeyId, edgeId)
      } else if (cell.roomType === "puzzle") {
        journeys.updatePosition(journeyId, edgeId)
        scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
          setActivePuzzlePos([row, col])
        )
      } else if (cell.roomType === "fork") {
        journeys.markEdgeSolved(edgeId)
        journeys.updatePosition(journeyId, edgeId)
      } else if (cell.roomType === "stairhead") {
        journeys.markEdgeSolved(edgeId)
        journeys.updatePosition(journeyId, edgeId)
        setCurrentFloor(f => f + 1)
      } else if (cell.roomType === "exit") {
        journeys.updatePosition(journeyId, edgeId)
        scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
          setExiting(true)
        )
      } else if (cell.roomType === "treasure") {
        journeys.markEdgeSolved(edgeId)
        journeys.updatePosition(journeyId, edgeId)
        if (cell.reward) {
          const reward = cell.reward
          scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () => {
            setPendingReward({
              reward,
              onCollect: () => {
                if (reward.type === "hieroglyphFragment") progression.addFragment(reward.hieroglyphId)
                else if (reward.type === "mapPiece") progression.collectMapPiece(reward.tombId)
                else if (reward.type === "tombKey") progression.addTombKey(reward.keyId)
                else if (reward.type === "mosaicPiece") progression.collectMosaicPiece()
              },
            })
          })
        }
      }
    },
    [grid, journeys, journeyId, currentFloor, progression, explorerPos, scheduleArrival]
  )

  const ActivePuzzleComponent = puzzlePlugin?.Component ?? null

  if (!grid) {
    return <div className="p-4 text-red-400">Site layout unavailable.</div>
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center">
      <button
        onClick={onCancel}
        className="absolute top-2 left-2 z-10 rounded bg-stone-800 px-3 py-1 text-sm text-amber-200"
      >
        ← Back
      </button>
      {currentFloor > 0 && (
        <div className="absolute top-2 right-2 z-10 rounded bg-stone-800 px-3 py-1 text-sm text-amber-200">
          Floor {currentFloor + 1}
        </div>
      )}
      <div className="relative h-screen w-screen">
        <SiteMapView grid={grid} onCellClick={handleCellClick} explorerPos={explorerPos} className="h-full w-full" />
      </div>
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
      <ChestRewardFlow
        pendingReward={pendingReward}
        hieroglyphProgress={progression.hieroglyphProgress}
        onDismiss={() => setPendingReward(null)}
      />
    </div>
  )
}
