import { useCallback, useMemo, useState } from "react"
import { assembleFloor } from "@/game/siteAssembler"
import { completeCell, getCell } from "@/game/gridNavigation"
import { generateSumplete } from "@/game/generateSumplete"
import { hashString } from "@/support/hashString"
import type { FloorGrid, SiteConfig } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"
import { ExplorerDot } from "./ExplorerDot"
import { SumpleteBoard } from "@/app/PuzzleFamilies/Sumplete/SumpleteBoard"
import { useJourneys } from "@/app/state/useJourneys"
import { useProgression } from "@/app/state/useProgression"

type Props = {
  journeyId: string
  siteConfig: SiteConfig
  seed: number
  onSiteComplete: () => void
  onCancel: () => void
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

export const SiteMapScreen = ({ journeyId, siteConfig, seed, onSiteComplete, onCancel }: Props) => {
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

  const grid = useMemo(
    () => (baseGrid ? applyEdges(baseGrid, currentFloor, allEdges, wardKeys) : null),
    [baseGrid, currentFloor, allEdges, wardKeys]
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

  const activePuzzle = useMemo(() => {
    if (!activePuzzlePos) return null
    const edgeId = encodeEdge(currentFloor, activePuzzlePos[0], activePuzzlePos[1])
    // ponytail: fixed 3×3 sumplete for all puzzle rooms; difficulty scaling in Phase 6
    return generateSumplete(3, hashString(journeyId + edgeId))
  }, [activePuzzlePos, journeyId, currentFloor])

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
        setActivePuzzlePos([row, col])
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
        if (cell.reward?.type === "hieroglyphFragment") {
          progression.addFragment(cell.reward.hieroglyphId)
        } else if (cell.reward?.type === "mosaicPiece") {
          progression.collectMosaicPiece(journeyId)
        } else if (cell.reward?.type === "mapPiece") {
          progression.collectMapPiece(cell.reward.tombId)
        } else if (cell.reward?.type === "tombKey") {
          progression.addTombKey(cell.reward.keyId)
        }
      }
    },
    [grid, journeys, journeyId, onSiteComplete, currentFloor, progression]
  )

  const handlePuzzleSolved = useCallback(() => {
    if (!activePuzzlePos) return
    const edgeId = encodeEdge(currentFloor, activePuzzlePos[0], activePuzzlePos[1])
    journeys.markEdgeSolved(edgeId)
    journeys.updatePosition(journeyId, edgeId)
    setActivePuzzlePos(null)
  }, [activePuzzlePos, journeys, journeyId, currentFloor])

  if (!grid) {
    return <div className="p-4 text-red-400">Site layout unavailable.</div>
  }

  return (
    <div className="relative flex flex-col items-center">
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
        <ExplorerDot grid={grid} pos={explorerPos} />
      </div>
      {activePuzzle && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-amber-900 bg-stone-900 p-4">
            <SumpleteBoard
              grid={activePuzzle.grid}
              rowTargets={activePuzzle.rowTargets}
              colTargets={activePuzzle.colTargets}
              onSolved={handlePuzzleSolved}
            />
            <button onClick={() => setActivePuzzlePos(null)} className="text-sm text-stone-400 hover:text-stone-200">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
