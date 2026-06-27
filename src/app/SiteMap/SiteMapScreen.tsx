import { useCallback, useMemo, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { assembleFloor } from "@/game/siteAssembler"
import { completeCell, findPath, getCell } from "@/game/gridNavigation"
import { generateSumplete } from "@/game/generateSumplete"
import { hashString } from "@/support/hashString"
import type { FloorGrid, SiteConfig, TreasureReward } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"
import { SumpleteBoard } from "@/app/PuzzleFamilies/Sumplete/SumpleteBoard"
import { useJourneys } from "@/app/state/useJourneys"
import { useProgression } from "@/app/state/useProgression"
import { Chest } from "@/ui/Chest"
import { LootPopup } from "@/ui/LootPopup"

type Props = {
  journeyId: string
  siteConfig: SiteConfig
  seed: number
  onSiteComplete: () => void
  onCancel: () => void
  /** Called when a puzzle room is tapped on a non-sumplete floor. Return null to use default SumpleteBoard. */
  renderPuzzle?: (floor: number, onSolved: () => void, onCancel: () => void) => ReactNode
}

const rewardEmoji = (type: string) => {
  if (type === "mapPiece") return "🗺"
  if (type === "hieroglyphFragment") return "𓂀"
  if (type === "tombKey") return "🗝"
  if (type === "hieroglyphs") return "📜"
  return "🔷"
}

// Edge IDs are "floorIdx:row,col". Backward compat: no colon prefix = floor 0.
const encodeEdge = (floor: number, row: number, col: number): string => `${floor}:${row},${col}`
const decodeEdge = (edgeId: string): [floor: number, row: number, col: number] => {
  if (edgeId.includes(":")) {
    const [f, pos] = edgeId.split(":")
    const [r, c] = pos.split(",").map(Number)
    return [Number(f), r, c]
  }
  const [r, c] = edgeId.split(",").map(Number)
  return [0, r, c]
}

const applyEdges = (grid: FloorGrid, floor: number, allEdges: string[], wardKeys?: ReadonlySet<string>): FloorGrid =>
  allEdges
    .filter(e => decodeEdge(e)[0] === floor)
    .reduce((g, edgeId) => {
      const [, r, c] = decodeEdge(edgeId)
      return completeCell(g, r, c, wardKeys)
    }, grid)

export const SiteMapScreen = ({ journeyId, siteConfig, seed, onSiteComplete, onCancel, renderPuzzle }: Props) => {
  const { t } = useTranslation("common")
  const journeys = useJourneys()
  const progression = useProgression()
  const allEdges = journeys.getSolvedEdges(journeyId)
  const journeyState = journeys.getJourney(journeyId)
  const wardKeys = progression.tombKeyIds

  const [currentFloor, setCurrentFloor] = useState(0)
  const floorConfig = siteConfig[Math.min(currentFloor, siteConfig.length - 1)]

  // ponytail: assemble once per floor+seed; edges reconstruct completed state
  const baseGrid = useMemo(() => {
    const result = assembleFloor(journeyId, floorConfig, seed + currentFloor)
    return result.success ? result.grid : null
  }, [journeyId, floorConfig, seed, currentFloor])

  // Always treat the entrance as completed so its corridor is visible from the start
  const effectiveEdges = useMemo(() => {
    if (!baseGrid) return allEdges
    const entranceEdge = encodeEdge(currentFloor, baseGrid.entrancePos[0], baseGrid.entrancePos[1])
    return allEdges.includes(entranceEdge) ? allEdges : [...allEdges, entranceEdge]
  }, [baseGrid, allEdges, currentFloor])

  const grid = useMemo(
    () => (baseGrid ? applyEdges(baseGrid, currentFloor, effectiveEdges, wardKeys) : null),
    [baseGrid, currentFloor, effectiveEdges, wardKeys]
  )

  const explorerPos: readonly [number, number] = useMemo(() => {
    if (!grid) return [0, 0]
    const pos = journeyState?.position
    if (!pos) return grid.entrancePos
    const [posFloor, r, c] = decodeEdge(pos)
    return posFloor === currentFloor ? [r, c] : grid.entrancePos
  }, [grid, journeyState?.position, currentFloor])

  // active puzzle: [row, col] or null
  const [activePuzzlePos, setActivePuzzlePos] = useState<readonly [number, number] | null>(null)
  const [puzzleSolved, setPuzzleSolved] = useState(false)
  const puzzleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // chest → loot popup flow
  const [pendingReward, setPendingReward] = useState<{ reward: TreasureReward; onCollect: () => void } | null>(null)
  const [chestOpened, setChestOpened] = useState(false)
  const [showLoot, setShowLoot] = useState(false)

  const useCustomPuzzle = floorConfig.puzzleFamily === "tableau" && renderPuzzle != null

  const activePuzzle = useMemo(() => {
    if (!activePuzzlePos || useCustomPuzzle) return null
    const edgeId = encodeEdge(currentFloor, activePuzzlePos[0], activePuzzlePos[1])
    // ponytail: fixed 3×3 sumplete for all puzzle rooms; difficulty scaling in Phase 6
    return generateSumplete(3, hashString(journeyId + edgeId))
  }, [activePuzzlePos, journeyId, currentFloor, useCustomPuzzle])

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!grid) return
      const cell = getCell(grid, row, col)
      if (!cell || cell.type !== "room") return
      if (cell.state !== "reachable") return

      const edgeId = encodeEdge(currentFloor, row, col)

      if (cell.roomType === "entrance") {
        // Phase 4 adds the entrance seal; for now just complete it
        journeys.markEdgeSolved(edgeId)
        journeys.updatePosition(journeyId, edgeId)
      } else if (cell.roomType === "puzzle") {
        // Move dot first, show puzzle when it arrives
        journeys.updatePosition(journeyId, edgeId)
        const path = findPath(grid, explorerPos, [row, col])
        const delay = Math.max(0, path.length - 1) * 120
        if (puzzleTimerRef.current) clearTimeout(puzzleTimerRef.current)
        puzzleTimerRef.current = setTimeout(() => setActivePuzzlePos([row, col]), delay)
      } else if (cell.roomType === "fork") {
        // Fork is a free branch point — completing it reveals adjacent branches
        journeys.markEdgeSolved(edgeId)
        journeys.updatePosition(journeyId, edgeId)
      } else if (cell.roomType === "stairhead") {
        // Descend to next floor
        journeys.markEdgeSolved(edgeId)
        journeys.updatePosition(journeyId, edgeId)
        setCurrentFloor(f => f + 1)
      } else if (cell.roomType === "exit") {
        onSiteComplete()
      } else if (cell.roomType === "treasure") {
        journeys.markEdgeSolved(edgeId)
        journeys.updatePosition(journeyId, edgeId)
        const reward = cell.reward
        if (reward) {
          setChestOpened(false)
          setPendingReward({
            reward,
            onCollect: () => {
              if (reward.type === "hieroglyphFragment") progression.addFragment(reward.hieroglyphId)
              else if (reward.type === "mapPiece") progression.collectMapPiece(reward.tombId)
              else if (reward.type === "tombKey") progression.addTombKey(reward.keyId)
              else if (reward.type === "mosaicPiece") progression.collectMosaicPiece()
            },
          })
        }
      }
    },
    [grid, journeys, journeyId, onSiteComplete, currentFloor, progression, explorerPos]
  )

  const handlePuzzleSolved = useCallback(() => {
    if (!activePuzzlePos) return
    const edgeId = encodeEdge(currentFloor, activePuzzlePos[0], activePuzzlePos[1])
    journeys.markEdgeSolved(edgeId)
    setActivePuzzlePos(null)
    setPuzzleSolved(false)
  }, [activePuzzlePos, journeys, currentFloor])

  const handlePuzzleComplete = useCallback(() => {
    setPuzzleSolved(true)
    setTimeout(handlePuzzleSolved, 1500)
  }, [handlePuzzleSolved])

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
      <div className="relative">
        <SiteMapView grid={grid} onCellClick={handleCellClick} explorerPos={explorerPos} />
      </div>
      {activePuzzlePos &&
        useCustomPuzzle &&
        renderPuzzle(currentFloor, handlePuzzleSolved, () => setActivePuzzlePos(null))}
      {activePuzzle && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="relative flex flex-col items-center gap-4 rounded-lg border border-amber-900 bg-stone-900 p-4">
            <SumpleteBoard
              grid={activePuzzle.grid}
              rowTargets={activePuzzle.rowTargets}
              colTargets={activePuzzle.colTargets}
              onSolved={handlePuzzleComplete}
            />
            {!puzzleSolved && (
              <button onClick={() => setActivePuzzlePos(null)} className="text-sm text-stone-400 hover:text-stone-200">
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

      {/* Step 1: Chest overlay — tap to open */}
      {pendingReward && !showLoot && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/85">
          <Chest
            state={chestOpened ? "open" : "empty"}
            allowInteraction={!chestOpened}
            onClick={() => {
              if (!chestOpened) {
                setChestOpened(true)
                pendingReward.onCollect()
                setTimeout(() => setShowLoot(true), 600)
              }
            }}
          />
          {!chestOpened && <p className="mt-6 animate-pulse text-sm text-amber-300">{t("chest.tapToOpen")}</p>}
        </div>
      )}

      {/* Step 2: LootPopup — shows reward after chest opens */}
      {pendingReward && (
        <LootPopup
          isOpen={showLoot}
          itemName={t(`chest.${pendingReward.reward.type}`)}
          itemComponent={<span className="text-6xl">{rewardEmoji(pendingReward.reward.type)}</span>}
          onDismiss={() => {
            setShowLoot(false)
            setPendingReward(null)
            setChestOpened(false)
          }}
        />
      )}
    </div>
  )
}
